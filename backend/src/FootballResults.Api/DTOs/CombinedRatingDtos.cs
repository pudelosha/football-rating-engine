namespace FootballResults.Api.DTOs;

public sealed record CombinedRatingRunContextDto(
    int? BaseEloRunId,
    int? FormRatingRunId,
    int? PerformanceRatingRunId,
    int? SnapshotStartSeasonOffset,
    string CurrentRoundInfo,
    string SelectedCurrentRoundInfo,
    string PreviousRoundInfo,
    string CompareRoundInfo,
    IReadOnlyList<string> AvailableRoundInfos,
    DateTimeOffset? SelectedCurrentRoundCutoffUtc,
    bool IsSelectedCurrentRoundCoveredByRatings,
    bool IsCompareRoundCoveredByRatings,
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
    decimal? PreviousFinalRating,
    decimal? FinalRatingChange,
    decimal RatingConfidence,
    bool HasFormRating,
    bool HasPerformanceRating,
    bool HasSquadQualityRating,
    int BaseEloMatchesPlayed,
    int FormMatchesPlayed,
    int PerformanceMatchesPlayed,
    int SquadPlayerCount,
    decimal FormWeightedActual,
    decimal FormWeightedExpected,
    decimal FormWeightedDelta,
    decimal FormAverageDelta,
    decimal PerformanceDataCoverage,
    decimal PerformanceRawScore,
    DateTimeOffset? LastBaseEloMatchUtc,
    DateTimeOffset? LastFormMatchUtc,
    DateTimeOffset? LastPerformanceMatchUtc,
    DateTimeOffset? SquadSnapshotFetchedAtUtc);

public sealed record CombinedTeamRatingsDto(
    int TournamentId,
    CombinedRatingRunContextDto RunContext,
    IReadOnlyList<TeamCombinedRatingDto> Teams);
