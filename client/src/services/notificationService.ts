import { supabase } from '../lib/supabase';
import type { Notification } from '../types';

// Map database row to Notification type
const mapToNotification = (row: any): Notification => ({
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
});

export const notificationService = {
  /**
   * Get all notifications for the current user
   */
  async getAll(): Promise<Notification[]> {
    console.log('🔔 [NOTIFICATION SERVICE] getAll() called');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ [NOTIFICATION SERVICE] User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('👤 [NOTIFICATION SERVICE] Fetching notifications for user:', user.id);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [NOTIFICATION SERVICE] Error fetching notifications:', error);
      throw error;
    }

    const notifications = (data || []).map(mapToNotification);
    console.log(`✅ [NOTIFICATION SERVICE] Found ${notifications.length} notifications`);
    console.log('📋 [NOTIFICATION SERVICE] Notifications:', notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      isRead: n.isRead,
      relatedFaultId: n.relatedFaultId,
    })));

    return notifications;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    console.log('🔔 [NOTIFICATION SERVICE] getUnreadCount() called');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ [NOTIFICATION SERVICE] No user found, returning 0');
      return 0;
    }

    console.log('👤 [NOTIFICATION SERVICE] Counting unread notifications for user:', user.id);

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('❌ [NOTIFICATION SERVICE] Error counting unread notifications:', error);
      throw error;
    }

    const unreadCount = count || 0;
    console.log(`✅ [NOTIFICATION SERVICE] Unread count: ${unreadCount}`);

    return unreadCount;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Security: Only update own notifications

    if (error) throw error;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  },
};

export default notificationService;

