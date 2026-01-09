import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Calendar, User, Package, AlertCircle, Search, Filter, X, CheckCircle, Trash2, ClipboardList, Activity, Clock } from 'lucide-react';
import maintenanceService from '../services/maintenanceService';
import machineService from '../services/machineService';
import type { MaintenanceLog, Machine } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import StatCard from '../components/common/StatCard';
import PermissionGuard from '../components/auth/PermissionGuard';
import { formatDate, getPriorityColor } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useProductTour } from '../hooks/useProductTour';
import toast from 'react-hot-toast';

export default function Maintenance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resumeTour } = useProductTour();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');

  useEffect(() => {
    if (user?.factoryId) {
      fetchData();
    }
  }, [user?.factoryId]);

  // Resume tour from localStorage (multi-page persistence)
  useEffect(() => {
    if (!loading && logs.length >= 0) {
      // Sayfa yüklendiğinde ve veriler hazır olduğunda turu resume et
      resumeTour();
    }
  }, [loading, logs.length, resumeTour]);

  const fetchData = async () => {
    if (!user?.factoryId) {
      console.warn('⚠️ No factoryId found for user');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching maintenance data for factory:', user.factoryId);
      
      // Fetch logs and machines in parallel
      const [logsData, machinesData] = await Promise.all([
        maintenanceService.getAllByTenant(user.factoryId),
        machineService.getAllByTenant(user.factoryId),
      ]);
      
      console.log('✅ Maintenance data fetched:', { logs: logsData.length, machines: machinesData.length });
      setLogs(logsData);
      setMachines(machinesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on all criteria
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.machineName.toLowerCase().includes(searchQuery.toLowerCase());

      // Date range filter
      const logDate = new Date(log.createdAt);
      let matchesDate = true;
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && logDate >= start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && logDate <= end;
      }

      // Status filter
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || log.priority === priorityFilter;

      // Machine filter
      const matchesMachine = machineFilter === 'all' || log.machineId.toString() === machineFilter;

      return matchesSearch && matchesDate && matchesStatus && matchesPriority && matchesMachine;
    });
  }, [logs, searchQuery, startDate, endDate, statusFilter, priorityFilter, machineFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setMachineFilter('all');
  };

  const handleResolveLog = async (logId: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/maintenance_logs?id=eq.${logId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            status: 'resolved',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Durum güncellenemedi');
      }

      toast.success('Arıza çözüldü olarak işaretlendi!');
      fetchData();
    } catch (err: any) {
      console.error('Error resolving log:', err);
      toast.error('Durum güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Bu arıza kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/maintenance_logs?id=eq.${logId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Kayıt silinemedi');
      }

      toast.success('Arıza kaydı silindi!');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting log:', err);
      toast.error('Kayıt silinirken bir hata oluştu.');
    }
  };

  const hasActiveFilters = searchQuery || startDate || endDate || statusFilter !== 'all' || 
                          priorityFilter !== 'all' || machineFilter !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bakım Geçmişi</h1>
        <p className="text-gray-500 mt-1">
          Tüm arıza bildirimleri ve bakım kayıtları
        </p>
      </div>

      {/* Stats - Using filtered logs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Kayıt"
          value={filteredLogs.length}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          title="Aktif"
          value={filteredLogs.filter((l) => l.status === 'pending' || l.status === 'in_progress').length}
          icon={Activity}
          color="orange"
        />
        <StatCard
          title="Çözüldü"
          value={filteredLogs.filter((l) => l.status === 'resolved').length}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Acil"
          value={filteredLogs.filter((l) => l.priority === 'critical').length}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Filters Bar - Blue Design like Machines */}
      <div id="maintenance-filters" className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-white mb-1.5">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Açıklama veya makine ara..."
                className="w-full pl-9 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white mb-1.5">
              Başlangıç
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white mb-1.5">
              Bitiş
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white mb-1.5">
              Durum
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
            >
              <option value="all">Tümü</option>
              <option value="pending">Bekliyor</option>
              <option value="in_progress">İşlemde</option>
              <option value="resolved">Çözüldü</option>
              <option value="closed">Kapalı</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white mb-1.5">
              Öncelik
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
            >
              <option value="all">Tümü</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="critical">Acil</option>
            </select>
          </div>
        </div>

        {/* Second Row - Machine Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
          <div className="md:col-span-6">
            <label className="block text-sm font-medium text-white mb-1.5">
              Makine
            </label>
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
            >
              <option value="all">Tüm Makineler</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id.toString()}>
                  {machine.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20 flex-wrap">
            <Filter className="h-4 w-4 text-white/70" />
            <span className="text-sm font-medium text-white">
              {filteredLogs.length} kayıt bulundu
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 text-white text-xs font-medium rounded-full border border-white/30">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-white/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Maintenance Logs Table */}
      <div id="maintenance-table" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tüm Kayıtlar</h2>
        </div>

        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            // Empty State - No logs at all
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz Kayıt Bulunamadı
              </h3>
              <p className="text-gray-500 mb-6">
                Hiç arıza bildirimi yapılmamış. İlk kaydı oluşturmak için QR kod tarayın.
              </p>
              <button
                onClick={() => navigate('/scan')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <AlertCircle className="h-5 w-5" />
                QR Tara
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
            // Empty State - Filtered results
            <div className="text-center py-12">
              <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Seçilen Kriterlere Uygun Kayıt Bulunamadı
              </h3>
              <p className="text-gray-500 mb-6">
                Arama kriterlerinizi değiştirmeyi veya filtreleri temizlemeyi deneyin.
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <X className="h-5 w-5" />
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Makine
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Sorun
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Öncelik
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Durum
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Bildiren
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Tarih
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      // Future: Navigate to log detail
                    }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{log.machineName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.machineQrCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-900 dark:text-gray-300 line-clamp-2 max-w-xs">
                        {log.description}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          log.priority === 'critical'
                            ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                            : log.priority === 'high'
                            ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                            : log.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200'
                            : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                        }`}
                      >
                        {log.priority === 'critical' && '🔴 '}
                        {log.priority === 'high' && '🟠 '}
                        {log.priority === 'medium' && '🟡 '}
                        {log.priority === 'low' && '⚪ '}
                        {log.priority.charAt(0).toUpperCase() + log.priority.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          log.status === 'resolved'
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
                            : log.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                            : log.status === 'closed'
                            ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                            : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                        }`}
                      >
                        {log.status === 'resolved' && '✅ '}
                        {log.status === 'in_progress' && '⚙️ '}
                        {log.status === 'closed' && '✔️ '}
                        {log.status === 'pending' && '⏳ '}
                        {log.status === 'pending' ? 'Bekliyor' : log.status === 'in_progress' ? 'İşlemde' : log.status === 'resolved' ? 'Çözüldü' : 'Kapalı'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {log.reportedBy || 'Anonim'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {new Date(log.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        {/* Resolve Button - Admin & Technician only */}
                        {log.status !== 'resolved' && log.status !== 'closed' && (
                          <PermissionGuard allowedRoles={['admin', 'technician']}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveLog(log.id);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
                              title="Çözüldü Olarak İşaretle"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                        )}

                        {/* Delete Button - Admin only */}
                        <PermissionGuard allowedRoles={['admin']}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

