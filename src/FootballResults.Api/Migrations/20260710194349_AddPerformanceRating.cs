using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PerformanceRatingRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TournamentId = table.Column<int>(type: "int", nullable: false),
                    EloRatingRunId = table.Column<int>(type: "int", nullable: false),
                    MatchCount = table.Column<int>(type: "int", nullable: false),
                    Scale = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    MaxAdjustment = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    FinishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ProcessedTeams = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerformanceRatingRuns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerformanceRatingRuns_EloRatingRuns_EloRatingRunId",
                        column: x => x.EloRatingRunId,
                        principalTable: "EloRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PerformanceRatingRuns_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeamPerformanceMatchSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PerformanceRatingRunId = table.Column<int>(type: "int", nullable: false),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    OpponentTeamId = table.Column<int>(type: "int", nullable: false),
                    MatchEloSnapshotId = table.Column<int>(type: "int", nullable: false),
                    MatchStatisticsId = table.Column<int>(type: "int", nullable: false),
                    LiveScoreEventId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    KickoffUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsHome = table.Column<bool>(type: "bit", nullable: false),
                    DataCoverage = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    XgScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    ShotScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    ShotsOnTargetScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    ShotQualityScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    PossessionScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    TerritoryScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    OffsidesScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    FoulStressScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    GoalkeeperStressScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: true),
                    RawPerformanceScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    WeightedPerformanceScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamPerformanceMatchSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceMatchSnapshots_MatchEloSnapshots_MatchEloSnapshotId",
                        column: x => x.MatchEloSnapshotId,
                        principalTable: "MatchEloSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceMatchSnapshots_MatchStatistics_MatchStatisticsId",
                        column: x => x.MatchStatisticsId,
                        principalTable: "MatchStatistics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceMatchSnapshots_PerformanceRatingRuns_PerformanceRatingRunId",
                        column: x => x.PerformanceRatingRunId,
                        principalTable: "PerformanceRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceMatchSnapshots_Teams_OpponentTeamId",
                        column: x => x.OpponentTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceMatchSnapshots_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TeamPerformanceRatings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PerformanceRatingRunId = table.Column<int>(type: "int", nullable: false),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    MatchCount = table.Column<int>(type: "int", nullable: false),
                    DataCoverage = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    RawPerformanceScore = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    PerformanceAdjustment = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    LastMatchUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamPerformanceRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceRatings_PerformanceRatingRuns_PerformanceRatingRunId",
                        column: x => x.PerformanceRatingRunId,
                        principalTable: "PerformanceRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamPerformanceRatings_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PerformanceRatingRuns_EloRatingRunId",
                table: "PerformanceRatingRuns",
                column: "EloRatingRunId");

            migrationBuilder.CreateIndex(
                name: "IX_PerformanceRatingRuns_TournamentId_StartedAtUtc",
                table: "PerformanceRatingRuns",
                columns: new[] { "TournamentId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_MatchEloSnapshotId",
                table: "TeamPerformanceMatchSnapshots",
                column: "MatchEloSnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_MatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots",
                column: "MatchStatisticsId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_OpponentTeamId",
                table: "TeamPerformanceMatchSnapshots",
                column: "OpponentTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_PerformanceRatingRunId_MatchEloSnapshotId_TeamId",
                table: "TeamPerformanceMatchSnapshots",
                columns: new[] { "PerformanceRatingRunId", "MatchEloSnapshotId", "TeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_PerformanceRatingRunId_TeamId_KickoffUtc",
                table: "TeamPerformanceMatchSnapshots",
                columns: new[] { "PerformanceRatingRunId", "TeamId", "KickoffUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_TeamId",
                table: "TeamPerformanceMatchSnapshots",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceRatings_PerformanceRatingRunId_TeamId",
                table: "TeamPerformanceRatings",
                columns: new[] { "PerformanceRatingRunId", "TeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceRatings_TeamId",
                table: "TeamPerformanceRatings",
                column: "TeamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeamPerformanceMatchSnapshots");

            migrationBuilder.DropTable(
                name: "TeamPerformanceRatings");

            migrationBuilder.DropTable(
                name: "PerformanceRatingRuns");
        }
    }
}
