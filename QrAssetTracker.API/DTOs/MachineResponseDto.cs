namespace QrAssetTracker.API.DTOs;

/// <summary>
/// Response DTO for Machine entity
/// </summary>
public class MachineResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string QrCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Location { get; set; }
    public int TenantId { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int MaintenanceLogCount { get; set; }
}

