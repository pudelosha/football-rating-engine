using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentRatingSetup2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RatingIncludeForm",
                table: "Tournaments",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "RatingIncludePerformance",
                table: "Tournaments",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "RatingIncludeSquad",
                table: "Tournaments",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "RatingSnapshotStartSeasonOffset",
                table: "Tournaments",
                type: "int",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RatingIncludeForm",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "RatingIncludePerformance",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "RatingIncludeSquad",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "RatingSnapshotStartSeasonOffset",
                table: "Tournaments");

        }
    }
}
