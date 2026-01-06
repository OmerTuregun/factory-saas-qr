import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Calendar, User, Package, AlertCircle } from 'lucide-react';
import maintenanceService from '../services/maintenanceService';
import type { MaintenanceLog } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, getPriorityColor } from '../lib/utils';

export default function Maintenance() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all maintenance logs for tenant 1 (demo tenant)
      const data = await maintenanceService.getAllByTenant(1);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching maintenance logs:', err);
      setError('Bakım kayıtları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchLogs} />;
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Toplam Kayıt</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Aktif</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {logs.filter((l) => l.status === 'Reported' || l.status === 'InProgress').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Çözüldü</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {logs.filter((l) => l.status === 'Resolved').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Acil</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {logs.filter((l) => l.priority === 'Critical').length}
          </p>
        </div>
      </div>

      {/* Maintenance Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Tüm Kayıtlar</h2>
        </div>

        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            // Empty State
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
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Makine
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sorun
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Öncelik
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Bildiren
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                          log.priority
                        )}`}
                      >
                        {log.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          log.status === 'Resolved'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : log.status === 'InProgress'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                      >
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

