using QrAssetTracker.API.DTOs;
using QrAssetTracker.API.Models;
using QrAssetTracker.API.Repositories;

namespace QrAssetTracker.API.Services;

/// <summary>
/// Maintenance Service Implementation with Business Logic
/// </summary>
public class MaintenanceService : IMaintenanceService
{
    private readonly IMaintenanceRepository _maintenanceRepository;
    private readonly IMachineRepository _machineRepository;
    private readonly ILogger<MaintenanceService> _logger;

    public MaintenanceService(
        IMaintenanceRepository maintenanceRepository,
        IMachineRepository machineRepository,
        ILogger<MaintenanceService> logger)
    {
        _maintenanceRepository = maintenanceRepository;
        _machineRepository = machineRepository;
        _logger = logger;
    }

    public async Task<MaintenanceLogResponseDto?> CreateMaintenanceLogAsync(CreateMaintenanceLogDto dto)
    {
        // Validate QR Code and get Machine
        var machine = await _machineRepository.GetByQrCodeAsync(dto.QrCode);
        
        if (machine == null)
        {
            _logger.LogWarning("Invalid QR Code provided: {QrCode}", dto.QrCode);
            return null;
        }

        // Create Maintenance Log
        var maintenanceLog = new MaintenanceLog
        {
            MachineId = machine.Id,
            Description = dto.Description,
            IssueType = dto.IssueType,
            Priority = dto.Priority,
            Status = "Reported",
            ReportedBy = dto.ReportedBy,
            ReportedAt = DateTime.UtcNow
        };

        var createdLog = await _maintenanceRepository.CreateAsync(maintenanceLog);
        
        // Reload with navigation properties
        var logWithRelations = await _maintenanceRepository.GetByIdAsync(createdLog.Id);

        _logger.LogInformation(
            "Maintenance log created. ID: {LogId}, Machine: {MachineName}, Priority: {Priority}",
            createdLog.Id, machine.Name, dto.Priority);

        // Optionally update machine status based on priority
        if (dto.Priority == "Critical" || dto.Priority == "High")
        {
            machine.Status = "UnderMaintenance";
            await _machineRepository.UpdateAsync(machine);
            _logger.LogInformation("Machine status updated to UnderMaintenance. Machine ID: {MachineId}", machine.Id);
        }

        return MapToResponseDto(logWithRelations!);
    }

    public async Task<IEnumerable<MaintenanceLogResponseDto>> GetAllByMachineIdAsync(int machineId)
    {
        var logs = await _maintenanceRepository.GetAllByMachineIdAsync(machineId);
        return logs.Select(MapToResponseDto);
    }

    public async Task<IEnumerable<MaintenanceLogResponseDto>> GetAllByTenantIdAsync(int tenantId)
    {
        var logs = await _maintenanceRepository.GetAllByTenantIdAsync(tenantId);
        return logs.Select(MapToResponseDto);
    }

    public async Task<MaintenanceLogResponseDto?> GetByIdAsync(int id)
    {
        var log = await _maintenanceRepository.GetByIdAsync(id);
        return log == null ? null : MapToResponseDto(log);
    }

    public async Task<MaintenanceLogResponseDto?> UpdateStatusAsync(int id, string status, string? resolution = null)
    {
        var log = await _maintenanceRepository.GetByIdAsync(id);
        
        if (log == null)
        {
            _logger.LogWarning("Maintenance log not found. ID: {LogId}", id);
            return null;
        }

        log.Status = status;
        log.Resolution = resolution;

        if (status == "Resolved" || status == "Closed")
        {
            log.ResolvedAt = DateTime.UtcNow;
            
            // Update machine status back to Active if resolved
            var machine = await _machineRepository.GetByIdAsync(log.MachineId);
            if (machine != null && machine.Status == "UnderMaintenance")
            {
                machine.Status = "Active";
                await _machineRepository.UpdateAsync(machine);
                _logger.LogInformation("Machine status updated to Active. Machine ID: {MachineId}", machine.Id);
            }
        }

        var updatedLog = await _maintenanceRepository.UpdateAsync(log);
        
        _logger.LogInformation("Maintenance log status updated. ID: {LogId}, Status: {Status}", id, status);

        return updatedLog == null ? null : MapToResponseDto(updatedLog);
    }

    /// <summary>
    /// Maps MaintenanceLog entity to MaintenanceLogResponseDto
    /// </summary>
    private MaintenanceLogResponseDto MapToResponseDto(MaintenanceLog log)
    {
        return new MaintenanceLogResponseDto
        {
            Id = log.Id,
            Description = log.Description,
            IssueType = log.IssueType,
            Priority = log.Priority,
            Status = log.Status,
            ReportedBy = log.ReportedBy,
            ReportedAt = log.ReportedAt,
            ResolvedAt = log.ResolvedAt,
            Resolution = log.Resolution,
            MachineId = log.MachineId,
            MachineName = log.Machine?.Name ?? "Unknown",
            MachineQrCode = log.Machine?.QrCode ?? "Unknown"
        };
    }
}

