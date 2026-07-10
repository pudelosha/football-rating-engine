using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record CreateTournamentRequest(
    string LiveScoreUrl,
    string? Name = null,
    string Locale = "en",
    string TimezoneOffset = "0");

public sealed record UpdateTournamentRequest(
    string? Name,
    string? Locale,
    string? TimezoneOffset);

public sealed record TournamentPreviewDto(
    string Name,
    string CompetitionName,
    string CompetitionCountry,
    string CategoryCode,
    string CategoryName,
    string CategoryTransliteratedName,
    string Locale,
    string TimezoneOffset);

public sealed record TournamentSummaryDto(
    int Id,
    string Name,
    string CompetitionName,
    string CompetitionCountry,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset? LastSyncedAtUtc,
    int StageCount,
    int TeamCount,
    int MatchCount);

public sealed record TournamentDetailsDto(
    int Id,
    string Name,
    string CompetitionName,
    string CompetitionCountry,
    string CategoryCode,
    string CategoryName,
    string CategoryTransliteratedName,
    string Locale,
    string TimezoneOffset,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset? LastSyncedAtUtc,
    IReadOnlyList<TournamentStageDto> Stages,
    IReadOnlyList<TeamDto> Teams);

public sealed record TournamentStageDto(
    int Id,
    string Name,
    string Code,
    int SortOrder);

public sealed record TeamDto(
    int Id,
    string Name,
    string Abbreviation);

public sealed record MatchDto(
    int Id,
    int TournamentId,
    int? StageId,
    DateTimeOffset? KickoffUtc,
    TeamDto? HomeTeam,
    TeamDto? AwayTeam,
    string HomeTeamNameSnapshot,
    string AwayTeamNameSnapshot,
    int? HomeScore,
    int? AwayScore,
    int? RegularTimeHomeScore,
    int? RegularTimeAwayScore,
    int? AfterExtraTimeHomeScore,
    int? AfterExtraTimeAwayScore,
    int? ExtraTimeHomeGoals,
    int? ExtraTimeAwayGoals,
    int? PenaltyHomeScore,
    int? PenaltyAwayScore,
    MatchStatus Status,
    string RawStatus,
    MatchSyncState SyncState,
    string RoundInfo,
    DateTimeOffset? LastSyncedAtUtc);

public sealed record SyncTournamentResponse(
    int SyncRunId,
    int TournamentId,
    TournamentSyncMode Mode,
    TournamentSyncRunStatus Status,
    int InsertedMatches,
    int UpdatedMatches,
    int UnchangedMatches,
    string ErrorMessage);

public sealed record TournamentSyncRunDto(
    int Id,
    int TournamentId,
    TournamentSyncMode Mode,
    TournamentSyncRunStatus Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? FinishedAtUtc,
    int InsertedMatches,
    int UpdatedMatches,
    int UnchangedMatches,
    string ErrorMessage);
