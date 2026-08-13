using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record SocialBettingTournamentSummaryDto(
    int Id,
    int SourceTournamentId,
    string Name,
    string LinkedTournament,
    string Season,
    string Role,
    int Participants,
    bool IsActive);

public sealed record SocialBettingTournamentDto(
    int Id,
    int SourceTournamentId,
    string Name,
    string LinkedTournament,
    string Season,
    string Role,
    int ParticipantsCount,
    bool IsActive,
    SocialBettingTournamentSettingsDto Settings,
    IReadOnlyList<SocialBettingParticipantDto> Participants);

public sealed record SocialBettingTournamentSettingsDto(
    bool AllowExactScoreBonus,
    string ExactScoreBonusMode,
    decimal ExactScoreBonusValue,
    decimal ExactScoreOddsMultiplier,
    bool AllowQualificationPick,
    bool ApplyMissingBetPenalty,
    decimal MissingBetPenalty,
    string PoolMode,
    decimal BaseBetAmount,
    decimal StartingCredits,
    decimal MaxBetPerGame);

public sealed record CreateSocialBettingTournamentRequest(
    int SourceTournamentId,
    string Name,
    SocialBettingTournamentSettingsDto Settings,
    IReadOnlyList<UpsertSocialBettingParticipantRequest>? Participants,
    string? Language = null);

public sealed record UpdateSocialBettingTournamentRequest(
    string Name,
    SocialBettingTournamentSettingsDto Settings,
    IReadOnlyList<UpsertSocialBettingParticipantRequest>? Participants,
    string? Language = null);

public sealed record UpsertSocialBettingParticipantRequest(
    string Email,
    string? Nickname = null);

public sealed record SocialBettingParticipantDto(
    int Id,
    string UserId,
    string Email,
    string Name,
    string Role,
    string Status,
    DateTimeOffset InvitedAtUtc,
    DateTimeOffset? AcceptedAtUtc);

public sealed record AddSocialBettingParticipantRequest(
    string Email,
    string? Nickname = null,
    string? Language = null);

public sealed record AcceptSocialBettingInvitationRequest(
    int ParticipantId,
    string Token,
    string Password,
    string? Language = null);
