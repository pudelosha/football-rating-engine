namespace FootballResults.Api.Model.Entities;

public sealed class TeamPerformanceRating
{
    public int Id { get; set; }
    public int PerformanceRatingRunId { get; set; }
    public int TeamId { get; set; }
    public int MatchCount { get; set; }
    public decimal DataCoverage { get; set; }
    public decimal RawPerformanceScore { get; set; }
    public decimal PerformanceAdjustment { get; set; }
    public DateTimeOffset? LastMatchUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public PerformanceRatingRun PerformanceRatingRun { get; set; } = null!;
    public Team Team { get; set; } = null!;
}
