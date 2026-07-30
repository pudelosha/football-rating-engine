using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.UserPolicy)]
[Route("api/betting/coupons")]
public sealed class BettingCouponsController(
    AppDbContext dbContext,
    IUserAccountService userAccountService) : ControllerBase
{
    private const int MaxBetsPerCoupon = 20;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BettingCouponDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<BettingCouponDto>>> GetCoupons(CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var coupons = await dbContext.BettingCoupons
            .Include(coupon => coupon.Bets)
            .ThenInclude(bet => bet.Match)
            .ThenInclude(match => match.Tournament)
            .Include(coupon => coupon.Bets)
            .ThenInclude(bet => bet.Match)
            .ThenInclude(match => match.HomeTeam)
            .Include(coupon => coupon.Bets)
            .ThenInclude(bet => bet.Match)
            .ThenInclude(match => match.AwayTeam)
            .Where(coupon => coupon.UserId == userId)
            .OrderByDescending(coupon => coupon.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var coupon in coupons)
        {
            changed |= RefreshCouponStatus(coupon);
        }

        if (changed)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(coupons.Select(ToDto).ToList());
    }

    [HttpPost]
    [ProducesResponseType(typeof(BettingCouponDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BettingCouponDto>> CreateCoupon(
        CreateBettingCouponRequest request,
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (request.Bets.Count == 0 || request.Bets.Count > MaxBetsPerCoupon)
        {
            return BadRequest(new { message = $"Coupon must contain between 1 and {MaxBetsPerCoupon} bets." });
        }

        if (request.Stake < 0)
        {
            return BadRequest(new { message = "Stake cannot be negative." });
        }

        var duplicateMatch = request.Bets
            .GroupBy(bet => bet.MatchId)
            .Any(group => group.Count() > 1);

        if (duplicateMatch)
        {
            return BadRequest(new { message = "A match can be added to the coupon only once." });
        }

        var matchIds = request.Bets.Select(bet => bet.MatchId).ToHashSet();
        var matches = await dbContext.Matches
            .Include(match => match.Tournament)
            .Include(match => match.HomeTeam)
            .Include(match => match.AwayTeam)
            .Where(match => matchIds.Contains(match.Id))
            .ToDictionaryAsync(match => match.Id, cancellationToken);

        if (matches.Count != matchIds.Count)
        {
            return BadRequest(new { message = "One or more selected matches were not found." });
        }

        var now = DateTimeOffset.UtcNow;
        var totalOdds = request.Bets.Aggregate(1m, (total, bet) => total * Math.Max(1m, bet.FairOdds));
        var coupon = new BettingCoupon
        {
            UserId = userId,
            Stake = request.Stake,
            TotalOdds = decimal.Round(totalOdds, 4),
            PotentialPayout = decimal.Round(request.Stake * totalOdds, 2),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Bets = request.Bets.Select(bet => new BettingCouponBet
            {
                MatchId = bet.MatchId,
                Selection = bet.Selection,
                PredictedChance = decimal.Round(Math.Clamp(bet.PredictedChance, 0m, 1m), 4),
                FairOdds = decimal.Round(Math.Max(1m, bet.FairOdds), 4),
                ModelShape = bet.ModelShape.Trim(),
                DrawRisk = bet.DrawRisk.Trim(),
                CreatedAtUtc = now
            }).ToList()
        };

        dbContext.BettingCoupons.Add(coupon);
        RefreshCouponStatus(coupon, matches);
        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var bet in coupon.Bets)
        {
            bet.Match = matches[bet.MatchId];
        }

        return CreatedAtAction(nameof(GetCoupons), new { id = coupon.Id }, ToDto(coupon));
    }

    private static bool RefreshCouponStatus(
        BettingCoupon coupon,
        IReadOnlyDictionary<int, Match>? matchesById = null)
    {
        if (coupon.Status != BettingCouponStatus.Pending)
        {
            return false;
        }

        var allSettled = true;
        var hasLost = false;
        var changed = false;
        var now = DateTimeOffset.UtcNow;

        foreach (var bet in coupon.Bets)
        {
            var match = matchesById?.GetValueOrDefault(bet.MatchId) ?? bet.Match;
            if (match.Status is MatchStatus.Postponed or MatchStatus.Cancelled)
            {
                if (bet.Status != BettingCouponBetStatus.Void)
                {
                    bet.Status = BettingCouponBetStatus.Void;
                    bet.SettledAtUtc = now;
                    changed = true;
                }

                continue;
            }

            if (match.Status != MatchStatus.Finished || !match.HomeScore.HasValue || !match.AwayScore.HasValue)
            {
                allSettled = false;
                continue;
            }

            var winningSelection = match.HomeScore > match.AwayScore
                ? BettingCouponSelection.HomeWin
                : match.HomeScore < match.AwayScore
                    ? BettingCouponSelection.AwayWin
                    : BettingCouponSelection.Draw;
            var newStatus = bet.Selection == winningSelection ? BettingCouponBetStatus.Won : BettingCouponBetStatus.Lost;
            hasLost |= newStatus == BettingCouponBetStatus.Lost;

            if (bet.Status != newStatus)
            {
                bet.Status = newStatus;
                bet.SettledAtUtc = now;
                changed = true;
            }
        }

        if (!allSettled)
        {
            return changed;
        }

        var couponStatus = hasLost ? BettingCouponStatus.Lost : BettingCouponStatus.Won;
        if (coupon.Status == couponStatus)
        {
            return changed;
        }

        coupon.Status = couponStatus;
        coupon.ClosedAtUtc = now;
        coupon.UpdatedAtUtc = now;
        return true;
    }

    private static BettingCouponDto ToDto(BettingCoupon coupon)
    {
        return new BettingCouponDto(
            coupon.Id,
            coupon.Status,
            coupon.Stake,
            coupon.TotalOdds,
            coupon.PotentialPayout,
            coupon.CreatedAtUtc,
            coupon.UpdatedAtUtc,
            coupon.ClosedAtUtc,
            coupon.Bets
                .OrderBy(bet => bet.Match.KickoffUtc)
                .Select(ToDto)
                .ToList());
    }

    private static BettingCouponBetDto ToDto(BettingCouponBet bet)
    {
        var match = bet.Match;
        return new BettingCouponBetDto(
            bet.Id,
            bet.MatchId,
            match.TournamentId,
            match.Tournament.Name,
            match.Tournament.Season,
            match.KickoffUtc,
            match.HomeTeam?.Name ?? match.HomeTeamNameSnapshot,
            match.AwayTeam?.Name ?? match.AwayTeamNameSnapshot,
            match.HomeScore,
            match.AwayScore,
            match.Status,
            match.RoundInfo,
            bet.Selection,
            bet.Status,
            bet.PredictedChance,
            bet.FairOdds,
            bet.ModelShape,
            bet.DrawRisk,
            bet.SettledAtUtc);
    }
}
