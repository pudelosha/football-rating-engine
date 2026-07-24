namespace FootballResults.Api.Model.Entities;

public sealed class MatchEloSnapshot
{
    public int Id { get; set; }
    public int EloRatingRunId { get; set; }
    public int HistoricalMatchId { get; set; }
    public string LiveScoreEventId { get; set; } = string.Empty;
    public DateTimeOffset KickoffUtc { get; set; }
    public int HomeTeamId { get; set; }
    public int AwayTeamId { get; set; }
    public decimal HomeEloBefore { get; set; }
    public decimal AwayEloBefore { get; set; }
    public decimal HomeEloAfter { get; set; }
    public decimal AwayEloAfter { get; set; }
    public decimal HomeExpected { get; set; }
    public decimal AwayExpected { get; set; }
    public decimal HomeActual { get; set; }
    public decimal AwayActual { get; set; }
    public decimal HomeEloChange { get; set; }
    public decimal AwayEloChange { get; set; }
    public decimal KFactor { get; set; }
    public decimal HomeAdvantageApplied { get; set; }
    public decimal GoalDifferenceMultiplier { get; set; }

    public EloRatingRun EloRatingRun { get; set; } = null!;
    public HistoricalMatch HistoricalMatch { get; set; } = null!;
    public Team HomeTeam { get; set; } = null!;
    public Team AwayTeam { get; set; } = null!;
}
