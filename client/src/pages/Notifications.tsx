import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCheck, Clock, AlertCircle, CheckCircle, Filter, X, Calendar } from 'lucide-react';
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

type FilterStatus = 'unread' | 'read' | 'all';

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

  // Filter states
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('unread'); // Default: unread
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaintenanceLog, setSelectedMaintenanceLog] = useState<MaintenanceLog | null>(null);
  const [maintenanceLogStatuses, setMaintenanceLogStatuses] = useState<Record<string, string>>({});

  // Filtered notifications based on filterStatus and dateRange
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filter by status
    if (filterStatus === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filterStatus === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }
    // 'all' -> no filtering

    // Filter by date range
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((n) => {
        const notificationDate = new Date(n.createdAt);
        
        if (dateRange.start && dateRange.end) {
          // Both dates selected: check if notification is within range
          const start = new Date(dateRange.start);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dateRange.end);
          end.setHours(23, 59, 59, 999);
          return notificationDate >= start && notificationDate <= end;
        } else if (dateRange.start) {
          // Only start date: check if notification is on or after start date
          const start = new Date(dateRange.start);
          start.setHours(0, 0, 0, 0);
          return notificationDate >= start;
        } else if (dateRange.end) {
          // Only end date: check if notification is on or before end date
          const end = new Date(dateRange.end);
          end.setHours(23, 59, 59, 999);
          return notificationDate <= end;
        }
        
        return true;
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications, filterStatus, dateRange]);

  // Extract maintenance log IDs from filtered notifications and fetch their statuses
  useEffect(() => {
    const fetchLogStatuses = async () => {
      const logIds: string[] = [];
      filteredNotifications.forEach((notification) => {
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

    if (filteredNotifications.length > 0) {
      fetchLogStatuses();
    }
  }, [filteredNotifications]);

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

  const clearDateRange = () => {
    setDateRange({ start: null, end: null });
  };

  const hasActiveFilters = filterStatus !== 'unread' || dateRange.start || dateRange.end;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bildirimler
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filterStatus === 'unread' && unreadCount > 0
              ? `${unreadCount} okunmamış bildirim`
              : filterStatus === 'unread'
              ? 'Tüm bildirimler okundu'
              : `${filteredNotifications.length} bildirim gösteriliyor`}
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

      {/* Filter Bar - Blue Theme */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Left: Status Filter (Segmented Control) */}
          <div className="flex-1 w-full md:w-auto">
            <label className="block text-sm font-medium text-white mb-2 md:mb-0 md:mr-3">
              Durum
            </label>
            <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-lg p-1">
              {[
                { value: 'unread' as FilterStatus, label: 'Okunmamış' },
                { value: 'read' as FilterStatus, label: 'Okunmuş' },
                { value: 'all' as FilterStatus, label: 'Tümü' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    filterStatus === option.value
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Middle: Date Range Selector */}
          <div className="flex-1 w-full md:w-auto flex items-center gap-2">
            <label className="text-sm font-medium text-white whitespace-nowrap">
              Tarih:
            </label>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/70" />
                <input
                  type="date"
                  value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  className="px-3 py-2 text-sm border border-white/30 rounded-lg bg-white/20 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                  placeholder="Başlangıç"
                />
              </div>
              <span className="text-white/70">-</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  className="px-3 py-2 text-sm border border-white/30 rounded-lg bg-white/20 text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/30 transition-all"
                  placeholder="Bitiş"
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={clearDateRange}
                  className="p-2 md:p-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                  title="Tarih filtresini temizle"
                >
                  <X className="h-4 w-4 text-white/80 hover:text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filterStatus === 'unread' && !hasActiveFilters
                ? 'Harika! Hiç okunmamış bildiriminiz yok 🎉'
                : 'Kayıt Bulunamadı'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filterStatus === 'unread' && !hasActiveFilters
                ? 'Tüm bildirimlerinizi okudunuz.'
                : hasActiveFilters
                ? 'Seçilen filtrelere uygun bildirim bulunamadı.'
                : 'Henüz bildirim yok. Yeni bildirimler burada görünecek.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredNotifications.map((notification) => {
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

