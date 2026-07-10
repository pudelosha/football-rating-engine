using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBaseEloRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EloRatingRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TournamentId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    BaseRating = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    PromotedBaselineRating = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    KFactor = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    HomeAdvantage = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    BootstrapSeasonCount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    FinishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ImportedHistoricalMatches = table.Column<int>(type: "int", nullable: false),
                    ProcessedMatches = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EloRatingRuns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EloRatingRuns_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HistoricalMatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LiveScoreEventId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LiveScoreCompetitionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CompetitionName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CompetitionCountry = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SeasonName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StageName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StageCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    KickoffUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    HomeTeamId = table.Column<int>(type: "int", nullable: true),
                    AwayTeamId = table.Column<int>(type: "int", nullable: true),
                    HomeTeamLiveScoreId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AwayTeamLiveScoreId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    HomeTeamNameSnapshot = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AwayTeamNameSnapshot = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    HomeTeamAbbrSnapshot = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    AwayTeamAbbrSnapshot = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    HomeScore = table.Column<int>(type: "int", nullable: true),
                    AwayScore = table.Column<int>(type: "int", nullable: true),
                    RegularTimeHomeScore = table.Column<int>(type: "int", nullable: true),
                    RegularTimeAwayScore = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RawStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RoundInfo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SourceEndpoint = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistoricalMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HistoricalMatches_Teams_AwayTeamId",
                        column: x => x.AwayTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HistoricalMatches_Teams_HomeTeamId",
                        column: x => x.HomeTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TeamEloRatings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EloRatingRunId = table.Column<int>(type: "int", nullable: false),
                    TeamId = table.Column<int>(type: "int", nullable: false),
                    Rating = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    MatchesPlayed = table.Column<int>(type: "int", nullable: false),
                    LastMatchUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamEloRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamEloRatings_EloRatingRuns_EloRatingRunId",
                        column: x => x.EloRatingRunId,
                        principalTable: "EloRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamEloRatings_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MatchEloSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EloRatingRunId = table.Column<int>(type: "int", nullable: false),
                    HistoricalMatchId = table.Column<int>(type: "int", nullable: false),
                    LiveScoreEventId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    KickoffUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    HomeTeamId = table.Column<int>(type: "int", nullable: false),
                    AwayTeamId = table.Column<int>(type: "int", nullable: false),
                    HomeEloBefore = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    AwayEloBefore = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    HomeEloAfter = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    AwayEloAfter = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    HomeExpected = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    AwayExpected = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    HomeActual = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    AwayActual = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    HomeEloChange = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    AwayEloChange = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    KFactor = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    HomeAdvantageApplied = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    GoalDifferenceMultiplier = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchEloSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchEloSnapshots_EloRatingRuns_EloRatingRunId",
                        column: x => x.EloRatingRunId,
                        principalTable: "EloRatingRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MatchEloSnapshots_HistoricalMatches_HistoricalMatchId",
                        column: x => x.HistoricalMatchId,
                        principalTable: "HistoricalMatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MatchEloSnapshots_Teams_AwayTeamId",
                        column: x => x.AwayTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MatchEloSnapshots_Teams_HomeTeamId",
                        column: x => x.HomeTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EloRatingRuns_TournamentId_StartedAtUtc",
                table: "EloRatingRuns",
                columns: new[] { "TournamentId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatches_AwayTeamId",
                table: "HistoricalMatches",
                column: "AwayTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatches_CompetitionName_KickoffUtc",
                table: "HistoricalMatches",
                columns: new[] { "CompetitionName", "KickoffUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatches_HomeTeamId",
                table: "HistoricalMatches",
                column: "HomeTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatches_LiveScoreCompetitionId_KickoffUtc",
                table: "HistoricalMatches",
                columns: new[] { "LiveScoreCompetitionId", "KickoffUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatches_LiveScoreEventId",
                table: "HistoricalMatches",
                column: "LiveScoreEventId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_AwayTeamId",
                table: "MatchEloSnapshots",
                column: "AwayTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_EloRatingRunId_AwayTeamId",
                table: "MatchEloSnapshots",
                columns: new[] { "EloRatingRunId", "AwayTeamId" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_EloRatingRunId_HistoricalMatchId",
                table: "MatchEloSnapshots",
                columns: new[] { "EloRatingRunId", "HistoricalMatchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_EloRatingRunId_HomeTeamId",
                table: "MatchEloSnapshots",
                columns: new[] { "EloRatingRunId", "HomeTeamId" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_EloRatingRunId_KickoffUtc",
                table: "MatchEloSnapshots",
                columns: new[] { "EloRatingRunId", "KickoffUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_HistoricalMatchId",
                table: "MatchEloSnapshots",
                column: "HistoricalMatchId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchEloSnapshots_HomeTeamId",
                table: "MatchEloSnapshots",
                column: "HomeTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamEloRatings_EloRatingRunId_TeamId",
                table: "TeamEloRatings",
                columns: new[] { "EloRatingRunId", "TeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamEloRatings_TeamId",
                table: "TeamEloRatings",
                column: "TeamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchEloSnapshots");

            migrationBuilder.DropTable(
                name: "TeamEloRatings");

            migrationBuilder.DropTable(
                name: "HistoricalMatches");

            migrationBuilder.DropTable(
                name: "EloRatingRuns");
        }
    }
}
