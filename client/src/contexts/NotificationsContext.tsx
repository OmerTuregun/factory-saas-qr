import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import notificationService from '../services/notificationService';
import type { Notification } from '../types';
import toast from 'react-hot-toast';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Map database row to Notification type
  const mapToNotification = useCallback((row: any): Notification => ({
    id: row.id,
    userId: row.user_id,
    factoryId: row.factory_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    relatedFaultId: row.related_fault_id,
    isRead: row.is_read || false,
    createdAt: row.created_at,
  }), []);

  // Fetch initial data
  const fetchNotifications = useCallback(async () => {
    console.log('🔔 [NOTIFICATIONS CONTEXT] fetchNotifications() called');
    try {
      setLoading(true);
      console.log('⏳ [NOTIFICATIONS CONTEXT] Fetching notifications and count...');
      
      const [notificationsData, count] = await Promise.all([
        notificationService.getAll(),
        notificationService.getUnreadCount(),
      ]);
      
      console.log('✅ [NOTIFICATIONS CONTEXT] Fetched data:', {
        notificationsCount: notificationsData.length,
        unreadCount: count,
      });
      
      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ [NOTIFICATIONS CONTEXT] Error fetching notifications:', error);
    } finally {
      setLoading(false);
      console.log('✅ [NOTIFICATIONS CONTEXT] fetchNotifications() completed');
    }
  }, []);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    try {
      console.log('🔔 [CONTEXT] fetchUnreadCount() called');
      const count = await notificationService.getUnreadCount();
      
      // Mevcut state'i al (karşılaştırma için)
      setUnreadCount((prevCount) => {
        const stateCount = notifications.filter(n => !n.isRead).length;
        console.log('📊 [CONTEXT] Unread count comparison:', {
          fromDB: count,
          fromState: stateCount,
          currentState: prevCount,
          allMatch: count === stateCount && count === prevCount,
        });
        
        // Eğer uyumsuzluk varsa uyar
        if (count !== stateCount || count !== prevCount) {
          console.warn('⚠️ [CONTEXT] Count mismatch detected!', {
            db: count,
            stateCalculated: stateCount,
            stateStored: prevCount,
            difference: Math.abs(count - prevCount),
          });
        }
        
        return count;
      });
    } catch (error) {
      console.error('❌ [CONTEXT] Error fetching unread count:', error);
    }
  }, [notifications]);

  // Mark notification as read (OPTIMISTIC UPDATE - ANINDA GÜNCELLEME)
  const markAsRead = useCallback(async (notificationId: string) => {
    // ÖNEMLİ: Önce state'i güncelle (await beklemeden)
    let previousState: Notification | null = null;
    let wasUnread = false;
    
    // OPTIMISTIC UPDATE: State'i anında güncelle
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      if (!notification) {
        console.warn('⚠️ Notification not found:', notificationId);
        return prev;
      }
      
      previousState = { ...notification };
      wasUnread = !notification.isRead;
      
      // Anında okundu olarak işaretle
      return prev.map((n) => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
    });

    // OPTIMISTIC UPDATE: Sayaçı anında azalt
    if (wasUnread) {
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        console.log('📊 [CONTEXT] Unread count updated (optimistic):', prev, '->', newCount);
        return newCount;
      });
      
      // Arka planda API isteğini at (fire and forget)
      notificationService.markAsRead(notificationId)
        .then(() => {
          console.log('✅ [CONTEXT] Notification marked as read in DB:', notificationId);
        })
        .catch((error) => {
          console.error('❌ [CONTEXT] Error marking notification as read:', error);
          // Hata olursa geri al (rollback)
          if (previousState) {
            setNotifications((prev) =>
              prev.map((n) => (n.id === notificationId ? previousState! : n))
            );
            setUnreadCount((prev) => prev + 1);
            toast.error('Bildirim okundu olarak işaretlenirken bir hata oluştu.');
          }
        });
    } else {
      console.log('ℹ️ [CONTEXT] Notification already read:', notificationId);
    }
  }, []);

  // Mark all as read (OPTIMISTIC UPDATE - ANINDA GÜNCELLEME)
  const markAllAsRead = useCallback(async () => {
    console.log('🔔 [CONTEXT] markAllAsRead() called');
    
    // ÖNEMLİ: Önce state'i güncelle (await beklemeden)
    let previousNotifications: Notification[] = [];
    let previousUnreadCount = 0;
    let hadUnreadNotifications = false;

    // OPTIMISTIC UPDATE: Tüm bildirimleri anında okundu yap
    setNotifications((prev) => {
      previousNotifications = [...prev];
      const unreadNotifications = prev.filter((n) => !n.isRead);
      previousUnreadCount = unreadNotifications.length;
      hadUnreadNotifications = unreadNotifications.length > 0;
      
      console.log('📊 [CONTEXT] Current state before markAllAsRead:', {
        totalNotifications: prev.length,
        unreadCount: previousUnreadCount,
        unreadIds: unreadNotifications.map(n => n.id),
      });
      
      // Anında tümünü okundu yap
      return prev.map((n) => ({ ...n, isRead: true }));
    });

    // OPTIMISTIC UPDATE: Sayaçı anında 0 yap
    if (hadUnreadNotifications) {
      setUnreadCount(0);
      console.log('📊 [CONTEXT] Unread count set to 0 (optimistic)');
      
      // Arka planda API isteğini at
      try {
        await notificationService.markAllAsRead();
        console.log('✅ [CONTEXT] All notifications marked as read in DB');
        
        // ÖNEMLİ: Veritabanından gerçek sayıyı tekrar çek (senkronizasyon için)
        const actualUnreadCount = await notificationService.getUnreadCount();
        console.log('📊 [CONTEXT] Actual unread count from DB:', actualUnreadCount);
        
        // Eğer hala okunmamış bildirim varsa, state'i güncelle
        if (actualUnreadCount > 0) {
          console.warn('⚠️ [CONTEXT] Still have unread notifications after markAllAsRead:', actualUnreadCount);
          // Bildirimleri tekrar çek
          const updatedNotifications = await notificationService.getAll();
          setNotifications(updatedNotifications);
          setUnreadCount(actualUnreadCount);
          console.log('🔄 [CONTEXT] State re-synced with DB');
        } else {
          // Her şey tamam, sadece sayacı 0 yap
          setUnreadCount(0);
          console.log('✅ [CONTEXT] All notifications are now read');
        }
        
        toast.success('Tüm bildirimler okundu olarak işaretlendi.');
      } catch (error) {
        console.error('❌ [CONTEXT] Error marking all as read:', error);
        // Hata olursa geri al (rollback)
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        toast.error('Bildirimler okundu olarak işaretlenirken bir hata oluştu.');
      }
    } else {
      console.log('ℹ️ [CONTEXT] No unread notifications to mark');
      toast('Tüm bildirimler zaten okundu.', { icon: 'ℹ️' });
    }
  }, []);

  // Set up Polling-based notification system (Realtime disabled due to binding errors)
  useEffect(() => {
    let mounted = true;
    let pollingInterval: NodeJS.Timeout | null = null;
    let lastNotificationIds = new Set<string>(); // Bildirim ID'lerini takip et

    const setupPolling = async () => {
      try {
        console.log('🔔 [POLLING] Starting notification polling system...');
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ [POLLING] Auth error:', authError);
          if (mounted) setLoading(false);
          return;
        }

        if (!user) {
          console.warn('⚠️ [POLLING] No user found, skipping polling');
          if (mounted) setLoading(false);
          return;
        }

        console.log('✅ [POLLING] User authenticated:', user.id);

        // Fetch initial data first
        await fetchNotifications();
        
        // Get initial notification IDs for polling comparison
        const initialNotifications = await notificationService.getAll();
        lastNotificationIds = new Set(initialNotifications.map(n => n.id));
        console.log('📊 [POLLING] Initial notifications:', initialNotifications.length, 'IDs:', Array.from(lastNotificationIds));

        // Start polling immediately (Realtime disabled due to binding errors)
        console.log('🔄 [POLLING] Starting polling system (every 5 seconds)');
        
        pollingInterval = setInterval(async () => {
          if (!mounted) return;
          
          try {
            console.log('🔄 [POLLING] Polling check...');
            const currentNotifications = await notificationService.getAll();
            const currentIds = new Set(currentNotifications.map(n => n.id));
            
            console.log('📊 [POLLING] Current notifications:', currentNotifications.length);
            console.log('📊 [POLLING] Current IDs:', Array.from(currentIds));
            console.log('📊 [POLLING] Last known IDs:', Array.from(lastNotificationIds));
            
            // Yeni bildirimleri bul (lastNotificationIds'de olmayanlar)
            const newNotifications = currentNotifications.filter(n => !lastNotificationIds.has(n.id));
            
            if (newNotifications.length > 0) {
              console.log('🔔 [POLLING] ✅ New notifications detected:', newNotifications.length);
              console.log('📋 [POLLING] New notification IDs:', newNotifications.map(n => n.id));
              console.log('📋 [POLLING] New notification details:', newNotifications.map(n => ({
                id: n.id,
                type: n.type,
                title: n.title,
                isRead: n.isRead,
              })));
              
              // State'i güncelle
              setNotifications(currentNotifications);
              
              // Unread count'u güncelle (state'ten hesapla)
              const calculatedUnreadCount = currentNotifications.filter(n => !n.isRead).length;
              
              // Veritabanından da kontrol et (senkronizasyon için)
              const dbUnreadCount = await notificationService.getUnreadCount();
              console.log('📊 [POLLING] Unread count comparison:', {
                calculated: calculatedUnreadCount,
                fromDB: dbUnreadCount,
                match: calculatedUnreadCount === dbUnreadCount,
              });
              
              // Veritabanındaki sayıyı kullan (daha güvenilir)
              setUnreadCount(dbUnreadCount);
              console.log('📊 [POLLING] Updated unread count (from DB):', dbUnreadCount);
              
              // Eğer uyumsuzluk varsa uyar
              if (calculatedUnreadCount !== dbUnreadCount) {
                console.warn('⚠️ [POLLING] Count mismatch detected! State vs DB:', {
                  state: calculatedUnreadCount,
                  db: dbUnreadCount,
                });
              }
              
              // Yeni bildirimler için toast göster (sadece okunmamış olanlar)
              newNotifications
                .filter(n => !n.isRead)
                .forEach((notification) => {
                  console.log('🔔 [POLLING] Showing toast for notification:', notification.id);
                  toast(
                    `🔔 ${notification.title}: ${notification.message}`,
                    {
                      duration: 5000,
                      position: 'top-right',
                      icon: '🔔',
                    }
                  );
                });
              
              // ID'leri güncelle
              lastNotificationIds = currentIds;
              } else {
                // Bildirim sayısı değişti mi? (silindi veya okundu)
                if (currentNotifications.length !== lastNotificationIds.size) {
                  console.log('🔄 [POLLING] Notification count changed (deleted/read), updating state');
                  setNotifications(currentNotifications);
                  
                  // Veritabanından gerçek sayıyı çek
                  const dbUnreadCount = await notificationService.getUnreadCount();
                  setUnreadCount(dbUnreadCount);
                  console.log('📊 [POLLING] Updated unread count (from DB):', dbUnreadCount);
                  
                  lastNotificationIds = currentIds;
                } else {
                  // Bildirim sayısı aynı ama okundu durumu değişmiş olabilir
                  // Veritabanından kontrol et
                  const dbUnreadCount = await notificationService.getUnreadCount();
                  const stateUnreadCount = currentNotifications.filter(n => !n.isRead).length;
                  
                  if (dbUnreadCount !== stateUnreadCount) {
                    console.log('🔄 [POLLING] Read status changed, syncing state');
                    setNotifications(currentNotifications);
                    setUnreadCount(dbUnreadCount);
                    console.log('📊 [POLLING] Synced unread count:', dbUnreadCount);
                  } else {
                    console.log('ℹ️ [POLLING] No changes detected');
                  }
                }
              }
          } catch (error) {
            console.error('❌ [POLLING] Error polling notifications:', error);
          }
        }, 5000); // Her 5 saniyede bir kontrol et
        
        if (mounted) {
          setLoading(false);
        }

      } catch (error) {
        console.error('❌ [POLLING] Error setting up polling:', error);
        if (mounted) {
          setLoading(false);
          toast.error('Bildirim sistemi başlatılırken bir hata oluştu.');
        }
      }
    };

    setupPolling();

    // Cleanup function
    return () => {
      console.log('🧹 [POLLING] Cleaning up polling...');
      mounted = false;

      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('🛑 [POLLING] Polling stopped');
      }
    };
  }, [fetchNotifications, mapToNotification]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
