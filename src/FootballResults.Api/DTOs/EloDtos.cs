using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record RebuildBaseEloRequest(
    decimal BaseRating = 1500,
    decimal PromotedBaselineRating = 1450,
    decimal KFactor = 20,
    decimal HomeAdvantage = 55,
    int BootstrapSeasonCount = 3,
    string Scope = "PremierLeague");

public sealed record RebuildBaseEloResponse(
    int RunId,
    int TournamentId,
    EloRatingRunStatus Status,
    int ImportedHistoricalMatches,
    int ProcessedMatches,
    string ErrorMessage);

public sealed record EloRatingRunDto(
    int Id,
    int TournamentId,
    string Name,
    string Scope,
    decimal BaseRating,
    decimal PromotedBaselineRating,
    decimal KFactor,
    decimal HomeAdvantage,
    int BootstrapSeasonCount,
    EloRatingRunStatus Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? FinishedAtUtc,
    int ImportedHistoricalMatches,
    int ProcessedMatches,
    string ErrorMessage);

public sealed record TeamEloRatingDto(
    int TeamId,
    string TeamName,
    string TeamAbbreviation,
    decimal Rating,
    int MatchesPlayed,
    DateTimeOffset? LastMatchUtc);

public sealed record MatchEloSnapshotDto(
    int Id,
    int RunId,
    string LiveScoreEventId,
    DateTimeOffset KickoffUtc,
    int HomeTeamId,
    string HomeTeamName,
    int AwayTeamId,
    string AwayTeamName,
    decimal HomeEloBefore,
    decimal AwayEloBefore,
    decimal HomeEloAfter,
    decimal AwayEloAfter,
    decimal HomeExpected,
    decimal AwayExpected,
    decimal HomeActual,
    decimal AwayActual,
    decimal HomeEloChange,
    decimal AwayEloChange,
    decimal GoalDifferenceMultiplier);
