using QrAssetTracker.API.Models;

namespace QrAssetTracker.API.Repositories;

/// <summary>
/// Interface for Machine Repository
/// </summary>
public interface IMachineRepository
{
    Task<IEnumerable<Machine>> GetAllByTenantIdAsync(int tenantId);
    Task<Machine?> GetByIdAsync(int id);
    Task<Machine?> GetByQrCodeAsync(string qrCode);
    Task<Machine> CreateAsync(Machine machine);
    Task<Machine?> UpdateAsync(Machine machine);
    Task<bool> DeleteAsync(int id);
    Task<bool> QrCodeExistsAsync(string qrCode);
}

