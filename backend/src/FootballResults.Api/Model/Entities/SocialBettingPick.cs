namespace FootballResults.Api.Model.Entities;

public sealed class SocialBettingPick
{
    public int Id { get; set; }
    public int SocialBettingTournamentId { get; set; }
    public int ParticipantId { get; set; }
    public int MatchId { get; set; }
    public int? HomeScorePrediction { get; set; }
    public int? AwayScorePrediction { get; set; }
    public int? QualifierTeamId { get; set; }
    public decimal Stake { get; set; } = 1m;
    public decimal? HomeOddsAtPlacement { get; set; }
    public decimal? DrawOddsAtPlacement { get; set; }
    public decimal? AwayOddsAtPlacement { get; set; }
    public decimal? PointsAwarded { get; set; }
    public DateTimeOffset PlacedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public SocialBettingTournament SocialBettingTournament { get; set; } = null!;
    public SocialBettingParticipant Participant { get; set; } = null!;
    public Match Match { get; set; } = null!;
    public Team? QualifierTeam { get; set; }
}
