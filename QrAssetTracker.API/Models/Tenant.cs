using System.ComponentModel.DataAnnotations;

namespace QrAssetTracker.API.Models;

/// <summary>
/// Represents a SaaS customer (Factory/Company)
/// </summary>
public class Tenant
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ContactEmail { get; set; }

    [MaxLength(20)]
    public string? ContactPhone { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation Property: One Tenant has many Machines
    public ICollection<Machine> Machines { get; set; } = new List<Machine>();
}

