import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, AlertCircle, User, Calendar, Package, ExternalLink } from 'lucide-react';
import type { MaintenanceLog } from '../../types';
import maintenanceService from '../../services/maintenanceService';
import { getPriorityColor } from '../../lib/utils';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import PermissionGuard from '../auth/PermissionGuard';
import { useNotifications } from '../../contexts/NotificationsContext';

interface FaultResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenanceLog: MaintenanceLog | null;
  onResolved?: () => void; // Callback after resolution
}

export default function FaultResolutionModal({
  isOpen,
  onClose,
  maintenanceLog,
  onResolved,
}: FaultResolutionModalProps) {
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);
  const { notifications, markAsRead } = useNotifications();

  if (!isOpen || !maintenanceLog) return null;

  const handleResolve = async () => {
    try {
      setResolving(true);
      
      // Arızayı çöz
      await maintenanceService.resolve(maintenanceLog.id);
      
      // ÖNEMLİ: Çözen kullanıcının kendi bildirimini (eğer varsa) okundu yap
      // Bu sadece çözen kullanıcının bildirimi için geçerli, diğer kullanıcıların bildirimleri okunmamış kalır
      const relatedNotification = notifications.find(
        (n) => n.relatedFaultId === maintenanceLog.id && n.type === 'new_fault'
      );
      
      if (relatedNotification && !relatedNotification.isRead) {
        console.log('✅ [MODAL] Marking resolver\'s own notification as read:', relatedNotification.id);
        markAsRead(relatedNotification.id); // Optimistic update - anında güncelle
      }
      
      toast.success('Arıza başarıyla çözüldü olarak işaretlendi!');
      onResolved?.();
      onClose();
    } catch (error) {
      console.error('Error resolving maintenance log:', error);
      toast.error('Arıza çözülürken bir hata oluştu.');
    } finally {
      setResolving(false);
    }
  };

  const handleViewDetails = () => {
    onClose();
    navigate(`/machines/${maintenanceLog.machineId}`);
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Düşük',
      medium: 'Orta',
      high: 'Yüksek',
      critical: 'Acil',
    };
    return labels[priority] || priority;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'critical') {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-orange-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Arıza Detayları
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Machine Info */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {maintenanceLog.machineName || 'Bilinmeyen Makine'}
              </h3>
              {maintenanceLog.machineQrCode && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  QR: {maintenanceLog.machineQrCode}
                </p>
              )}
            </div>
          </div>

          {/* Fault Info */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Arıza Başlığı
              </label>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {maintenanceLog.title}
              </p>
            </div>

            {/* Description */}
            {maintenanceLog.description && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Açıklama
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {maintenanceLog.description}
                </p>
              </div>
            )}

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Öncelik
                </label>
                <div className="flex items-center gap-2">
                  {getPriorityIcon(maintenanceLog.priority)}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getPriorityLabel(maintenanceLog.priority)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Durum
                </label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    maintenanceLog.status === 'resolved'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : maintenanceLog.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {maintenanceLog.status === 'resolved'
                    ? 'Çözüldü'
                    : maintenanceLog.status === 'in_progress'
                    ? 'İşlemde'
                    : 'Bekliyor'}
                </span>
              </div>
            </div>

            {/* Reported By and Date */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bildiren</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {maintenanceLog.reportedBy || 'Anonim'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tarih</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(maintenanceLog.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Detaylara Git
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Kapat
            </button>

            {/* Resolve Button - Only for admin and technician, and if not already resolved */}
            {maintenanceLog.status !== 'resolved' && (
              <PermissionGuard allowedRoles={['admin', 'technician']}>
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  {resolving ? 'Çözülüyor...' : 'Arızayı Çöz'}
                </button>
              </PermissionGuard>
            )}

            {/* Already Resolved Indicator */}
            {maintenanceLog.status === 'resolved' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Çözüldü</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

