import { supabase } from '../lib/supabase';
import type { MaintenanceLog, CreateMaintenanceLogDto } from '../types';
import auditService from './auditService';

// Map database row to MaintenanceLog type
const mapToMaintenanceLog = (row: any): MaintenanceLog => ({
  id: row.id,
  machineId: row.machine_id,
  title: row.title,
  description: row.description,
  status: row.status || 'pending',
  priority: row.priority || 'medium',
  reportedBy: row.reported_by,
  createdAt: row.created_at,
  createdBy: row.created_by,
  resolvedBy: row.resolved_by,
  resolvedAt: row.resolved_at,
  machineName: row.machine?.name,
  machineQrCode: row.machine?.qr_code,
});

export const maintenanceService = {
  /**
   * Report a maintenance issue
   */
  async report(data: CreateMaintenanceLogDto): Promise<MaintenanceLog> {
    console.log('🔧 [MAINTENANCE SERVICE] report() called with data:', data);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 [MAINTENANCE SERVICE] Current user:', user?.id, user?.email);
    
    const insertData: any = {
      machine_id: data.machineId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
    };

    // created_by alanını ekle (bildirim göndermek için gerekli)
    if (user) {
      insertData.created_by = user.id;
      console.log('✅ [MAINTENANCE SERVICE] Added created_by:', user.id);
    } else {
      console.warn('⚠️ [MAINTENANCE SERVICE] No user found! created_by will be NULL');
    }

    // reported_by alanını ekle (eğer varsa)
    if (data.reportedBy) {
      insertData.reported_by = data.reportedBy;
      console.log('✅ [MAINTENANCE SERVICE] Added reported_by:', data.reportedBy);
    }

    console.log('📤 [MAINTENANCE SERVICE] Inserting maintenance log:', insertData);

    const { data: newLog, error } = await supabase
      .from('maintenance_logs')
      .insert(insertData)
      .select(`
        *,
        machine:machines(id, name, qr_code)
      `)
      .single();

    if (error) {
      console.error('❌ [MAINTENANCE SERVICE] Error inserting maintenance log:', error);
      throw error;
    }

    console.log('✅ [MAINTENANCE SERVICE] Maintenance log created successfully:', newLog?.id);
    console.log('📋 [MAINTENANCE SERVICE] Created log details:', {
      id: newLog?.id,
      machine_id: newLog?.machine_id,
      created_by: newLog?.created_by,
      status: newLog?.status,
    });

    // Audit log: Yeni arıza bildirildi
    auditService.logAction('CREATE', 'maintenance_logs', newLog.id, {
      new_value: {
        title: newLog.title,
        description: newLog.description,
        priority: newLog.priority,
        status: newLog.status,
        machine_id: newLog.machine_id,
      },
    }).catch(() => {
      // Silent fail
    });

    return mapToMaintenanceLog(newLog);
  },

  /**
   * Get all maintenance logs for a machine
   */
  async getAllByMachine(machineId: string): Promise<MaintenanceLog[]> {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select(`
        *,
        machine:machines(id, name, qr_code)
      `)
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToMaintenanceLog);
  },

  /**
   * Get all maintenance logs for a factory (tenant)
   */
  async getAllByTenant(factoryId: string): Promise<MaintenanceLog[]> {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select(`
        *,
        machine:machines!inner(id, name, qr_code, factory_id)
      `)
      .eq('machine.factory_id', factoryId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToMaintenanceLog);
  },

  /**
   * Get maintenance log by ID
   */
  async getById(id: string): Promise<MaintenanceLog> {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select(`
        *,
        machine:machines(id, name, qr_code)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return mapToMaintenanceLog(data);
  },

  /**
   * Update maintenance status
   */
  async updateStatus(
    id: string,
    status: string,
    resolution?: string
  ): Promise<MaintenanceLog> {
    const updateData: any = { status };
    if (resolution) updateData.resolution = resolution;

    const { data: updatedLog, error } = await supabase
      .from('maintenance_logs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        machine:machines(id, name, qr_code)
      `)
      .single();

    if (error) throw error;

    return mapToMaintenanceLog(updatedLog);
  },

  /**
   * Resolve maintenance log (mark as resolved)
   */
  async resolve(id: string): Promise<MaintenanceLog> {
    console.log('🔧 [MAINTENANCE SERVICE] resolve() called for log ID:', id);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ [MAINTENANCE SERVICE] User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('👤 [MAINTENANCE SERVICE] Resolving user:', user.id, user.email);

    const updateData: any = {
      status: 'resolved',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    };

    console.log('📤 [MAINTENANCE SERVICE] Updating maintenance log:', updateData);

    const { data: updatedLog, error } = await supabase
      .from('maintenance_logs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        machine:machines(id, name, qr_code)
      `)
      .single();

    if (error) {
      console.error('❌ [MAINTENANCE SERVICE] Error updating maintenance log:', error);
      throw error;
    }

    console.log('✅ [MAINTENANCE SERVICE] Maintenance log resolved successfully:', updatedLog?.id);
    console.log('📋 [MAINTENANCE SERVICE] Resolved log details:', {
      id: updatedLog?.id,
      status: updatedLog?.status,
      resolved_by: updatedLog?.resolved_by,
      resolved_at: updatedLog?.resolved_at,
      created_by: updatedLog?.created_by,
    });

    // Audit log: Arıza çözüldü
    auditService.logAction('UPDATE', 'maintenance_logs', id, {
      status: 'resolved',
      resolved_by: user.id,
      resolved_at: updatedLog.resolved_at,
    }).catch(() => {
      // Silent fail
    });

    return mapToMaintenanceLog(updatedLog);
  },
};

export default maintenanceService;

