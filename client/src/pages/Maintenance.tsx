import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Calendar, User, Package, AlertCircle, Search, Filter, X } from 'lucide-react';
import maintenanceService from '../services/maintenanceService';
import machineService from '../services/machineService';
import type { MaintenanceLog, Machine } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, getPriorityColor } from '../lib/utils';

export default function Maintenance() {
  const navigate = useNavigate();
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch logs and machines in parallel
      const [logsData, machinesData] = await Promise.all([
        maintenanceService.getAllByTenant(1),
        machineService.getAllByTenant(1),
      ]);
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
      const logDate = new Date(log.reportedAt);
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-base font-semibold text-gray-600 mb-2">Toplam Kayıt</p>
          <p className="text-4xl font-bold text-gray-900">{filteredLogs.length}</p>
          {hasActiveFilters && logs.length !== filteredLogs.length && (
            <p className="text-sm text-gray-400 mt-2">/ {logs.length} toplam</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-base font-semibold text-gray-600 mb-2">Aktif</p>
          <p className="text-4xl font-bold text-orange-600">
            {filteredLogs.filter((l) => l.status === 'Reported' || l.status === 'InProgress').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-base font-semibold text-gray-600 mb-2">Çözüldü</p>
          <p className="text-4xl font-bold text-green-600">
            {filteredLogs.filter((l) => l.status === 'Resolved').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-base font-semibold text-gray-600 mb-2">Acil</p>
          <p className="text-4xl font-bold text-red-600">
            {filteredLogs.filter((l) => l.priority === 'Critical').length}
          </p>
        </div>
      </div>

      {/* Filters Bar - Clean White Design */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Açıklama veya makine ara..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Başlangıç
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bitiş
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Durum
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            >
              <option value="all">Tümü</option>
              <option value="Reported">Bekliyor</option>
              <option value="InProgress">İşlemde</option>
              <option value="Resolved">Çözüldü</option>
              <option value="Closed">Kapalı</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Öncelik
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            >
              <option value="all">Tümü</option>
              <option value="Low">Düşük</option>
              <option value="Medium">Orta</option>
              <option value="High">Yüksek</option>
              <option value="Critical">Acil</option>
            </select>
          </div>
        </div>

        {/* Second Row - Machine Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
          <div className="md:col-span-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Makine
            </label>
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
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
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {filteredLogs.length} kayıt bulundu
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Maintenance Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Tüm Kayıtlar</h2>
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
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Makine
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Sorun
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Öncelik
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Durum
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Bildiren
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Tarih
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
                          <p className="font-medium text-gray-900">{log.machineName}</p>
                          <p className="text-xs text-gray-500">{log.machineQrCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-900 line-clamp-2 max-w-xs">
                        {log.description}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          log.priority === 'Critical'
                            ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                            : log.priority === 'High'
                            ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                            : log.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200'
                            : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                        }`}
                      >
                        {log.priority === 'Critical' && '🔴 '}
                        {log.priority === 'High' && '🟠 '}
                        {log.priority === 'Medium' && '🟡 '}
                        {log.priority === 'Low' && '⚪ '}
                        {log.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          log.status === 'Resolved'
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
                            : log.status === 'InProgress'
                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                            : log.status === 'Closed'
                            ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                            : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                        }`}
                      >
                        {log.status === 'Resolved' && '✅ '}
                        {log.status === 'InProgress' && '⚙️ '}
                        {log.status === 'Closed' && '✔️ '}
                        {log.status === 'Reported' && '⏳ '}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <User className="h-4 w-4 text-gray-400" />
                        {log.reportedBy || 'Anonim'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(log.reportedAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
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

