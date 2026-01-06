import api from './api';
import type { Machine, CreateMachineDto } from '../types';

export const machineService = {
  /**
   * Get all machines for a tenant
   */
  async getAllByTenant(tenantId: number): Promise<Machine[]> {
    const response = await api.get<Machine[]>(`/machines/tenant/${tenantId}`);
    return response.data;
  },

  /**
   * Get machine by ID
   */
  async getById(id: number): Promise<Machine> {
    const response = await api.get<Machine>(`/machines/${id}`);
    return response.data;
  },

  /**
   * Get machine by QR code
   */
  async getByQrCode(qrCode: string): Promise<Machine> {
    const response = await api.get<Machine>(`/machines/qr/${qrCode}`);
    return response.data;
  },

  /**
   * Create a new machine
   */
  async create(data: CreateMachineDto): Promise<Machine> {
    const response = await api.post<Machine>('/machines', data);
    return response.data;
  },

  /**
   * Update machine
   */
  async update(id: number, data: Partial<CreateMachineDto>): Promise<Machine> {
    const response = await api.put<Machine>(`/machines/${id}`, data);
    return response.data;
  },

  /**
   * Delete machine
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/machines/${id}`);
  },
};

export default machineService;

