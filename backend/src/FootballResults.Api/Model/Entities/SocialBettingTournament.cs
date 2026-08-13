namespace FootballResults.Api.Model.Entities;

public sealed class SocialBettingTournament
{
    public int Id { get; set; }
    public int SourceTournamentId { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool AllowExactScoreBonus { get; set; }
    public SocialBettingExactScoreBonusMode ExactScoreBonusMode { get; set; } = SocialBettingExactScoreBonusMode.FixedValue;
    public decimal ExactScoreBonusValue { get; set; } = 5m;
    public decimal ExactScoreOddsMultiplier { get; set; } = 1.5m;
    public bool AllowQualificationPick { get; set; }
    public bool ApplyMissingBetPenalty { get; set; }
    public decimal MissingBetPenalty { get; set; } = -1m;
    public SocialBettingPoolMode PoolMode { get; set; } = SocialBettingPoolMode.FixedBaseAmount;
    public decimal BaseBetAmount { get; set; } = 1m;
    public decimal StartingCredits { get; set; } = 100m;
    public decimal MaxBetPerGame { get; set; } = 10m;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public Tournament SourceTournament { get; set; } = null!;
    public ApplicationUser CreatedByUser { get; set; } = null!;
    public List<SocialBettingParticipant> Participants { get; set; } = [];
}
