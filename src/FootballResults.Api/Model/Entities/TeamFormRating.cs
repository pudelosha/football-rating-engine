namespace FootballResults.Api.Model.Entities;

public sealed class TeamFormRating
{
    public int Id { get; set; }
    public int FormRatingRunId { get; set; }
    public int TeamId { get; set; }
    public int MatchCount { get; set; }
    public decimal WeightedActual { get; set; }
    public decimal WeightedExpected { get; set; }
    public decimal WeightedDelta { get; set; }
    public decimal AverageDelta { get; set; }
    public decimal FormAdjustment { get; set; }
    public DateTimeOffset? LastMatchUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public FormRatingRun FormRatingRun { get; set; } = null!;
    public Team Team { get; set; } = null!;
}
