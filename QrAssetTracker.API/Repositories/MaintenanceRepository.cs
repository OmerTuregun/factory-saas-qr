using Microsoft.EntityFrameworkCore;
using QrAssetTracker.API.Data;
using QrAssetTracker.API.Models;

namespace QrAssetTracker.API.Repositories;

/// <summary>
/// Maintenance Log Repository Implementation
/// </summary>
public class MaintenanceRepository : IMaintenanceRepository
{
    private readonly AppDbContext _context;

    public MaintenanceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaintenanceLog>> GetAllByMachineIdAsync(int machineId)
    {
        return await _context.MaintenanceLogs
            .Include(ml => ml.Machine)
            .Where(ml => ml.MachineId == machineId)
            .OrderByDescending(ml => ml.ReportedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<MaintenanceLog>> GetAllByTenantIdAsync(int tenantId)
    {
        return await _context.MaintenanceLogs
            .Include(ml => ml.Machine)
            .ThenInclude(m => m.Tenant)
            .Where(ml => ml.Machine.TenantId == tenantId)
            .OrderByDescending(ml => ml.ReportedAt)
            .ToListAsync();
    }

    public async Task<MaintenanceLog?> GetByIdAsync(int id)
    {
        return await _context.MaintenanceLogs
            .Include(ml => ml.Machine)
            .FirstOrDefaultAsync(ml => ml.Id == id);
    }

    public async Task<MaintenanceLog> CreateAsync(MaintenanceLog log)
    {
        log.ReportedAt = DateTime.UtcNow;
        _context.MaintenanceLogs.Add(log);
        await _context.SaveChangesAsync();
        return log;
    }

    public async Task<MaintenanceLog?> UpdateAsync(MaintenanceLog log)
    {
        var existingLog = await _context.MaintenanceLogs.FindAsync(log.Id);
        if (existingLog == null)
            return null;

        existingLog.Description = log.Description;
        existingLog.IssueType = log.IssueType;
        existingLog.Priority = log.Priority;
        existingLog.Status = log.Status;
        existingLog.Resolution = log.Resolution;
        existingLog.ResolvedAt = log.ResolvedAt;

        await _context.SaveChangesAsync();
        return existingLog;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var log = await _context.MaintenanceLogs.FindAsync(id);
        if (log == null)
            return false;

        _context.MaintenanceLogs.Remove(log);
        await _context.SaveChangesAsync();
        return true;
    }
}

