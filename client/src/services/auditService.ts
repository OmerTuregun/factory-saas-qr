import { supabase } from '../lib/supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
export type AuditEntity = 'machines' | 'maintenance_logs' | 'profiles' | 'notifications' | 'factories';

export interface AuditLogDetails {
  old_value?: any;
  new_value?: any;
  [key: string]: any; // Diğer özel alanlar için
}

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  details?: AuditLogDetails;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Audit Service - Sistemdeki kritik değişiklikleri loglar
 * 
 * Özellikler:
 * - Silent fail: Loglama başarısız olsa bile ana işlemi durdurmaz
 * - Otomatik user_id: Mevcut oturumdan alır
 * - JSONB details: Esnek detay saklama
 */
export const auditService = {
  /**
   * Audit log oluştur
   * 
   * @param action - İşlem tipi (CREATE, UPDATE, DELETE, vb.)
   * @param entity - İşlem yapılan tablo/entity (machines, maintenance_logs, vb.)
   * @param entityId - İşlem yapılan kaydın ID'si (opsiyonel)
   * @param details - Değişiklik detayları (old_value, new_value, vb.)
   * @param ipAddress - IP adresi (opsiyonel)
   * 
   * @returns Promise<void> - Silent fail, hata olsa bile throw etmez
   */
  async logAction(
    action: AuditAction,
    entity: AuditEntity,
    entityId?: string,
    details?: AuditLogDetails,
    ipAddress?: string
  ): Promise<void> {
    try {
      // Mevcut kullanıcıyı al
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn('⚠️ [AUDIT] User not authenticated, skipping audit log:', {
          action,
          entity,
          entityId,
        });
        return; // Silent fail
      }

      // Audit log oluştur
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action,
          entity,
          entity_id: entityId || null,
          details: details || null,
          ip_address: ipAddress || null,
        });

      if (error) {
        // Silent fail: Loglama başarısız olsa bile ana işlemi durdurmaz
        console.error('❌ [AUDIT] Failed to create audit log:', error, {
          action,
          entity,
          entityId,
        });
        return;
      }

      console.log('✅ [AUDIT] Audit log created:', {
        action,
        entity,
        entityId,
        userId: user.id,
      });
    } catch (error) {
      // Silent fail: Beklenmeyen hatalar da ana işlemi durdurmaz
      console.error('❌ [AUDIT] Unexpected error creating audit log:', error, {
        action,
        entity,
        entityId,
      });
    }
  },

  /**
   * Tüm audit logları getir (sadece admin)
   * 
   * @param filters - Filtreleme seçenekleri
   * @returns Audit log listesi
   */
  async getAll(filters?: {
    userId?: string;
    action?: AuditAction;
    entity?: AuditEntity;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    // Note: Supabase'de profiles tablosu auth.users.id'ye bağlı olduğu için
    // audit_logs.user_id -> auth.users.id -> profiles.id join'i yapıyoruz
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        entity,
        entity_id,
        details,
        ip_address,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Filtreler
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.entity) {
      query = query.eq('entity', filters.entity);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [AUDIT] Failed to fetch audit logs:', error);
      throw error;
    }

    // Map database rows to AuditLog type
    // User bilgilerini ayrı sorgu ile al (profiles tablosundan)
    const userIds = [...new Set((data || []).map((row: any) => row.user_id).filter(Boolean))];
    const userMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((profile: any) => {
          userMap.set(profile.id, {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            email: profile.email,
          });
        });
      }
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action as AuditAction,
      entity: row.entity as AuditEntity,
      entityId: row.entity_id,
      details: row.details as AuditLogDetails,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
      user: row.user_id ? userMap.get(row.user_id) : undefined,
    }));
  },

  /**
   * Audit log sayısını getir (filtrelerle)
   */
  async getCount(filters?: {
    userId?: string;
    action?: AuditAction;
    entity?: AuditEntity;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    let query = supabase.from('audit_logs').select('id', { count: 'exact', head: true });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.entity) {
      query = query.eq('entity', filters.entity);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { count, error } = await query;

    if (error) {
      console.error('❌ [AUDIT] Failed to count audit logs:', error);
      throw error;
    }

    return count || 0;
  },
};

export default auditService;
