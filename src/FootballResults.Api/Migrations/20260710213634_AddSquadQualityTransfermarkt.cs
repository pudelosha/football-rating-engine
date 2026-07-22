using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSquadQualityTransfermarkt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExternalTeamMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ExternalTeamId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ExternalSlug = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalTeamMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalTeamMappings_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SquadQualitySnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    ExternalTeamMappingId = table.Column<int>(type: "int", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ExternalTeamId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ExternalSlug = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Season = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    FetchedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ClubName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LeagueName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LeagueLevel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    InLeagueSince = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    StadiumName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StadiumCapacity = table.Column<int>(type: "int", nullable: true),
                    TransferRecordText = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    TransferRecordValueEur = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    SquadSize = table.Column<int>(type: "int", nullable: true),
                    AverageAge = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    ForeignersCount = table.Column<int>(type: "int", nullable: true),
                    ForeignersPercentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    NationalTeamPlayers = table.Column<int>(type: "int", nullable: true),
                    TotalMarketValueEur = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    AverageMarketValueEur = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    TopElevenMarketValueEur = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    TopFifteenMarketValueEur = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    PlayerCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SquadQualitySnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SquadQualitySnapshots_ExternalTeamMappings_ExternalTeamMappingId",
                        column: x => x.ExternalTeamMappingId,
                        principalTable: "ExternalTeamMappings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SquadQualitySnapshots_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SquadPlayerSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SquadQualitySnapshotId = table.Column<int>(type: "int", nullable: false),
                    ExternalPlayerId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PlayerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Position = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ShirtNumber = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: true),
                    Age = table.Column<int>(type: "int", nullable: true),
                    Nationalities = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    MarketValueText = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    MarketValueEur = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SquadPlayerSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SquadPlayerSnapshots_SquadQualitySnapshots_SquadQualitySnapshotId",
                        column: x => x.SquadQualitySnapshotId,
                        principalTable: "SquadQualitySnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExternalTeamMappings_Provider_ExternalTeamId",
                table: "ExternalTeamMappings",
                columns: new[] { "Provider", "ExternalTeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalTeamMappings_TeamId_Provider",
                table: "ExternalTeamMappings",
                columns: new[] { "TeamId", "Provider" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SquadPlayerSnapshots_SquadQualitySnapshotId_ExternalPlayerId",
                table: "SquadPlayerSnapshots",
                columns: new[] { "SquadQualitySnapshotId", "ExternalPlayerId" });

            migrationBuilder.CreateIndex(
                name: "IX_SquadQualitySnapshots_ExternalTeamMappingId_FetchedAtUtc",
                table: "SquadQualitySnapshots",
                columns: new[] { "ExternalTeamMappingId", "FetchedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SquadQualitySnapshots_TeamId_Provider_FetchedAtUtc",
                table: "SquadQualitySnapshots",
                columns: new[] { "TeamId", "Provider", "FetchedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SquadPlayerSnapshots");

            migrationBuilder.DropTable(
                name: "SquadQualitySnapshots");

            migrationBuilder.DropTable(
                name: "ExternalTeamMappings");
        }
    }
}
