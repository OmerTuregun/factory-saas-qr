using Microsoft.EntityFrameworkCore;
using QrAssetTracker.API.Data;
using QrAssetTracker.API.Models;

namespace QrAssetTracker.API.Repositories;

/// <summary>
/// Machine Repository Implementation
/// </summary>
public class MachineRepository : IMachineRepository
{
    private readonly AppDbContext _context;

    public MachineRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Machine>> GetAllByTenantIdAsync(int tenantId)
    {
        return await _context.Machines
            .Include(m => m.Tenant)
            .Include(m => m.MaintenanceLogs)
            .Where(m => m.TenantId == tenantId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<Machine?> GetByIdAsync(int id)
    {
        return await _context.Machines
            .Include(m => m.Tenant)
            .Include(m => m.MaintenanceLogs)
            .FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<Machine?> GetByQrCodeAsync(string qrCode)
    {
        return await _context.Machines
            .Include(m => m.Tenant)
            .Include(m => m.MaintenanceLogs)
            .FirstOrDefaultAsync(m => m.QrCode == qrCode);
    }

    public async Task<Machine> CreateAsync(Machine machine)
    {
        machine.CreatedAt = DateTime.UtcNow;
        _context.Machines.Add(machine);
        await _context.SaveChangesAsync();
        return machine;
    }

    public async Task<Machine?> UpdateAsync(Machine machine)
    {
        var existingMachine = await _context.Machines.FindAsync(machine.Id);
        if (existingMachine == null)
            return null;

        existingMachine.Name = machine.Name;
        existingMachine.Description = machine.Description;
        existingMachine.Status = machine.Status;
        existingMachine.Location = machine.Location;
        existingMachine.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existingMachine;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var machine = await _context.Machines.FindAsync(id);
        if (machine == null)
            return false;

        _context.Machines.Remove(machine);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> QrCodeExistsAsync(string qrCode)
    {
        return await _context.Machines.AnyAsync(m => m.QrCode == qrCode);
    }
}

