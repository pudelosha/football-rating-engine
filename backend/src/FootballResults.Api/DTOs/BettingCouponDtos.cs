using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.DTOs;

public sealed record CreateBettingCouponRequest(
    decimal Stake,
    IReadOnlyList<CreateBettingCouponBetRequest> Bets);

public sealed record CreateBettingCouponBetRequest(
    int MatchId,
    BettingCouponSelection Selection,
    decimal PredictedChance,
    decimal FairOdds,
    string ModelShape,
    string DrawRisk);

public sealed record BettingCouponDto(
    int Id,
    BettingCouponStatus Status,
    decimal Stake,
    decimal TotalOdds,
    decimal PotentialPayout,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset? ClosedAtUtc,
    IReadOnlyList<BettingCouponBetDto> Bets);

public sealed record BettingCouponBetDto(
    int Id,
    int MatchId,
    int TournamentId,
    string TournamentName,
    string TournamentSeason,
    DateTimeOffset? KickoffUtc,
    string HomeTeamName,
    string AwayTeamName,
    int? HomeScore,
    int? AwayScore,
    MatchStatus MatchStatus,
    string RoundInfo,
    BettingCouponSelection Selection,
    BettingCouponBetStatus Status,
    decimal PredictedChance,
    decimal FairOdds,
    string ModelShape,
    string DrawRisk,
    DateTimeOffset? SettledAtUtc);
