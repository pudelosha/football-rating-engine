using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FootballResults.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialBettingTournaments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SocialBettingTournaments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SourceTournamentId = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    AllowExactScoreBonus = table.Column<bool>(type: "bit", nullable: false),
                    ExactScoreBonusMode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ExactScoreBonusValue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ExactScoreOddsMultiplier = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    AllowQualificationPick = table.Column<bool>(type: "bit", nullable: false),
                    ApplyMissingBetPenalty = table.Column<bool>(type: "bit", nullable: false),
                    MissingBetPenalty = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PoolMode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    BaseBetAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    StartingCredits = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    MaxBetPerGame = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialBettingTournaments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialBettingTournaments_Tournaments_SourceTournamentId",
                        column: x => x.SourceTournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SocialBettingTournaments_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SocialBettingParticipants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SocialBettingTournamentId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Nickname = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Role = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    InvitationTokenHash = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    InvitationExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    InvitedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    AcceptedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialBettingParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialBettingParticipants_SocialBettingTournaments_SocialBettingTournamentId",
                        column: x => x.SocialBettingTournamentId,
                        principalTable: "SocialBettingTournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SocialBettingParticipants_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SocialBettingPicks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SocialBettingTournamentId = table.Column<int>(type: "int", nullable: false),
                    ParticipantId = table.Column<int>(type: "int", nullable: false),
                    MatchId = table.Column<int>(type: "int", nullable: false),
                    HomeScorePrediction = table.Column<int>(type: "int", nullable: true),
                    AwayScorePrediction = table.Column<int>(type: "int", nullable: true),
                    QualifierTeamId = table.Column<int>(type: "int", nullable: true),
                    Stake = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    HomeOddsAtPlacement = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    DrawOddsAtPlacement = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    AwayOddsAtPlacement = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    PointsAwarded = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    PlacedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialBettingPicks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialBettingPicks_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SocialBettingPicks_SocialBettingParticipants_ParticipantId",
                        column: x => x.ParticipantId,
                        principalTable: "SocialBettingParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SocialBettingPicks_SocialBettingTournaments_SocialBettingTournamentId",
                        column: x => x.SocialBettingTournamentId,
                        principalTable: "SocialBettingTournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SocialBettingPicks_Teams_QualifierTeamId",
                        column: x => x.QualifierTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingParticipants_Email",
                table: "SocialBettingParticipants",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingParticipants_SocialBettingTournamentId_UserId",
                table: "SocialBettingParticipants",
                columns: new[] { "SocialBettingTournamentId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingParticipants_UserId_Status",
                table: "SocialBettingParticipants",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingPicks_MatchId",
                table: "SocialBettingPicks",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingPicks_ParticipantId_MatchId",
                table: "SocialBettingPicks",
                columns: new[] { "ParticipantId", "MatchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingPicks_QualifierTeamId",
                table: "SocialBettingPicks",
                column: "QualifierTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingPicks_SocialBettingTournamentId_MatchId",
                table: "SocialBettingPicks",
                columns: new[] { "SocialBettingTournamentId", "MatchId" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingTournaments_CreatedByUserId_CreatedAtUtc",
                table: "SocialBettingTournaments",
                columns: new[] { "CreatedByUserId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SocialBettingTournaments_SourceTournamentId",
                table: "SocialBettingTournaments",
                column: "SourceTournamentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SocialBettingPicks");

            migrationBuilder.DropTable(
                name: "SocialBettingParticipants");

            migrationBuilder.DropTable(
                name: "SocialBettingTournaments");
        }
    }
}
