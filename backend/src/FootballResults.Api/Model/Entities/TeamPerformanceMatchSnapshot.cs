namespace FootballResults.Api.Model.Entities;

public sealed class TeamPerformanceMatchSnapshot
{
    public int Id { get; set; }
    public int PerformanceRatingRunId { get; set; }
    public int TeamId { get; set; }
    public int OpponentTeamId { get; set; }
    public int MatchEloSnapshotId { get; set; }
    public int? MatchStatisticsId { get; set; }
    public int? HistoricalMatchStatisticsId { get; set; }
    public string LiveScoreEventId { get; set; } = string.Empty;
    public DateTimeOffset KickoffUtc { get; set; }
    public bool IsHome { get; set; }
    public decimal DataCoverage { get; set; }
    public decimal? XgScore { get; set; }
    public decimal? ShotScore { get; set; }
    public decimal? ShotsOnTargetScore { get; set; }
    public decimal? ShotQualityScore { get; set; }
    public decimal? PossessionScore { get; set; }
    public decimal? TerritoryScore { get; set; }
    public decimal? OffsidesScore { get; set; }
    public decimal? FoulStressScore { get; set; }
    public decimal? GoalkeeperStressScore { get; set; }
    public decimal RawPerformanceScore { get; set; }
    public decimal Weight { get; set; }
    public decimal WeightedPerformanceScore { get; set; }

    public PerformanceRatingRun PerformanceRatingRun { get; set; } = null!;
    public Team Team { get; set; } = null!;
    public Team OpponentTeam { get; set; } = null!;
    public MatchEloSnapshot MatchEloSnapshot { get; set; } = null!;
    public MatchStatistics? MatchStatistics { get; set; }
    public HistoricalMatchStatistics? HistoricalMatchStatistics { get; set; }
}
