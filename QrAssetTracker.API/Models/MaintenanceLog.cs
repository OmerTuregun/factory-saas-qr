using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QrAssetTracker.API.Models;

/// <summary>
/// Represents a maintenance/fault report for a machine
/// </summary>
public class MaintenanceLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Fault/Issue type: Mechanical, Electrical, Software, Other
    /// </summary>
    [MaxLength(50)]
    public string? IssueType { get; set; }

    /// <summary>
    /// Priority: Low, Medium, High, Critical
    /// </summary>
    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    /// <summary>
    /// Status: Reported, InProgress, Resolved, Closed
    /// </summary>
    [MaxLength(50)]
    public string Status { get; set; } = "Reported";

    [MaxLength(100)]
    public string? ReportedBy { get; set; } // Worker name or ID

    public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }

    [MaxLength(1000)]
    public string? Resolution { get; set; }

    // Foreign Key
    [Required]
    public int MachineId { get; set; }

    // Navigation Property
    [ForeignKey(nameof(MachineId))]
    public Machine Machine { get; set; } = null!;
}

