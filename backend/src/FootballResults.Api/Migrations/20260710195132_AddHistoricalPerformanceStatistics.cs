using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHistoricalPerformanceStatistics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "HistoricalMatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HistoricalMatchStatistics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HistoricalMatchId = table.Column<int>(type: "int", nullable: false),
                    LiveScoreEventId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    FetchedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    HomeExpectedGoals = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: true),
                    AwayExpectedGoals = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: true),
                    HomeShotsOnTarget = table.Column<int>(type: "int", nullable: true),
                    AwayShotsOnTarget = table.Column<int>(type: "int", nullable: true),
                    HomeShotsOffTarget = table.Column<int>(type: "int", nullable: true),
                    AwayShotsOffTarget = table.Column<int>(type: "int", nullable: true),
                    HomeBlockedShots = table.Column<int>(type: "int", nullable: true),
                    AwayBlockedShots = table.Column<int>(type: "int", nullable: true),
                    HomePossession = table.Column<int>(type: "int", nullable: true),
                    AwayPossession = table.Column<int>(type: "int", nullable: true),
                    HomeCorners = table.Column<int>(type: "int", nullable: true),
                    AwayCorners = table.Column<int>(type: "int", nullable: true),
                    HomeFouls = table.Column<int>(type: "int", nullable: true),
                    AwayFouls = table.Column<int>(type: "int", nullable: true),
                    HomeThrowIns = table.Column<int>(type: "int", nullable: true),
                    AwayThrowIns = table.Column<int>(type: "int", nullable: true),
                    HomeCrosses = table.Column<int>(type: "int", nullable: true),
                    AwayCrosses = table.Column<int>(type: "int", nullable: true),
                    HomeGoalkeeperSaves = table.Column<int>(type: "int", nullable: true),
                    AwayGoalkeeperSaves = table.Column<int>(type: "int", nullable: true),
                    HomeGoalKicks = table.Column<int>(type: "int", nullable: true),
                    AwayGoalKicks = table.Column<int>(type: "int", nullable: true),
                    HomeOffsides = table.Column<int>(type: "int", nullable: true),
                    AwayOffsides = table.Column<int>(type: "int", nullable: true),
                    HomeYellowCards = table.Column<int>(type: "int", nullable: true),
                    AwayYellowCards = table.Column<int>(type: "int", nullable: true),
                    HomeRedCards = table.Column<int>(type: "int", nullable: true),
                    AwayRedCards = table.Column<int>(type: "int", nullable: true),
                    HomeYellowRedCards = table.Column<int>(type: "int", nullable: true),
                    AwayYellowRedCards = table.Column<int>(type: "int", nullable: true),
                    HomeCounterAttacks = table.Column<int>(type: "int", nullable: true),
                    AwayCounterAttacks = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistoricalMatchStatistics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HistoricalMatchStatistics_HistoricalMatches_HistoricalMatchId",
                        column: x => x.HistoricalMatchId,
                        principalTable: "HistoricalMatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeamPerformanceMatchSnapshots_HistoricalMatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots",
                column: "HistoricalMatchStatisticsId");

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatchStatistics_HistoricalMatchId",
                table: "HistoricalMatchStatistics",
                column: "HistoricalMatchId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalMatchStatistics_LiveScoreEventId",
                table: "HistoricalMatchStatistics",
                column: "LiveScoreEventId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TeamPerformanceMatchSnapshots_HistoricalMatchStatistics_HistoricalMatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots",
                column: "HistoricalMatchStatisticsId",
                principalTable: "HistoricalMatchStatistics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeamPerformanceMatchSnapshots_HistoricalMatchStatistics_HistoricalMatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots");

            migrationBuilder.DropTable(
                name: "HistoricalMatchStatistics");

            migrationBuilder.DropIndex(
                name: "IX_TeamPerformanceMatchSnapshots_HistoricalMatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots");

            migrationBuilder.DropColumn(
                name: "HistoricalMatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots");

            migrationBuilder.AlterColumn<int>(
                name: "MatchStatisticsId",
                table: "TeamPerformanceMatchSnapshots",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
