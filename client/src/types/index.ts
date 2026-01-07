// API Response Types (Updated for Supabase with UUID)

export type MachineStatus = 'active' | 'inactive' | 'maintenance' | 'fault';

export interface Machine {
  id: string; // UUID
  name: string;
  type?: string;
  status: MachineStatus;
  location?: string;
  image_url?: string;
  qrCode: string; // Mapped from qr_code
  factoryId: string; // UUID - Mapped from factory_id
  factoryName?: string; // Joined from factories table
  createdAt: string; // Mapped from created_at
  maintenanceLogCount?: number; // Calculated field
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface MaintenanceLog {
  id: string; // UUID
  machineId: string; // UUID - Mapped from machine_id
  title: string;
  description?: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  reportedBy?: string; // Mapped from reported_by
  createdAt: string; // Mapped from created_at
  
  // Joined fields
  machineName?: string;
  machineQrCode?: string;
}

export interface Factory {
  id: string; // UUID
  name: string;
  code: string;
  createdAt: string; // Mapped from created_at
}

export interface Profile {
  id: string; // UUID (matches auth.users.id)
  firstName?: string; // Mapped from first_name
  lastName?: string; // Mapped from last_name
  email?: string;
  role?: string;
  factoryId?: string; // UUID - Mapped from factory_id
  createdAt: string; // Mapped from created_at
}

export interface CreateMachineDto {
  name: string;
  type?: string;
  location?: string;
  status?: MachineStatus;
  factoryId: string; // UUID - required
}

export interface UpdateMachineDto {
  name?: string;
  type?: string;
  location?: string;
  status?: MachineStatus;
}

export interface CreateMaintenanceLogDto {
  machineId: string; // UUID
  title: string;
  description?: string;
  priority: MaintenancePriority;
  reportedBy?: string; // Bildiren kişinin adı
  status?: MaintenanceStatus;
}

export interface DashboardStats {
  totalMachines: number;
  activeMachines: number;
  underMaintenance: number;
  criticalIssues: number;
}
