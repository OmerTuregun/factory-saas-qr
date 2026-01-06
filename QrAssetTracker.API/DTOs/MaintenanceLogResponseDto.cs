namespace QrAssetTracker.API.DTOs;

/// <summary>
/// Response DTO for MaintenanceLog entity
/// </summary>
public class MaintenanceLogResponseDto
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? IssueType { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ReportedBy { get; set; }
    public DateTime ReportedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? Resolution { get; set; }
    public int MachineId { get; set; }
    public string MachineName { get; set; } = string.Empty;
    public string MachineQrCode { get; set; } = string.Empty;
}

