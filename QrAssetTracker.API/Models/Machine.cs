using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QrAssetTracker.API.Models;

/// <summary>
/// Represents a machine/asset in the factory
/// </summary>
public class Machine
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(100)]
    public string QrCode { get; set; } = string.Empty; // Unique QR code string

    /// <summary>
    /// Machine status: Active, Inactive, UnderMaintenance, Broken
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Active";

    [MaxLength(100)]
    public string? Location { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Foreign Key
    [Required]
    public int TenantId { get; set; }

    // Navigation Property
    [ForeignKey(nameof(TenantId))]
    public Tenant Tenant { get; set; } = null!;

    // Navigation Property: One Machine has many Maintenance Logs
    public ICollection<MaintenanceLog> MaintenanceLogs { get; set; } = new List<MaintenanceLog>();
}

