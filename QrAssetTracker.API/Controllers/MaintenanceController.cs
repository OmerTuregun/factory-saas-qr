using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using QrAssetTracker.API.DTOs;
using QrAssetTracker.API.Services;

namespace QrAssetTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly IMaintenanceService _maintenanceService;
    private readonly ILogger<MaintenanceController> _logger;

    public MaintenanceController(IMaintenanceService maintenanceService, ILogger<MaintenanceController> logger)
    {
        _maintenanceService = maintenanceService;
        _logger = logger;
    }

    /// <summary>
    /// Report a maintenance issue (Anonymous access - Worker scans QR and reports)
    /// </summary>
    /// <param name="dto">Maintenance log data with QR Code</param>
    /// <returns>Created maintenance log</returns>
    [HttpPost]
    [ProducesResponseType(typeof(MaintenanceLogResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaintenanceLogResponseDto>> ReportMaintenance([FromBody] CreateMaintenanceLogDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var log = await _maintenanceService.CreateMaintenanceLogAsync(dto);
            
            if (log == null)
                return NotFound(new { message = $"Invalid QR Code: '{dto.QrCode}'. Machine not found." });

            return CreatedAtAction(
                nameof(GetMaintenanceLogById), 
                new { id = log.Id }, 
                log);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating maintenance log");
            return StatusCode(500, new { message = "An error occurred while reporting the issue" });
        }
    }

    /// <summary>
    /// Get all maintenance logs for a specific machine
    /// </summary>
    /// <param name="machineId">Machine ID</param>
    /// <returns>List of maintenance logs</returns>
    [HttpGet("machine/{machineId}")]
    [ProducesResponseType(typeof(IEnumerable<MaintenanceLogResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MaintenanceLogResponseDto>>> GetMaintenanceLogsByMachine(int machineId)
    {
        try
        {
            var logs = await _maintenanceService.GetAllByMachineIdAsync(machineId);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving maintenance logs for machine {MachineId}", machineId);
            return StatusCode(500, new { message = "An error occurred while retrieving maintenance logs" });
        }
    }

    /// <summary>
    /// Get all maintenance logs for a specific tenant
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <returns>List of maintenance logs</returns>
    [HttpGet("tenant/{tenantId}")]
    [ProducesResponseType(typeof(IEnumerable<MaintenanceLogResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MaintenanceLogResponseDto>>> GetMaintenanceLogsByTenant(int tenantId)
    {
        try
        {
            var logs = await _maintenanceService.GetAllByTenantIdAsync(tenantId);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving maintenance logs for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving maintenance logs" });
        }
    }

    /// <summary>
    /// Get maintenance log by ID
    /// </summary>
    /// <param name="id">Log ID</param>
    /// <returns>Maintenance log details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(MaintenanceLogResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaintenanceLogResponseDto>> GetMaintenanceLogById(int id)
    {
        try
        {
            var log = await _maintenanceService.GetByIdAsync(id);
            
            if (log == null)
                return NotFound(new { message = $"Maintenance log with ID {id} not found" });

            return Ok(log);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving maintenance log {LogId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the maintenance log" });
        }
    }

    /// <summary>
    /// Update maintenance log status (e.g., InProgress, Resolved, Closed)
    /// </summary>
    /// <param name="id">Log ID</param>
    /// <param name="request">Status update request</param>
    /// <returns>Updated maintenance log</returns>
    [HttpPatch("{id}/status")]
    [ProducesResponseType(typeof(MaintenanceLogResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MaintenanceLogResponseDto>> UpdateMaintenanceStatus(
        int id, 
        [FromBody] UpdateMaintenanceStatusRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var log = await _maintenanceService.UpdateStatusAsync(id, request.Status, request.Resolution);
            
            if (log == null)
                return NotFound(new { message = $"Maintenance log with ID {id} not found" });

            return Ok(log);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating maintenance log status {LogId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the status" });
        }
    }
}

/// <summary>
/// Request model for updating maintenance status
/// </summary>
public class UpdateMaintenanceStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
    
    public string? Resolution { get; set; }
}

