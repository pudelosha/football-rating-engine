using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class BettingSlipSettlementService(AppDbContext dbContext) : IBettingSlipSettlementService
{
    public bool RefreshCouponStatus(
        BettingCoupon coupon,
        IReadOnlyDictionary<int, Match>? matchesById = null,
        DateTimeOffset? now = null)
    {
        if (coupon.Status is BettingCouponStatus.Won or BettingCouponStatus.Lost)
        {
            return false;
        }

        var currentTime = now ?? DateTimeOffset.UtcNow;
        var allSettled = true;
        var hasLost = false;
        var hasStarted = false;
        var changed = false;

        foreach (var bet in coupon.Bets)
        {
            var match = matchesById?.GetValueOrDefault(bet.MatchId) ?? bet.Match;
            hasStarted |= match.Status is MatchStatus.Live or MatchStatus.Finished ||
                (match.KickoffUtc.HasValue && match.KickoffUtc.Value <= currentTime);

            if (match.Status is MatchStatus.Postponed or MatchStatus.Cancelled)
            {
                if (bet.Status != BettingCouponBetStatus.Void)
                {
                    bet.Status = BettingCouponBetStatus.Void;
                    bet.SettledAtUtc = currentTime;
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
                bet.SettledAtUtc = currentTime;
                changed = true;
            }
        }

        if (!allSettled)
        {
            if (hasStarted && coupon.Status != BettingCouponStatus.Locked)
            {
                coupon.Status = BettingCouponStatus.Locked;
                coupon.UpdatedAtUtc = currentTime;
                return true;
            }

            return changed;
        }

        var couponStatus = hasLost ? BettingCouponStatus.Lost : BettingCouponStatus.Won;
        if (coupon.Status == couponStatus)
        {
            return changed;
        }

        coupon.Status = couponStatus;
        coupon.ClosedAtUtc = currentTime;
        coupon.UpdatedAtUtc = currentTime;
        return true;
    }

    public async Task<int> ValidatePendingAndLockedSlipsAsync(CancellationToken cancellationToken)
    {
        var coupons = await dbContext.BettingCoupons
            .Include(coupon => coupon.Bets)
            .ThenInclude(bet => bet.Match)
            .Where(coupon => coupon.Status == BettingCouponStatus.Pending || coupon.Status == BettingCouponStatus.Locked)
            .ToListAsync(cancellationToken);

        var changedCount = 0;
        var now = DateTimeOffset.UtcNow;
        foreach (var coupon in coupons)
        {
            if (RefreshCouponStatus(coupon, now: now))
            {
                changedCount++;
            }
        }

        if (changedCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return changedCount;
    }
}
