namespace FootballResults.Api.Model.Entities;

public sealed class RatingConfiguration
{
    public int Id { get; set; }
    public string Key { get; set; } = "default";
    public decimal BaseEloWeight { get; set; } = 70;
    public decimal FormWeight { get; set; } = 10;
    public decimal PerformanceWeight { get; set; } = 10;
    public decimal SquadQualityWeight { get; set; } = 10;
    public decimal LeagueStrengthWeight { get; set; }
    public decimal UncertaintyPenaltyWeight { get; set; }
    public decimal BaseRating { get; set; } = 1500;
    public decimal PromotedBaselineRating { get; set; } = 1400;
    public decimal KFactor { get; set; } = 20;
    public decimal HomeAdvantage { get; set; } = 50;
    public int BootstrapSeasonCount { get; set; } = 3;
    public int FormMatchCount { get; set; } = 5;
    public decimal FormScale { get; set; } = 100;
    public decimal FormMaxAdjustment { get; set; } = 35;
    public int PerformanceMatchCount { get; set; } = 5;
    public decimal PerformanceScale { get; set; } = 45;
    public decimal PerformanceMaxAdjustment { get; set; } = 45;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
