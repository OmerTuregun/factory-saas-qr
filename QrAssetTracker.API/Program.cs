using Microsoft.EntityFrameworkCore;
using QrAssetTracker.API.Data;
using QrAssetTracker.API.Repositories;
using QrAssetTracker.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add PostgreSQL Database Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=QrAssetDb;Username=admin;Password=password123";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register Repositories (Scoped lifetime - per request)
builder.Services.AddScoped<IMachineRepository, MachineRepository>();
builder.Services.AddScoped<IMaintenanceRepository, MaintenanceRepository>();

// Register Services (Scoped lifetime - per request)
builder.Services.AddScoped<IMachineService, MachineService>();
builder.Services.AddScoped<IMaintenanceService, MaintenanceService>();

// Add Controllers
builder.Services.AddControllers();

// Add Swagger/OpenAPI for development
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Version = "v1",
        Title = "QR Asset Tracker API",
        Description = "QR Kod Tabanlı Fabrika Varlık ve Arıza Takip Sistemi API",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "Support",
            Email = "support@qrassettracker.com"
        }
    });
});

// Add CORS policy for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "QR Asset Tracker API v1");
        options.RoutePrefix = string.Empty; // Set Swagger UI at the app's root (http://localhost:port/)
    });
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();

// Otomatik Migration - Docker başlatıldığında veritabanını hazırla
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Veritabanını oluşturur ve bekleyen migrationları uygular
        context.Database.Migrate();
        Console.WriteLine("--> Veritabanı migrationları başarıyla uygulandı.");
    }
    catch (Exception ex)
    {
        Console.WriteLine("--> Veritabanı migration hatası: " + ex.Message);
    }
}

app.Run();
