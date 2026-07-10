using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record RebuildPerformanceRatingRequest(
    int MatchCount = 5,
    decimal Scale = 45,
    decimal MaxAdjustment = 45);

public sealed record RebuildPerformanceRatingResponse(
    int RunId,
    int TournamentId,
    int EloRatingRunId,
    EloRatingRunStatus Status,
    int ProcessedTeams,
    string ErrorMessage);

public sealed record PerformanceRatingRunDto(
    int Id,
    int TournamentId,
    int EloRatingRunId,
    int MatchCount,
    decimal Scale,
    decimal MaxAdjustment,
    EloRatingRunStatus Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? FinishedAtUtc,
    int ProcessedTeams,
    string ErrorMessage);

public sealed record TeamPerformanceRatingDto(
    int TeamId,
    string TeamName,
    string TeamAbbreviation,
    decimal BaseElo,
    decimal PerformanceAdjustment,
    decimal PerformanceRating,
    int MatchCount,
    decimal DataCoverage,
    decimal RawPerformanceScore,
    DateTimeOffset? LastMatchUtc);

public sealed record TeamPerformanceMatchSnapshotDto(
    int Id,
    int RunId,
    int TeamId,
    string TeamName,
    int OpponentTeamId,
    string OpponentTeamName,
    string LiveScoreEventId,
    DateTimeOffset KickoffUtc,
    bool IsHome,
    decimal DataCoverage,
    decimal? XgScore,
    decimal? ShotScore,
    decimal? ShotsOnTargetScore,
    decimal? ShotQualityScore,
    decimal? PossessionScore,
    decimal? TerritoryScore,
    decimal? OffsidesScore,
    decimal? FoulStressScore,
    decimal? GoalkeeperStressScore,
    decimal RawPerformanceScore,
    decimal Weight,
    decimal WeightedPerformanceScore);
