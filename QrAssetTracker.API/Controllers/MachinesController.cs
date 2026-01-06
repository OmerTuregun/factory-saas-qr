using Microsoft.AspNetCore.Mvc;
using QrAssetTracker.API.DTOs;
using QrAssetTracker.API.Services;

namespace QrAssetTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MachinesController : ControllerBase
{
    private readonly IMachineService _machineService;
    private readonly ILogger<MachinesController> _logger;

    public MachinesController(IMachineService machineService, ILogger<MachinesController> logger)
    {
        _machineService = machineService;
        _logger = logger;
    }

    /// <summary>
    /// Get all machines for a specific tenant
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <returns>List of machines</returns>
    [HttpGet("tenant/{tenantId}")]
    [ProducesResponseType(typeof(IEnumerable<MachineResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MachineResponseDto>>> GetMachinesByTenant(int tenantId)
    {
        try
        {
            var machines = await _machineService.GetAllByTenantIdAsync(tenantId);
            return Ok(machines);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving machines for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving machines" });
        }
    }

    /// <summary>
    /// Get machine by ID
    /// </summary>
    /// <param name="id">Machine ID</param>
    /// <returns>Machine details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(MachineResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MachineResponseDto>> GetMachineById(int id)
    {
        try
        {
            var machine = await _machineService.GetByIdAsync(id);
            
            if (machine == null)
                return NotFound(new { message = $"Machine with ID {id} not found" });

            return Ok(machine);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving machine {MachineId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the machine" });
        }
    }

    /// <summary>
    /// Get machine by QR Code (Used when worker scans QR)
    /// </summary>
    /// <param name="qrCode">QR Code string</param>
    /// <returns>Machine details</returns>
    [HttpGet("qr/{qrCode}")]
    [ProducesResponseType(typeof(MachineResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MachineResponseDto>> GetMachineByQrCode(string qrCode)
    {
        try
        {
            var machine = await _machineService.GetByQrCodeAsync(qrCode);
            
            if (machine == null)
                return NotFound(new { message = $"Machine with QR Code '{qrCode}' not found" });

            return Ok(machine);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving machine by QR Code {QrCode}", qrCode);
            return StatusCode(500, new { message = "An error occurred while retrieving the machine" });
        }
    }

    /// <summary>
    /// Create a new machine (Auto-generates QR Code)
    /// </summary>
    /// <param name="dto">Machine creation data</param>
    /// <returns>Created machine with QR Code</returns>
    [HttpPost]
    [ProducesResponseType(typeof(MachineResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MachineResponseDto>> CreateMachine([FromBody] CreateMachineDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var machine = await _machineService.CreateMachineAsync(dto);
            
            return CreatedAtAction(
                nameof(GetMachineById), 
                new { id = machine.Id }, 
                machine);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating machine");
            return StatusCode(500, new { message = "An error occurred while creating the machine" });
        }
    }

    /// <summary>
    /// Update an existing machine
    /// </summary>
    /// <param name="id">Machine ID</param>
    /// <param name="dto">Update data</param>
    /// <returns>Updated machine</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(MachineResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MachineResponseDto>> UpdateMachine(int id, [FromBody] UpdateMachineDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var machine = await _machineService.UpdateMachineAsync(id, dto);
            
            if (machine == null)
                return NotFound(new { message = $"Machine with ID {id} not found" });

            return Ok(machine);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating machine {MachineId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the machine" });
        }
    }

    /// <summary>
    /// Delete a machine
    /// </summary>
    /// <param name="id">Machine ID</param>
    /// <returns>No content</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteMachine(int id)
    {
        try
        {
            var result = await _machineService.DeleteMachineAsync(id);
            
            if (!result)
                return NotFound(new { message = $"Machine with ID {id} not found" });

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting machine {MachineId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the machine" });
        }
    }
}

