import { supabase } from '../lib/supabase';
import type { Machine, MaintenanceLog, Profile } from '../types';

export interface SearchResult {
  machines: Machine[];
  maintenanceLogs: MaintenanceLog[];
  profiles: Profile[];
}

/**
 * Global search service - searches across machines, maintenance logs, and profiles
 */
export const searchService = {
  /**
   * Search across all tables
   */
  async search(query: string, factoryId: string): Promise<SearchResult> {
    if (!query || query.trim().length < 2) {
      return {
        machines: [],
        maintenanceLogs: [],
        profiles: [],
      };
    }

    const searchTerm = query.trim();

    // Parallel search across all tables
    const [machinesResult, logsResult, profilesResult] = await Promise.all([
      // Search machines by name or qr_code
      supabase
        .from('machines')
        .select(`
          *,
          factory:factories(id, name)
        `)
        .eq('factory_id', factoryId)
        .or(`name.ilike.%${searchTerm}%,qr_code.ilike.%${searchTerm}%`)
        .limit(10)
        .order('created_at', { ascending: false }),

      // Search maintenance logs by title
      supabase
        .from('maintenance_logs')
        .select(`
          *,
          machine:machines!inner(id, name, qr_code, factory_id)
        `)
        .eq('machine.factory_id', factoryId)
        .ilike('title', `%${searchTerm}%`)
        .limit(10)
        .order('created_at', { ascending: false }),

      // Search profiles by first_name or last_name
      supabase
        .from('profiles')
        .select('*')
        .eq('factory_id', factoryId)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10)
        .order('created_at', { ascending: false }),
    ]);

    // Map results
    const machines = (machinesResult.data || []).map((row: any) => ({
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
    }));

    const maintenanceLogs = (logsResult.data || []).map((row: any) => ({
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
    }));

    const profiles = (profilesResult.data || []).map((row: any) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      factoryId: row.factory_id,
      createdAt: row.created_at,
    }));

    return {
      machines,
      maintenanceLogs,
      profiles,
    };
  },
};

export default searchService;
