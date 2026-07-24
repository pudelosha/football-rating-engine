using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailedSquadQualityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ValueWeightedAverageAge",
                table: "SquadQualitySnapshots",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValueWeightedContractYears",
                table: "SquadQualitySnapshots",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ContractUntil",
                table: "SquadPlayerSnapshots",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Foot",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "HeightCm",
                table: "SquadPlayerSnapshots",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "JoinedDate",
                table: "SquadPlayerSnapshots",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PositionGroup",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProfileUrl",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SignedFromClubName",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SignedFromExternalClubId",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SignedFromSeasonId",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TransferFeeEur",
                table: "SquadPlayerSnapshots",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransferFeeText",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TransferMovementText",
                table: "SquadPlayerSnapshots",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValueWeightedAverageAge",
                table: "SquadQualitySnapshots");

            migrationBuilder.DropColumn(
                name: "ValueWeightedContractYears",
                table: "SquadQualitySnapshots");

            migrationBuilder.DropColumn(
                name: "ContractUntil",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "Foot",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "HeightCm",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "JoinedDate",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "PositionGroup",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "ProfileUrl",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "SignedFromClubName",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "SignedFromExternalClubId",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "SignedFromSeasonId",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "TransferFeeEur",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "TransferFeeText",
                table: "SquadPlayerSnapshots");

            migrationBuilder.DropColumn(
                name: "TransferMovementText",
                table: "SquadPlayerSnapshots");
        }
    }
}
