import { supabase } from '../lib/supabase';
import type { MaintenanceLog, CreateMaintenanceLogDto } from '../types';

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
  machineName: row.machine?.name,
  machineQrCode: row.machine?.qr_code,
});

export const maintenanceService = {
  /**
   * Report a maintenance issue
   */
  async report(data: CreateMaintenanceLogDto): Promise<MaintenanceLog> {
    const insertData: any = {
      machine_id: data.machineId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
    };

    // reported_by alanını ekle (eğer varsa)
    if (data.reportedBy) {
      insertData.reported_by = data.reportedBy;
    }

    const { data: newLog, error } = await supabase
      .from('maintenance_logs')
      .insert(insertData)
      .select(`
        *,
        machine:machines(id, name, qr_code)
      `)
      .single();

    if (error) throw error;

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
};

export default maintenanceService;

