import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';
import { formatDate } from '../lib/utils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { cn } from '../lib/utils';
import type { Notification } from '../types';
import FaultResolutionModal from '../components/maintenance/FaultResolutionModal';
import maintenanceService from '../services/maintenanceService';
import notificationService from '../services/notificationService';
import type { MaintenanceLog } from '../types';
import toast from 'react-hot-toast';

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    fetchUnreadCount,
  } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaintenanceLog, setSelectedMaintenanceLog] = useState<MaintenanceLog | null>(null);
  const [maintenanceLogStatuses, setMaintenanceLogStatuses] = useState<Record<string, string>>({});

  // Extract maintenance log IDs from notifications and fetch their statuses
  useEffect(() => {
    const fetchLogStatuses = async () => {
      const logIds: string[] = [];
      notifications.forEach((notification) => {
        if (notification.link) {
          const logIdMatch = notification.link.match(/[?&]log=([^&]+)/);
          if (logIdMatch) {
            logIds.push(logIdMatch[1]);
          }
        }
      });

      if (logIds.length === 0) return;

      const statusMap: Record<string, string> = {};
      await Promise.all(
        logIds.map(async (logId) => {
          try {
            const log = await maintenanceService.getById(logId);
            statusMap[logId] = log.status;
          } catch (error) {
            console.error(`Error fetching log ${logId}:`, error);
          }
        })
      );
      setMaintenanceLogStatuses(statusMap);
    };

    if (notifications.length > 0) {
      fetchLogStatuses();
    }
  }, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // ÖNEMLİ: Bildirime tıklandığında ANINDA okundu yap (optimistic update)
    // Modal açılmadan önce sayaç düşmeli
    if (!notification.isRead) {
      markAsRead(notification.id); // await YOK - optimistic update
    }

    // Sadece fault-related bildirimler için modal aç
    if ((notification.type === 'new_fault' || notification.type === 'fault_resolved') && notification.link) {
      // Extract machine ID and log ID from link (format: /machines/{machineId}?log={logId})
      const machineIdMatch = notification.link.match(/\/machines\/([^\/\?]+)/);
      const logIdMatch = notification.link.match(/[?&]log=([^&]+)/);
      
      if (machineIdMatch) {
        const machineId = machineIdMatch[1];
        try {
          let targetLog: MaintenanceLog | null = null;
          
          // If log ID is in the link, fetch that specific log
          if (logIdMatch) {
            const logId = logIdMatch[1];
            try {
              targetLog = await maintenanceService.getById(logId);
            } catch (error) {
              console.error('Error fetching specific maintenance log:', error);
            }
          }
          
          // If no specific log found, try to find the latest active log
          if (!targetLog) {
            const logs = await maintenanceService.getAllByMachine(machineId);
            // For new_fault, find pending/in_progress. For fault_resolved, find the resolved one
            if (notification.type === 'new_fault') {
              targetLog = logs.find(
                (log) => log.status === 'pending' || log.status === 'in_progress'
              ) || null;
            } else {
              // For resolved notifications, find the most recent resolved log
              targetLog = logs.find(
                (log) => log.status === 'resolved'
              ) || null;
            }
          }
          
          if (targetLog) {
            setSelectedMaintenanceLog(targetLog);
            setIsModalOpen(true);
            return; // Modal açıldı, yönlendirme YOK
          }
        } catch (error) {
          console.error('Error fetching maintenance log:', error);
          // Hata olursa modal açma, sadece toast göster
          toast.error('Arıza detayları yüklenirken bir hata oluştu.');
          return;
        }
      }
    }

    // Diğer bildirim tipleri için de modal açma, sadece toast göster
    // Yönlendirme YAPMA - kullanıcı modal'dan detaylara gidebilir
    toast('Bu bildirim için detay görüntülenemiyor.', { icon: 'ℹ️' });
  };

  const handleModalResolved = async () => {
    // Modal kapandıktan sonra bildirimleri yenile
    // NOT: Context'teki optimistic update zaten çalışıyor, sadece log status'ları güncelle
    await fetchNotifications();
    await fetchUnreadCount(); // ÖNEMLİ: Sayaç senkronizasyonu için
    
    // Maintenance log status'larını güncelle
    const logIds: string[] = [];
    notifications.forEach((notification) => {
      if (notification.link) {
        const logIdMatch = notification.link.match(/[?&]log=([^&]+)/);
        if (logIdMatch) {
          logIds.push(logIdMatch[1]);
        }
      }
    });

    if (logIds.length > 0) {
      const statusMap: Record<string, string> = {};
      await Promise.all(
        logIds.map(async (logId) => {
          try {
            const log = await maintenanceService.getById(logId);
            statusMap[logId] = log.status;
          } catch (error) {
            console.error(`Error fetching log ${logId}:`, error);
          }
        })
      );
      setMaintenanceLogStatuses(statusMap);
    }
  };

  const getNotificationIcon = (type: string, isResolved: boolean = false) => {
    // Eğer ilgili log çözülmüşse, yeşil icon göster
    if (isResolved && type === 'new_fault') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    switch (type) {
      case 'new_fault':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'fault_resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'new_fault':
        return 'Yeni Arıza';
      case 'fault_resolved':
        return 'Arıza Çözüldü';
      default:
        return 'Bildirim';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bildirimler
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} okunmamış bildirim`
              : 'Tüm bildirimler okundu'}
          </p>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <CheckCheck className="h-5 w-5" />
            <span>Tümünü Okundu İşaretle</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Henüz Bildirim Yok
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Yeni bildirimler burada görünecek.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => {
              // Çözülen bildirimler için özel görünüm
              const isResolvedNotification = notification.type === 'fault_resolved';
              
              // Check if the related maintenance log is resolved
              let isRelatedLogResolved = false;
              if (notification.link) {
                const logIdMatch = notification.link.match(/[?&]log=([^&]+)/);
                if (logIdMatch) {
                  const logId = logIdMatch[1];
                  const logStatus = maintenanceLogStatuses[logId];
                  isRelatedLogResolved = logStatus === 'resolved';
                }
              }
              
              // Bildirim çözüldü bildirimi ise veya ilgili log çözülmüşse yeşil göster
              const isResolved = isResolvedNotification || isRelatedLogResolved;
              const isUnread = !notification.isRead;
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'p-6 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    isUnread && !isResolved
                      ? 'bg-white dark:bg-gray-800 border-l-4 border-brand-600'
                      : isResolved
                      ? 'bg-white dark:bg-gray-800 border-l-4 border-green-500'
                      : 'bg-white dark:bg-gray-800'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type, isResolved)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Type Badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              isResolved
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            )}>
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                            {isUnread && !isResolved && (
                              <span className="h-2 w-2 rounded-full bg-brand-600"></span>
                            )}
                            {isResolved && (
                              <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            )}
                          </div>

                          {/* Title */}
                          <h3
                            className={cn(
                              'text-base font-semibold mb-1',
                              isResolved
                                ? 'text-green-700 dark:text-green-400'
                                : notification.isRead
                                ? 'text-gray-600 dark:text-gray-400'
                                : 'text-gray-900 dark:text-white'
                            )}
                          >
                            {notification.title}
                          </h3>

                          {/* Message */}
                          <p
                            className={cn(
                              'text-sm mb-2',
                              isResolved
                                ? 'text-green-600 dark:text-green-500'
                                : notification.isRead
                                ? 'text-gray-500 dark:text-gray-500'
                                : 'text-gray-700 dark:text-gray-300'
                            )}
                          >
                            {notification.message}
                          </p>

                          {/* Date */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(notification.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fault Resolution Modal */}
      <FaultResolutionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMaintenanceLog(null);
          // NOT: Modal kapandığında otomatik okundu yapma!
          // Kullanıcı sadece "okundu" butonuna bastığında okundu olacak
        }}
        maintenanceLog={selectedMaintenanceLog}
        onResolved={handleModalResolved}
      />
    </div>
  );
}

