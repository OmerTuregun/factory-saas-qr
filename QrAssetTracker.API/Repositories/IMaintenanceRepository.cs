using QrAssetTracker.API.Models;

namespace QrAssetTracker.API.Repositories;

/// <summary>
/// Interface for Maintenance Log Repository
/// </summary>
public interface IMaintenanceRepository
{
    Task<IEnumerable<MaintenanceLog>> GetAllByMachineIdAsync(int machineId);
    Task<IEnumerable<MaintenanceLog>> GetAllByTenantIdAsync(int tenantId);
    Task<MaintenanceLog?> GetByIdAsync(int id);
    Task<MaintenanceLog> CreateAsync(MaintenanceLog log);
    Task<MaintenanceLog?> UpdateAsync(MaintenanceLog log);
    Task<bool> DeleteAsync(int id);
}

