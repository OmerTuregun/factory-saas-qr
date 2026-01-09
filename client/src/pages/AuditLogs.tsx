import { useState, useEffect } from 'react';
import {
  FileText,
  User,
  Calendar,
  Filter,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import PermissionGuard from '../components/auth/PermissionGuard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import auditService, { type AuditLog, type AuditAction, type AuditEntity } from '../services/auditService';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

// Action badge renkleri
const getActionColor = (action: AuditAction) => {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'DELETE':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'LOGIN':
    case 'LOGOUT':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

// Entity badge renkleri
const getEntityColor = (entity: AuditEntity) => {
  switch (entity) {
    case 'machines':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
    case 'maintenance_logs':
      return 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
    case 'profiles':
      return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    default:
      return 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

// Entity Türkçe isimleri
const getEntityName = (entity: AuditEntity) => {
  const names: Record<AuditEntity, string> = {
    machines: 'Makine',
    maintenance_logs: 'Arıza/Bakım',
    profiles: 'Profil',
    notifications: 'Bildirim',
    factories: 'Fabrika',
  };
  return names[entity] || entity;
};

// Action Türkçe isimleri
const getActionName = (action: AuditAction) => {
  const names: Record<AuditAction, string> = {
    CREATE: 'Oluşturuldu',
    UPDATE: 'Güncellendi',
    DELETE: 'Silindi',
    LOGIN: 'Giriş Yapıldı',
    LOGOUT: 'Çıkış Yapıldı',
    EXPORT: 'Dışa Aktarıldı',
    IMPORT: 'İçe Aktarıldı',
  };
  return names[action] || action;
};

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: any;
}

function DetailsModal({ isOpen, onClose, details }: DetailsModalProps) {
  if (!isOpen) return null;

  // Details boş veya null ise göster
  const hasDetails = details && typeof details === 'object' && Object.keys(details).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detaylar
          </h3>
          <button
            onClick={onClose}
            className="p-2 md:p-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {hasDetails ? (
            <pre className="text-sm bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Bu işlem için detay bilgisi bulunmamaktadır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filtreler
  const [filters, setFilters] = useState({
    userId: '',
    action: '' as AuditAction | '',
    entity: '' as AuditEntity | '',
    startDate: '',
    endDate: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Filtreleme modalı
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined;
      const endDate = filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined;

      const [logsData, count] = await Promise.all([
        auditService.getAll({
          userId: filters.userId || undefined,
          action: filters.action || undefined,
          entity: filters.entity || undefined,
          startDate,
          endDate,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
        }),
        auditService.getCount({
          userId: filters.userId || undefined,
          action: filters.action || undefined,
          entity: filters.entity || undefined,
          startDate,
          endDate,
        }),
      ]);

      setLogs(logsData);
      setTotalCount(count);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Denetim günlükleri yüklenirken bir hata oluştu.');
      toast.error('Denetim günlükleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Filtre değiştiğinde ilk sayfaya dön
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      entity: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading && logs.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && logs.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchLogs} />;
  }

  return (
    <PermissionGuard allowedRoles={['admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Denetim Günlükleri
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sistemdeki kritik değişikliklerin kaydı
            </p>
          </div>

          {/* Filtre Butonu */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              showFilters
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filtrele</span>
            {(filters.userId || filters.action || filters.entity || filters.startDate || filters.endDate) && (
              <span className="ml-1 px-2 py-0.5 bg-brand-500 text-white text-xs rounded-full">
                {[
                  filters.userId && '1',
                  filters.action && '1',
                  filters.entity && '1',
                  filters.startDate && '1',
                  filters.endDate && '1',
                ].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filtreler - Blue Theme */}
        {showFilters && (
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-md p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* İşlem Tipi */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  İşlem Tipi
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                >
                  <option value="" className="text-gray-900">Tümü</option>
                  <option value="CREATE" className="text-gray-900">Oluşturuldu</option>
                  <option value="UPDATE" className="text-gray-900">Güncellendi</option>
                  <option value="DELETE" className="text-gray-900">Silindi</option>
                  <option value="LOGIN" className="text-gray-900">Giriş</option>
                  <option value="LOGOUT" className="text-gray-900">Çıkış</option>
                </select>
              </div>

              {/* Kayıt Türü */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Kayıt Türü
                </label>
                <select
                  value={filters.entity}
                  onChange={(e) => handleFilterChange('entity', e.target.value)}
                  className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                >
                  <option value="" className="text-gray-900">Tümü</option>
                  <option value="machines" className="text-gray-900">Makineler</option>
                  <option value="maintenance_logs" className="text-gray-900">Arızalar/Bakımlar</option>
                  <option value="profiles" className="text-gray-900">Profiller</option>
                  <option value="notifications" className="text-gray-900">Bildirimler</option>
                </select>
              </div>

              {/* Kullanıcı ID (Basit input, daha sonra dropdown yapılabilir) */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Kullanıcı ID
                </label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  placeholder="UUID..."
                  className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/20 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                />
              </div>

              {/* Başlangıç Tarihi */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                />
              </div>

              {/* Bitiş Tarihi */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                />
              </div>
            </div>

            {/* Filtreleri Temizle */}
            {(filters.userId || filters.action || filters.entity || filters.startDate || filters.endDate) && (
              <button
                onClick={clearFilters}
                className="text-sm text-white/90 hover:text-white hover:underline font-medium"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        )}

        {/* Tablo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-brand-600 to-brand-700 border-b border-brand-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Yapan Kişi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Kayıt Türü
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    İşlem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Detaylar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Denetim günlüğü bulunamadı.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium">
                              {getInitials(log.user.firstName, log.user.lastName)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {log.user.firstName} {log.user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {log.user.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs">
                              ?
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Bilinmeyen Kullanıcı
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getEntityColor(log.entity)
                          )}
                        >
                          {getEntityName(log.entity)}
                        </span>
                        {log.entityId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {log.entityId.substring(0, 8)}...
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getActionColor(log.action)
                          )}
                        >
                          {getActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedDetails(log.details);
                              setIsDetailsModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Görüntüle</span>
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Toplam {totalCount} kayıt, Sayfa {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    currentPage === 1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    currentPage === totalPages
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <DetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedDetails(null);
        }}
        details={selectedDetails}
      />
    </PermissionGuard>
  );
}
