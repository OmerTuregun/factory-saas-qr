using System.ComponentModel.DataAnnotations;

namespace QrAssetTracker.API.DTOs;

/// <summary>
/// DTO for creating a new Machine
/// </summary>
public class CreateMachineDto
{
    [Required(ErrorMessage = "Machine name is required")]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    [Required(ErrorMessage = "Tenant ID is required")]
    public int TenantId { get; set; }

    /// <summary>
    /// Initial status: Active, Inactive, UnderMaintenance
    /// </summary>
    [MaxLength(50)]
    public string Status { get; set; } = "Active";
}

