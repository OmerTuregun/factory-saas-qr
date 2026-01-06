using Microsoft.EntityFrameworkCore;
using QrAssetTracker.API.Models;

namespace QrAssetTracker.API.Data;

/// <summary>
/// Application Database Context for Entity Framework Core
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // DbSets for entities
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<Machine> Machines { get; set; }
    public DbSet<MaintenanceLog> MaintenanceLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Tenant entity
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CompanyName);
            entity.Property(e => e.CompanyName).IsRequired();
        });

        // Configure Machine entity
        modelBuilder.Entity<Machine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.QrCode).IsUnique(); // QR Code must be unique
            entity.HasIndex(e => e.TenantId);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.QrCode).IsRequired();

            // Configure relationship: Machine belongs to Tenant
            entity.HasOne(m => m.Tenant)
                  .WithMany(t => t.Machines)
                  .HasForeignKey(m => m.TenantId)
                  .OnDelete(DeleteBehavior.Cascade); // If Tenant deleted, delete its Machines
        });

        // Configure MaintenanceLog entity
        modelBuilder.Entity<MaintenanceLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MachineId);
            entity.HasIndex(e => e.ReportedAt);
            entity.Property(e => e.Description).IsRequired();

            // Configure relationship: MaintenanceLog belongs to Machine
            entity.HasOne(ml => ml.Machine)
                  .WithMany(m => m.MaintenanceLogs)
                  .HasForeignKey(ml => ml.MachineId)
                  .OnDelete(DeleteBehavior.Cascade); // If Machine deleted, delete its Logs
        });

        // Seed some initial data (optional)
        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Seed a default tenant for testing
        modelBuilder.Entity<Tenant>().HasData(
            new Tenant
            {
                Id = 1,
                CompanyName = "Demo Fabrika A.Ş.",
                ContactEmail = "info@demofabrika.com",
                ContactPhone = "+90 555 123 4567",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        );

        // Seed some machines for testing
        modelBuilder.Entity<Machine>().HasData(
            new Machine
            {
                Id = 1,
                Name = "CNC Torna Makinesi #1",
                Description = "Ana üretim hattı CNC torna",
                QrCode = "QR-MACHINE-001",
                Status = "Active",
                Location = "Üretim Hattı A",
                TenantId = 1,
                CreatedAt = DateTime.UtcNow
            },
            new Machine
            {
                Id = 2,
                Name = "Pres Makinesi #3",
                Description = "Hidrolik pres makinesi",
                QrCode = "QR-MACHINE-002",
                Status = "Active",
                Location = "Üretim Hattı B",
                TenantId = 1,
                CreatedAt = DateTime.UtcNow
            }
        );
    }
}

