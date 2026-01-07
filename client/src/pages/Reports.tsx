import { useEffect, useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
// xlsx will be imported dynamically to avoid Vite optimization issues
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { loadTurkishFont } from '../utils/pdfFontLoader';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import maintenanceService from '../services/maintenanceService';
import machineService from '../services/machineService';
import type { MaintenanceLog, Machine } from '../types';
import toast from 'react-hot-toast';

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
};

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Date range state - Default: Last 7 days
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    fetchData();
  }, [user?.factoryId, dateRange]);

  const fetchData = async () => {
    if (!user?.factoryId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [logsData, machinesData] = await Promise.all([
        maintenanceService.getAllByTenant(user.factoryId),
        machineService.getAllByTenant(user.factoryId),
      ]);

      // Filter logs by date range
      const filteredLogs = logsData.filter((log) => {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0];
        return logDate >= dateRange.start && logDate <= dateRange.end;
      });

      setLogs(filteredLogs);
      setMachines(machinesData);
    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalFaults = logs.length;
    const resolved = logs.filter((l) => l.status === 'resolved' || l.status === 'closed').length;
    const pending = logs.filter((l) => l.status === 'pending' || l.status === 'in_progress').length;

    // Find machine with most faults
    const machineFaultCounts: Record<string, number> = {};
    logs.forEach((log) => {
      const machineId = log.machineId;
      machineFaultCounts[machineId] = (machineFaultCounts[machineId] || 0) + 1;
    });

    const mostProblematicMachineId = Object.keys(machineFaultCounts).reduce((a, b) =>
      machineFaultCounts[a] > machineFaultCounts[b] ? a : b,
      ''
    );

    const mostProblematicMachine = machines.find((m) => m.id === mostProblematicMachineId);

    return {
      totalFaults,
      resolved,
      pending,
      mostProblematicMachine: mostProblematicMachine?.name || 'Yok',
    };
  }, [logs, machines]);

  // Chart Data - Time Series
  const timeSeriesData = useMemo(() => {
    const dateMap: Record<string, number> = {};
    
    logs.forEach((log) => {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dateMap).sort();
    return sortedDates.map((date) => ({
      date: new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
      count: dateMap[date],
    }));
  }, [logs]);

  // Chart Data - Machine Distribution
  const machineDistributionData = useMemo(() => {
    const machineMap: Record<string, number> = {};
    
    logs.forEach((log) => {
      const machine = machines.find((m) => m.id === log.machineId);
      const machineName = machine?.name || 'Bilinmeyen';
      machineMap[machineName] = (machineMap[machineName] || 0) + 1;
    });

    return Object.entries(machineMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs, machines]);

  // Chart Data - Priority Distribution
  const priorityDistributionData = useMemo(() => {
    const priorityMap: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    logs.forEach((log) => {
      const priority = log.priority || 'medium';
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;
    });

    return Object.entries(priorityMap)
      .filter(([_, count]) => count > 0)
      .map(([priority, count]) => ({
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: count,
        color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || COLORS.info,
      }));
  }, [logs]);

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      // Use ExcelJS for better styling support
      // ExcelJS uses CommonJS exports, so we need special handling for Vite
      const exceljsModule = await import('exceljs');
      
      // ExcelJS exports Workbook as a named export
      // The module structure can vary, so we check multiple possibilities
      const Workbook = 
        exceljsModule.Workbook || 
        (exceljsModule as any).default?.Workbook ||
        (exceljsModule as any).Workbook ||
        exceljsModule.default;
      
      if (!Workbook) {
        console.error('ExcelJS module structure:', {
          keys: Object.keys(exceljsModule),
          default: exceljsModule.default,
          hasWorkbook: 'Workbook' in exceljsModule,
        });
        throw new Error('ExcelJS Workbook bulunamadı. Lütfen sayfayı yenileyin.');
      }
      
      // Create workbook instance
      const workbook = typeof Workbook === 'function' 
        ? new Workbook() 
        : new (Workbook as any)();
      const worksheet = workbook.addWorksheet('Bakım Raporu');

      // Set column widths
      worksheet.columns = [
        { width: 25 }, // Makine Adı
        { width: 30 }, // Arıza Başlığı
        { width: 40 }, // Açıklama
        { width: 12 }, // Durum
        { width: 12 }, // Öncelik
        { width: 12 }, // Tarih
        { width: 20 }, // Bildiren
      ];

      // Title row with background color
      const titleRow = worksheet.addRow(['MaintFlow - Bakım Raporu']);
      titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; // White text
      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }, // Brand blue background
      };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(1, 1, 1, 7);
      titleRow.height = 30;

      // Date range row
      const dateText = `Tarih Aralığı: ${new Date(dateRange.start).toLocaleDateString('tr-TR')} - ${new Date(dateRange.end).toLocaleDateString('tr-TR')}`;
      const dateRow = worksheet.addRow([dateText]);
      worksheet.mergeCells(2, 1, 2, 7);
      dateRow.height = 20;

      // Empty row
      worksheet.addRow([]);

      // Header row
      const headers = ['Makine Adı', 'Arıza Başlığı', 'Açıklama', 'Durum', 'Öncelik', 'Tarih', 'Bildiren'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FF000000' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFADD8E6' }, // Light blue
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;

      // Data rows
      logs.forEach((log) => {
        const machine = machines.find((m) => m.id === log.machineId);
        const row = worksheet.addRow([
          machine?.name || 'Bilinmeyen',
          log.title || log.description?.substring(0, 50) || 'Başlıksız',
          log.description || '',
          log.status === 'pending' ? 'Bekliyor' : 
          log.status === 'in_progress' ? 'İşlemde' : 
          log.status === 'resolved' ? 'Çözüldü' : 'Kapalı',
          log.priority === 'critical' ? 'Acil' :
          log.priority === 'high' ? 'Yüksek' :
          log.priority === 'medium' ? 'Orta' : 'Düşük',
          new Date(log.createdAt).toLocaleDateString('tr-TR'),
          log.reportedBy || 'Anonim',
        ]);
        
        // Enable text wrap for all cells
        row.eachCell((cell) => {
          cell.alignment = { 
            horizontal: 'left', 
            vertical: 'top',
            wrapText: true,
          };
        });
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bakim_Raporu_${dateRange.start}_${dateRange.end}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Excel raporu başarıyla indirildi!');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Excel raporu oluşturulurken bir hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      
      // Load Turkish font (or use 'times' as fallback)
      const turkishFont = loadTurkishFont(doc);
      
      // Title - Use Turkish font for better character support
      doc.setFont(turkishFont, 'normal');
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Brand blue
      doc.text('MaintFlow - Bakım Raporu', 14, 20);

      // Date Range
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const dateRangeText = `Tarih Aralığı: ${new Date(dateRange.start).toLocaleDateString('tr-TR')} - ${new Date(dateRange.end).toLocaleDateString('tr-TR')}`;
      doc.text(dateRangeText, 14, 30);

      // Summary Stats
      doc.setFontSize(14);
      doc.text('Özet İstatistikler', 14, 45);
      doc.setFontSize(11);
      doc.text(`Toplam Arıza: ${kpis.totalFaults}`, 14, 55);
      doc.text(`Tamamlanan: ${kpis.resolved}`, 14, 62);
      doc.text(`Bekleyen: ${kpis.pending}`, 14, 69);
      doc.text(`En Sorunlu Makine: ${kpis.mostProblematicMachine}`, 14, 76);

      // Table Data
      const tableData = logs.map((log) => {
        const machine = machines.find((m) => m.id === log.machineId);
        const statusText = log.status === 'pending' ? 'Bekliyor' : 
                          log.status === 'in_progress' ? 'İşlemde' : 
                          log.status === 'resolved' ? 'Çözüldü' : 'Kapalı';
        
        return [
          machine?.name || 'Bilinmeyen',
          log.title || log.description?.substring(0, 40) || 'Başlıksız',
          statusText,
          new Date(log.createdAt).toLocaleDateString('tr-TR'),
        ];
      });

      let finalY = 85;
      autoTable(doc, {
        head: [['Makine', 'Sorun', 'Durum', 'Tarih']],
        body: tableData,
        startY: 85,
        styles: { 
          fontSize: 9,
          font: turkishFont, // Use Turkish font for character support
          fontStyle: 'normal',
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          font: turkishFont,
        },
        bodyStyles: {
          textColor: [0, 0, 0],
          halign: 'left',
          font: turkishFont,
        },
        columnStyles: {
          0: { cellWidth: 50 }, // Makine
          1: { cellWidth: 60 }, // Sorun
          2: { cellWidth: 30 }, // Durum
          3: { cellWidth: 30 }, // Tarih
        },
        didDrawPage: (data) => {
          // Store final Y position after table
          finalY = data.cursor?.y || finalY;
        },
      });

      // Add charts after table
      let currentY = finalY + 20;
      
      // Capture all charts
      const chartElements = [
        { id: 'chart-time-series', title: 'Zaman İçindeki Arıza Trendi', width: 180 },
        { id: 'chart-machine-distribution', title: 'Makine Bazlı Arıza Dağılımı', width: 120 }, // Smaller width for machine chart
        { id: 'chart-priority-distribution', title: 'Öncelik Dağılımı', width: 180 },
      ];

      try {
        // Capture all charts in parallel
        const chartPromises = chartElements.map(({ id }) => {
          const element = document.getElementById(id);
          if (element) {
            return html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 2,
              logging: false,
            }).then((canvas) => ({ id, canvas }));
          }
          return Promise.resolve(null);
        });

        Promise.all(chartPromises).then((chartResults) => {
          // Add charts to PDF
          chartResults.forEach((result, index) => {
            if (result && result.canvas) {
              const { title, width } = chartElements[index];
              
              // Check if we need a new page
              if (currentY > 250) {
                doc.addPage();
                currentY = 20;
              }
              
              // Add chart title
              doc.setFontSize(14);
              doc.setFont(turkishFont, 'bold');
              doc.text(title, 14, currentY);
              currentY += 10;
              
              // Add chart image with custom width
              const imgData = result.canvas.toDataURL('image/png');
              const imgWidth = width; // Custom width per chart
              const imgHeight = (result.canvas.height * imgWidth) / result.canvas.width;
              
              if (currentY + imgHeight > 280) {
                doc.addPage();
                currentY = 20;
              }
              
              doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
              currentY += imgHeight + 15;
            }
          });
          
          // Save PDF after all charts are added
          const fileName = `Bakim_Raporu_${dateRange.start}_${dateRange.end}.pdf`;
          doc.save(fileName);
          toast.success('PDF raporu başarıyla indirildi!');
        }).catch((chartError) => {
          console.warn('Chart export error:', chartError);
          // Save PDF even if charts fail
          const fileName = `Bakim_Raporu_${dateRange.start}_${dateRange.end}.pdf`;
          doc.save(fileName);
          toast.success('PDF raporu indirildi (grafikler eklenemedi).');
        });
      } catch (chartError) {
        console.warn('Chart export error:', chartError);
        // Save PDF even if charts fail
        const fileName = `Bakim_Raporu_${dateRange.start}_${dateRange.end}.pdf`;
        doc.save(fileName);
        toast.success('PDF raporu indirildi (grafikler eklenemedi).');
      }

      toast.success('PDF raporu başarıyla indirildi!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('PDF raporu oluşturulurken bir hata oluştu.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Raporlar & Analizler
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Detaylı bakım ve arıza analizleri
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <span className="text-gray-500 dark:text-gray-400">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="hidden sm:inline">Excel İndir</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <FileText className="h-5 w-5" />
              <span className="hidden sm:inline">PDF Raporu</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Arıza</p>
            <AlertCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.totalFaults}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tamamlanan</p>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.resolved}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bekleyen</p>
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.pending}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Sorunlu Makine</p>
            <TrendingUp className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {kpis.mostProblematicMachine}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Series Chart - Wide */}
        <div id="chart-time-series" className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Zaman İçindeki Arıza Trendi
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                className="text-gray-600 dark:text-gray-400"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                className="text-gray-600 dark:text-gray-400"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg, #1f2937)',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={COLORS.primary}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Machine Distribution Chart - Narrow */}
        <div id="chart-machine-distribution" className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Makine Bazlı Arıza Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={machineDistributionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                type="number" 
                className="text-gray-600 dark:text-gray-400"
                style={{ fontSize: '12px' }} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-gray-600 dark:text-gray-400"
                style={{ fontSize: '12px' }}
                width={100}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg, #1f2937)',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Distribution Chart */}
      <div id="chart-priority-distribution" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Öncelik Dağılımı
        </h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

