namespace FootballResults.Api.DTOs;

public sealed record CombinedRatingRunContextDto(
    int? BaseEloRunId,
    int? FormRatingRunId,
    int? PerformanceRatingRunId,
    DateTimeOffset CalculatedAtUtc);

public sealed record TeamCombinedRatingDto(
    int TeamId,
    string TeamName,
    string TeamAbbreviation,
    decimal BaseElo,
    decimal FormAdjustment,
    decimal PerformanceAdjustment,
    decimal SquadQualityAdjustment,
    decimal TotalAdjustment,
    decimal FinalRating,
    decimal RatingConfidence,
    bool HasFormRating,
    bool HasPerformanceRating,
    bool HasSquadQualityRating,
    int BaseEloMatchesPlayed,
    int FormMatchesPlayed,
    int PerformanceMatchesPlayed,
    int SquadPlayerCount,
    DateTimeOffset? LastBaseEloMatchUtc,
    DateTimeOffset? LastFormMatchUtc,
    DateTimeOffset? LastPerformanceMatchUtc,
    DateTimeOffset? SquadSnapshotFetchedAtUtc);

public sealed record CombinedTeamRatingsDto(
    int TournamentId,
    CombinedRatingRunContextDto RunContext,
    IReadOnlyList<TeamCombinedRatingDto> Teams);
