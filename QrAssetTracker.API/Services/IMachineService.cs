using QrAssetTracker.API.DTOs;

namespace QrAssetTracker.API.Services;

/// <summary>
/// Interface for Machine Service
/// </summary>
public interface IMachineService
{
    Task<IEnumerable<MachineResponseDto>> GetAllByTenantIdAsync(int tenantId);
    Task<MachineResponseDto?> GetByIdAsync(int id);
    Task<MachineResponseDto?> GetByQrCodeAsync(string qrCode);
    Task<MachineResponseDto> CreateMachineAsync(CreateMachineDto dto);
    Task<MachineResponseDto?> UpdateMachineAsync(int id, UpdateMachineDto dto);
    Task<bool> DeleteMachineAsync(int id);
}

