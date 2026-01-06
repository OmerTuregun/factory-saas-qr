// API Response Types

export type MachineStatus = 'Active' | 'Inactive' | 'UnderMaintenance' | 'Broken';

export interface Machine {
  id: number;
  name: string;
  description?: string;
  qrCode: string;
  status: MachineStatus;
  location?: string;
  tenantId: number;
  tenantName: string;
  createdAt: string;
  updatedAt?: string;
  maintenanceLogCount: number;
}

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type MaintenanceStatus = 'Reported' | 'InProgress' | 'Resolved' | 'Closed';

export interface MaintenanceLog {
  id: number;
  description: string;
  issueType?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reportedBy?: string;
  reportedAt: string;
  resolvedAt?: string;
  resolution?: string;
  machineId: number;
  machineName: string;
  machineQrCode: string;
}

export interface CreateMachineDto {
  name: string;
  description?: string;
  location?: string;
  tenantId: number;
  status?: MachineStatus;
}

export interface CreateMaintenanceLogDto {
  qrCode: string;
  description: string;
  issueType?: string;
  priority: MaintenancePriority;
  reportedBy?: string;
}

export interface DashboardStats {
  totalMachines: number;
  activeMachines: number;
  underMaintenance: number;
  criticalIssues: number;
}
