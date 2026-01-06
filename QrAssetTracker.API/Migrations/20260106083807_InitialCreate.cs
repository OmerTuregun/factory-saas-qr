using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QrAssetTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContactPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Machines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    QrCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Location = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Machines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Machines_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IssueType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ReportedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Resolution = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MachineId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceLogs_Machines_MachineId",
                        column: x => x.MachineId,
                        principalTable: "Machines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Tenants",
                columns: new[] { "Id", "CompanyName", "ContactEmail", "ContactPhone", "CreatedAt", "IsActive", "UpdatedAt" },
                values: new object[] { 1, "Demo Fabrika A.Ş.", "info@demofabrika.com", "+90 555 123 4567", new DateTime(2026, 1, 6, 8, 38, 5, 562, DateTimeKind.Utc).AddTicks(914), true, null });

            migrationBuilder.InsertData(
                table: "Machines",
                columns: new[] { "Id", "CreatedAt", "Description", "Location", "Name", "QrCode", "Status", "TenantId", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 6, 8, 38, 5, 562, DateTimeKind.Utc).AddTicks(1109), "Ana üretim hattı CNC torna", "Üretim Hattı A", "CNC Torna Makinesi #1", "QR-MACHINE-001", "Active", 1, null },
                    { 2, new DateTime(2026, 1, 6, 8, 38, 5, 562, DateTimeKind.Utc).AddTicks(1112), "Hidrolik pres makinesi", "Üretim Hattı B", "Pres Makinesi #3", "QR-MACHINE-002", "Active", 1, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Machines_QrCode",
                table: "Machines",
                column: "QrCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Machines_TenantId",
                table: "Machines",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceLogs_MachineId",
                table: "MaintenanceLogs",
                column: "MachineId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceLogs_ReportedAt",
                table: "MaintenanceLogs",
                column: "ReportedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_CompanyName",
                table: "Tenants",
                column: "CompanyName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaintenanceLogs");

            migrationBuilder.DropTable(
                name: "Machines");

            migrationBuilder.DropTable(
                name: "Tenants");
        }
    }
}
