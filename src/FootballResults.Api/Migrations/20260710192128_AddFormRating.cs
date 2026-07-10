using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFormRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FormRatingRuns",
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
                    table.PrimaryKey("PK_FormRatingRuns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormRatingRuns_EloRatingRuns_EloRatingRunId",
                        column: x => x.EloRatingRunId,
                        principalTable: "EloRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FormRatingRuns_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeamFormMatchSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormRatingRunId = table.Column<int>(type: "int", nullable: false),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    OpponentTeamId = table.Column<int>(type: "int", nullable: false),
                    MatchEloSnapshotId = table.Column<int>(type: "int", nullable: false),
                    LiveScoreEventId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    KickoffUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsHome = table.Column<bool>(type: "bit", nullable: false),
                    Actual = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    Expected = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    Delta = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    WeightedDelta = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamFormMatchSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamFormMatchSnapshots_FormRatingRuns_FormRatingRunId",
                        column: x => x.FormRatingRunId,
                        principalTable: "FormRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamFormMatchSnapshots_MatchEloSnapshots_MatchEloSnapshotId",
                        column: x => x.MatchEloSnapshotId,
                        principalTable: "MatchEloSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamFormMatchSnapshots_Teams_OpponentTeamId",
                        column: x => x.OpponentTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamFormMatchSnapshots_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TeamFormRatings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormRatingRunId = table.Column<int>(type: "int", nullable: false),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    MatchCount = table.Column<int>(type: "int", nullable: false),
                    WeightedActual = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    WeightedExpected = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    WeightedDelta = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    AverageDelta = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    FormAdjustment = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    LastMatchUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamFormRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamFormRatings_FormRatingRuns_FormRatingRunId",
                        column: x => x.FormRatingRunId,
                        principalTable: "FormRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamFormRatings_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FormRatingRuns_EloRatingRunId",
                table: "FormRatingRuns",
                column: "EloRatingRunId");

            migrationBuilder.CreateIndex(
                name: "IX_FormRatingRuns_TournamentId_StartedAtUtc",
                table: "FormRatingRuns",
                columns: new[] { "TournamentId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormMatchSnapshots_FormRatingRunId_MatchEloSnapshotId_TeamId",
                table: "TeamFormMatchSnapshots",
                columns: new[] { "FormRatingRunId", "MatchEloSnapshotId", "TeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormMatchSnapshots_FormRatingRunId_TeamId_KickoffUtc",
                table: "TeamFormMatchSnapshots",
                columns: new[] { "FormRatingRunId", "TeamId", "KickoffUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormMatchSnapshots_MatchEloSnapshotId",
                table: "TeamFormMatchSnapshots",
                column: "MatchEloSnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormMatchSnapshots_OpponentTeamId",
                table: "TeamFormMatchSnapshots",
                column: "OpponentTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormMatchSnapshots_TeamId",
                table: "TeamFormMatchSnapshots",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormRatings_FormRatingRunId_TeamId",
                table: "TeamFormRatings",
                columns: new[] { "FormRatingRunId", "TeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamFormRatings_TeamId",
                table: "TeamFormRatings",
                column: "TeamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeamFormMatchSnapshots");

            migrationBuilder.DropTable(
                name: "TeamFormRatings");

            migrationBuilder.DropTable(
                name: "FormRatingRuns");
        }
    }
}
