using System.ComponentModel.DataAnnotations;

namespace QrAssetTracker.API.DTOs;

/// <summary>
/// DTO for creating a maintenance/fault report
/// Worker only knows QR Code, not Machine ID
/// </summary>
public class CreateMaintenanceLogDto
{
    [Required(ErrorMessage = "QR Code is required")]
    [MaxLength(100)]
    public string QrCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required")]
    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? IssueType { get; set; }

    /// <summary>
    /// Priority: Low, Medium, High, Critical
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    [MaxLength(100)]
    public string? ReportedBy { get; set; }
}

