namespace FootballResults.Api.Model.Entities;

public sealed class EloRatingRun
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Scope { get; set; } = "PremierLeague";
    public decimal BaseRating { get; set; }
    public decimal PromotedBaselineRating { get; set; }
    public decimal KFactor { get; set; }
    public decimal HomeAdvantage { get; set; }
    public int BootstrapSeasonCount { get; set; }
    public EloRatingRunStatus Status { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? FinishedAtUtc { get; set; }
    public int ImportedHistoricalMatches { get; set; }
    public int ProcessedMatches { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;

    public Tournament Tournament { get; set; } = null!;
    public List<TeamEloRating> TeamRatings { get; set; } = [];
    public List<MatchEloSnapshot> MatchSnapshots { get; set; } = [];
}
