using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDataQualityAcceptedIssues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DataQualityAcceptedIssues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CheckKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    Issue = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AcceptedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    AcceptedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataQualityAcceptedIssues", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityAcceptedIssues_CheckKey_AcceptedAtUtc",
                table: "DataQualityAcceptedIssues",
                columns: new[] { "CheckKey", "AcceptedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DataQualityAcceptedIssues_CheckKey_EntityType_EntityId_Issue",
                table: "DataQualityAcceptedIssues",
                columns: new[] { "CheckKey", "EntityType", "EntityId", "Issue" },
                unique: true,
                filter: "[EntityId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DataQualityAcceptedIssues");
        }
    }
}
