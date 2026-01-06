using System.ComponentModel.DataAnnotations;

namespace QrAssetTracker.API.DTOs;

/// <summary>
/// DTO for updating an existing Machine
/// </summary>
public class UpdateMachineDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; }
}

