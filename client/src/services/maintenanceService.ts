import api from './api';
import type { MaintenanceLog, CreateMaintenanceLogDto } from '../types';

export const maintenanceService = {
  /**
   * Report a maintenance issue (Anonymous access)
   */
  async report(data: CreateMaintenanceLogDto): Promise<MaintenanceLog> {
    const response = await api.post<MaintenanceLog>('/maintenance', data);
    return response.data;
  },

  /**
   * Get all maintenance logs for a machine
   */
  async getAllByMachine(machineId: number): Promise<MaintenanceLog[]> {
    const response = await api.get<MaintenanceLog[]>(`/maintenance/machine/${machineId}`);
    return response.data;
  },

  /**
   * Get all maintenance logs for a tenant
   */
  async getAllByTenant(tenantId: number): Promise<MaintenanceLog[]> {
    const response = await api.get<MaintenanceLog[]>(`/maintenance/tenant/${tenantId}`);
    return response.data;
  },

  /**
   * Get maintenance log by ID
   */
  async getById(id: number): Promise<MaintenanceLog> {
    const response = await api.get<MaintenanceLog>(`/maintenance/${id}`);
    return response.data;
  },

  /**
   * Update maintenance status
   */
  async updateStatus(
    id: number,
    status: string,
    resolution?: string
  ): Promise<MaintenanceLog> {
    const response = await api.patch<MaintenanceLog>(`/maintenance/${id}/status`, {
      status,
      resolution,
    });
    return response.data;
  },
};

export default maintenanceService;

