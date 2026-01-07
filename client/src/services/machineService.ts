import { supabase } from '../lib/supabase';
import type { Machine, CreateMachineDto, UpdateMachineDto } from '../types';

// Helper function to generate QR code
const generateQRCode = (): string => {
  return `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
};

// Map database row to Machine type
const mapToMachine = (row: any): Machine => {
  console.log('🔄 Mapping machine row:', row);
  
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status || 'active',
    location: row.location,
    image_url: row.image_url,
    qrCode: row.qr_code,
    factoryId: row.factory_id,
    factoryName: row.factory?.name,
    createdAt: row.created_at,
    maintenanceLogCount: row.maintenance_log_count || 0,
  };
};

export const machineService = {
  /**
   * Get all machines for a factory (tenant)
   */
  async getAllByTenant(factoryId: string): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('machines')
      .select(`
        *,
        factory:factories(id, name),
        maintenance_logs(id)
      `)
      .eq('factory_id', factoryId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      ...mapToMachine(row),
      maintenanceLogCount: row.maintenance_logs?.length || 0,
    }));
  },

  /**
   * Get machine by ID
   */
  async getById(id: string): Promise<Machine> {
    const { data, error } = await supabase
      .from('machines')
      .select(`
        *,
        factory:factories(id, name),
        maintenance_logs(id)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...mapToMachine(data),
      maintenanceLogCount: data.maintenance_logs?.length || 0,
    };
  },

  /**
   * Get machine by QR code
   */
  async getByQrCode(qrCode: string): Promise<Machine> {
    const { data, error } = await supabase
      .from('machines')
      .select(`
        *,
        factory:factories(id, name),
        maintenance_logs(id)
      `)
      .eq('qr_code', qrCode)
      .single();

    if (error) throw error;

    return {
      ...mapToMachine(data),
      maintenanceLogCount: data.maintenance_logs?.length || 0,
    };
  },

  /**
   * Create a new machine
   */
  async create(data: CreateMachineDto): Promise<Machine> {
    const qrCode = generateQRCode();

    const { data: newMachine, error } = await supabase
      .from('machines')
      .insert({
        name: data.name,
        type: data.type,
        location: data.location,
        status: data.status || 'active',
        factory_id: data.factoryId,
        qr_code: qrCode,
      })
      .select(`
        *,
        factory:factories(id, name)
      `)
      .single();

    if (error) throw error;

    return mapToMachine(newMachine);
  },

  /**
   * Update machine
   */
  async update(id: string, data: UpdateMachineDto): Promise<Machine> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: updatedMachine, error } = await supabase
      .from('machines')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        factory:factories(id, name),
        maintenance_logs(id)
      `)
      .single();

    if (error) throw error;

    return {
      ...mapToMachine(updatedMachine),
      maintenanceLogCount: updatedMachine.maintenance_logs?.length || 0,
    };
  },

  /**
   * Delete machine
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export default machineService;

