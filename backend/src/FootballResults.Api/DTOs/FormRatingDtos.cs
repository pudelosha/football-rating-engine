using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record RebuildFormRatingRequest(
    int MatchCount = 5,
    decimal Scale = 100,
    decimal MaxAdjustment = 35);

public sealed record RebuildFormRatingResponse(
    int RunId,
    int TournamentId,
    int EloRatingRunId,
    EloRatingRunStatus Status,
    int ProcessedTeams,
    string ErrorMessage);

public sealed record FormRatingRunDto(
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

public sealed record TeamFormRatingDto(
    int TeamId,
    string TeamName,
    string TeamAbbreviation,
    decimal BaseElo,
    decimal FormAdjustment,
    decimal FormRating,
    int MatchCount,
    decimal WeightedActual,
    decimal WeightedExpected,
    decimal WeightedDelta,
    decimal AverageDelta,
    DateTimeOffset? LastMatchUtc);

public sealed record TeamFormMatchSnapshotDto(
    int Id,
    int RunId,
    int TeamId,
    string TeamName,
    int OpponentTeamId,
    string OpponentTeamName,
    string LiveScoreEventId,
    DateTimeOffset KickoffUtc,
    bool IsHome,
    decimal Actual,
    decimal Expected,
    decimal Delta,
    decimal Weight,
    decimal WeightedDelta);
