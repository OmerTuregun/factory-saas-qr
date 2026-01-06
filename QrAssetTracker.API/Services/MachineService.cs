using QrAssetTracker.API.DTOs;
using QrAssetTracker.API.Models;
using QrAssetTracker.API.Repositories;

namespace QrAssetTracker.API.Services;

/// <summary>
/// Machine Service Implementation with Business Logic
/// </summary>
public class MachineService : IMachineService
{
    private readonly IMachineRepository _machineRepository;
    private readonly ILogger<MachineService> _logger;

    public MachineService(IMachineRepository machineRepository, ILogger<MachineService> logger)
    {
        _machineRepository = machineRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<MachineResponseDto>> GetAllByTenantIdAsync(int tenantId)
    {
        var machines = await _machineRepository.GetAllByTenantIdAsync(tenantId);
        return machines.Select(MapToResponseDto);
    }

    public async Task<MachineResponseDto?> GetByIdAsync(int id)
    {
        var machine = await _machineRepository.GetByIdAsync(id);
        return machine == null ? null : MapToResponseDto(machine);
    }

    public async Task<MachineResponseDto?> GetByQrCodeAsync(string qrCode)
    {
        var machine = await _machineRepository.GetByQrCodeAsync(qrCode);
        return machine == null ? null : MapToResponseDto(machine);
    }

    public async Task<MachineResponseDto> CreateMachineAsync(CreateMachineDto dto)
    {
        // Generate unique QR Code using GUID
        var qrCode = GenerateUniqueQrCode();

        // Ensure QR code is unique (extra safety check)
        while (await _machineRepository.QrCodeExistsAsync(qrCode))
        {
            qrCode = GenerateUniqueQrCode();
            _logger.LogWarning("QR Code collision detected, regenerating...");
        }

        var machine = new Machine
        {
            Name = dto.Name,
            Description = dto.Description,
            Location = dto.Location,
            TenantId = dto.TenantId,
            Status = dto.Status,
            QrCode = qrCode,
            CreatedAt = DateTime.UtcNow
        };

        var createdMachine = await _machineRepository.CreateAsync(machine);
        
        // Reload with navigation properties
        var machineWithRelations = await _machineRepository.GetByIdAsync(createdMachine.Id);
        
        _logger.LogInformation("Machine created successfully. ID: {MachineId}, QR: {QrCode}", 
            createdMachine.Id, qrCode);

        return MapToResponseDto(machineWithRelations!);
    }

    public async Task<MachineResponseDto?> UpdateMachineAsync(int id, UpdateMachineDto dto)
    {
        var existingMachine = await _machineRepository.GetByIdAsync(id);
        if (existingMachine == null)
        {
            _logger.LogWarning("Machine not found for update. ID: {MachineId}", id);
            return null;
        }

        // Update only provided fields
        if (!string.IsNullOrWhiteSpace(dto.Name))
            existingMachine.Name = dto.Name;
        
        if (dto.Description != null)
            existingMachine.Description = dto.Description;
        
        if (dto.Location != null)
            existingMachine.Location = dto.Location;
        
        if (!string.IsNullOrWhiteSpace(dto.Status))
            existingMachine.Status = dto.Status;

        var updatedMachine = await _machineRepository.UpdateAsync(existingMachine);
        
        _logger.LogInformation("Machine updated successfully. ID: {MachineId}", id);

        return updatedMachine == null ? null : MapToResponseDto(updatedMachine);
    }

    public async Task<bool> DeleteMachineAsync(int id)
    {
        var result = await _machineRepository.DeleteAsync(id);
        
        if (result)
            _logger.LogInformation("Machine deleted successfully. ID: {MachineId}", id);
        else
            _logger.LogWarning("Machine not found for deletion. ID: {MachineId}", id);

        return result;
    }

    /// <summary>
    /// Generates a unique QR Code string using GUID
    /// Format: MACHINE-{GUID}
    /// </summary>
    private string GenerateUniqueQrCode()
    {
        var guid = Guid.NewGuid().ToString("N").ToUpper();
        return $"MACHINE-{guid}";
    }

    /// <summary>
    /// Maps Machine entity to MachineResponseDto
    /// </summary>
    private MachineResponseDto MapToResponseDto(Machine machine)
    {
        return new MachineResponseDto
        {
            Id = machine.Id,
            Name = machine.Name,
            Description = machine.Description,
            QrCode = machine.QrCode,
            Status = machine.Status,
            Location = machine.Location,
            TenantId = machine.TenantId,
            TenantName = machine.Tenant?.CompanyName ?? "Unknown",
            CreatedAt = machine.CreatedAt,
            UpdatedAt = machine.UpdatedAt,
            MaintenanceLogCount = machine.MaintenanceLogs?.Count ?? 0
        };
    }
}

