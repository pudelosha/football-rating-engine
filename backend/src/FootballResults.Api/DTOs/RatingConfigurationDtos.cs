namespace FootballResults.Api.DTOs;

public sealed record RatingConfigurationDto(
    int Id,
    string Key,
    decimal BaseEloWeight,
    decimal FormWeight,
    decimal PerformanceWeight,
    decimal SquadQualityWeight,
    decimal LeagueStrengthWeight,
    decimal UncertaintyPenaltyWeight,
    decimal BaseRating,
    decimal PromotedBaselineRating,
    decimal KFactor,
    decimal HomeAdvantage,
    int BootstrapSeasonCount,
    int FormMatchCount,
    decimal FormScale,
    decimal FormMaxAdjustment,
    int PerformanceMatchCount,
    decimal PerformanceScale,
    decimal PerformanceMaxAdjustment,
    DateTimeOffset UpdatedAtUtc);

public sealed record UpdateRatingConfigurationRequest(
    decimal BaseEloWeight,
    decimal FormWeight,
    decimal PerformanceWeight,
    decimal SquadQualityWeight,
    decimal LeagueStrengthWeight,
    decimal UncertaintyPenaltyWeight,
    decimal BaseRating,
    decimal PromotedBaselineRating,
    decimal KFactor,
    decimal HomeAdvantage,
    int BootstrapSeasonCount,
    int FormMatchCount,
    decimal FormScale,
    decimal FormMaxAdjustment,
    int PerformanceMatchCount,
    decimal PerformanceScale,
    decimal PerformanceMaxAdjustment);

