using QrAssetTracker.API.DTOs;

namespace QrAssetTracker.API.Services;

/// <summary>
/// Interface for Maintenance Service
/// </summary>
public interface IMaintenanceService
{
    Task<MaintenanceLogResponseDto?> CreateMaintenanceLogAsync(CreateMaintenanceLogDto dto);
    Task<IEnumerable<MaintenanceLogResponseDto>> GetAllByMachineIdAsync(int machineId);
    Task<IEnumerable<MaintenanceLogResponseDto>> GetAllByTenantIdAsync(int tenantId);
    Task<MaintenanceLogResponseDto?> GetByIdAsync(int id);
    Task<MaintenanceLogResponseDto?> UpdateStatusAsync(int id, string status, string? resolution = null);
}

