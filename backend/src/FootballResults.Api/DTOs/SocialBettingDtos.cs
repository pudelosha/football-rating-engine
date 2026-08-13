using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record SocialBettingTournamentSummaryDto(
    int Id,
    int SourceTournamentId,
    string Name,
    string LinkedTournament,
    string Season,
    string Role,
    string ParticipantStatus,
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

public sealed record SocialBettingResultsDto(
    IReadOnlyList<SocialBettingStandingRowDto> Standings,
    IReadOnlyList<SocialBettingPointsGrowthSeriesDto> PointsGrowth);

public sealed record SocialBettingOutstandingBetDto(
    int Id,
    string Kickoff,
    DateTimeOffset? KickoffUtc,
    string HomeTeam,
    string AwayTeam,
    string LinkedTournament,
    string? Stage,
    string Status,
    decimal HomeWinProbability,
    decimal DrawProbability,
    decimal AwayWinProbability,
    decimal? HomeWinOdds,
    decimal? DrawOdds,
    decimal? AwayWinOdds);

public sealed record UpsertSocialBettingPickRequest(
    int HomeScorePrediction,
    int AwayScorePrediction,
    int? QualifierTeamId = null,
    decimal? Stake = null);

public sealed record SocialBettingPickDto(
    int Id,
    int MatchId,
    int HomeScorePrediction,
    int AwayScorePrediction,
    int? QualifierTeamId,
    decimal Stake,
    decimal? HomeOddsAtPlacement,
    decimal? DrawOddsAtPlacement,
    decimal? AwayOddsAtPlacement,
    DateTimeOffset PlacedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record SocialBettingMatchSummaryDto(
    int MatchId,
    string HomeTeam,
    string AwayTeam,
    DateTimeOffset? KickoffUtc,
    string Kickoff,
    string Status,
    bool HasStarted,
    int? HomeScore,
    int? AwayScore,
    int ParticipantCount,
    int PlacedBetCount,
    decimal HomeWinPercentage,
    decimal DrawPercentage,
    decimal AwayWinPercentage,
    decimal AverageHomeGoals,
    decimal AverageAwayGoals,
    decimal? HomeWinOdds,
    decimal? DrawOdds,
    decimal? AwayWinOdds,
    IReadOnlyList<SocialBettingUserBetSummaryDto> UserBets);

public sealed record SocialBettingUserBetSummaryDto(
    string PlayerName,
    string Bet,
    bool HomeWin,
    bool Draw,
    bool AwayWin,
    bool? OutcomeMatched,
    decimal? Points);

public sealed record SocialBettingStandingRowDto(
    int Position,
    string UserName,
    decimal Accuracy,
    int SuccessfulBets,
    decimal Result,
    string Direction,
    SocialBettingPointsSplitDto PointsSplit);

public sealed record SocialBettingPointsSplitDto(
    decimal Win,
    decimal Draw,
    decimal Failed);

public sealed record SocialBettingPointsGrowthSeriesDto(
    string PlayerName,
    IReadOnlyList<decimal> Points);

public sealed record AddSocialBettingParticipantRequest(
    string Email,
    string? Nickname = null,
    string? Language = null);

public sealed record AcceptSocialBettingInvitationRequest(
    int ParticipantId,
    string Token,
    string Password,
    string? Language = null);
