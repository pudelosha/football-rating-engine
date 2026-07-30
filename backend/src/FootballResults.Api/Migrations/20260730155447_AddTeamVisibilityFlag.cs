using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamVisibilityFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEnabled",
                table: "Teams",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.Sql("UPDATE Teams SET IsEnabled = 1 WHERE IsEnabled = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsEnabled",
                table: "Teams");
        }
    }
}
