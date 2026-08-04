using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class BettingSlipSettlementServiceTests
{
    [Fact]
    public void RefreshCouponStatus_LocksPendingCoupon_WhenAnyMatchHasStarted()
    {
        using var dbContext = ServiceTestData.CreateDbContext("slip-lock");
        var coupon = Coupon(
            BettingCouponStatus.Pending,
            Bet(Match(MatchStatus.Live, DateTimeOffset.UtcNow.AddMinutes(-5)), BettingCouponSelection.HomeWin));
        var service = new BettingSlipSettlementService(dbContext);

        var changed = service.RefreshCouponStatus(coupon, now: DateTimeOffset.UtcNow);

        Assert.True(changed);
        Assert.Equal(BettingCouponStatus.Locked, coupon.Status);
    }

    [Fact]
    public void RefreshCouponStatus_MarksCouponWon_WhenAllSettledBetsWin()
    {
        using var dbContext = ServiceTestData.CreateDbContext("slip-won");
        var coupon = Coupon(
            BettingCouponStatus.Locked,
            Bet(Match(MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 0), BettingCouponSelection.HomeWin),
            Bet(Match(MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-1), 1, 1), BettingCouponSelection.Draw));
        var service = new BettingSlipSettlementService(dbContext);

        var changed = service.RefreshCouponStatus(coupon, now: DateTimeOffset.UtcNow);

        Assert.True(changed);
        Assert.Equal(BettingCouponStatus.Won, coupon.Status);
        Assert.All(coupon.Bets, bet => Assert.Equal(BettingCouponBetStatus.Won, bet.Status));
        Assert.NotNull(coupon.ClosedAtUtc);
    }

    [Fact]
    public void RefreshCouponStatus_MarksCouponLost_WhenAnySettledBetLoses()
    {
        using var dbContext = ServiceTestData.CreateDbContext("slip-lost");
        var coupon = Coupon(
            BettingCouponStatus.Locked,
            Bet(Match(MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 0, 2), BettingCouponSelection.HomeWin),
            Bet(Match(MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-1), 1, 1), BettingCouponSelection.Draw));
        var service = new BettingSlipSettlementService(dbContext);

        var changed = service.RefreshCouponStatus(coupon, now: DateTimeOffset.UtcNow);

        Assert.True(changed);
        Assert.Equal(BettingCouponStatus.Lost, coupon.Status);
        Assert.Contains(coupon.Bets, bet => bet.Status == BettingCouponBetStatus.Lost);
        Assert.Contains(coupon.Bets, bet => bet.Status == BettingCouponBetStatus.Won);
    }

    [Theory]
    [InlineData(MatchStatus.Postponed)]
    [InlineData(MatchStatus.Cancelled)]
    public void RefreshCouponStatus_VoidsCancelledOrPostponedBet(MatchStatus matchStatus)
    {
        using var dbContext = ServiceTestData.CreateDbContext("slip-void");
        var coupon = Coupon(
            BettingCouponStatus.Pending,
            Bet(Match(matchStatus, DateTimeOffset.UtcNow.AddHours(-1)), BettingCouponSelection.HomeWin));
        var service = new BettingSlipSettlementService(dbContext);

        var changed = service.RefreshCouponStatus(coupon, now: DateTimeOffset.UtcNow);

        Assert.True(changed);
        Assert.Equal(BettingCouponStatus.Won, coupon.Status);
        Assert.Equal(BettingCouponBetStatus.Void, coupon.Bets.Single().Status);
    }

    [Fact]
    public async Task ValidatePendingAndLockedSlipsAsync_PersistsChangedStatuses()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("slip-validate");
        var tournament = ServiceTestData.Tournament();
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var match = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 3, 1);
        var coupon = new BettingCoupon
        {
            UserId = "user-1",
            Status = BettingCouponStatus.Pending,
            Stake = 10,
            TotalOdds = 2,
            PotentialPayout = 20,
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
            Bets =
            [
                new BettingCouponBet
                {
                    Match = match,
                    Selection = BettingCouponSelection.HomeWin,
                    PredictedChance = 0.6m,
                    FairOdds = 1.67m,
                    CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1)
                }
            ]
        };

        dbContext.AddRange(tournament, home, away, match, coupon);
        await dbContext.SaveChangesAsync();

        var service = new BettingSlipSettlementService(dbContext);
        var changed = await service.ValidatePendingAndLockedSlipsAsync(CancellationToken.None);

        Assert.Equal(1, changed);
        var savedCoupon = await dbContext.BettingCoupons.Include(item => item.Bets).SingleAsync();
        Assert.Equal(BettingCouponStatus.Won, savedCoupon.Status);
        Assert.Equal(BettingCouponBetStatus.Won, savedCoupon.Bets.Single().Status);
    }

    private static BettingCoupon Coupon(BettingCouponStatus status, params BettingCouponBet[] bets)
    {
        return new BettingCoupon
        {
            UserId = "user-1",
            Status = status,
            Stake = 10,
            TotalOdds = 2,
            PotentialPayout = 20,
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
            Bets = bets.ToList()
        };
    }

    private static BettingCouponBet Bet(Match match, BettingCouponSelection selection)
    {
        return new BettingCouponBet
        {
            Match = match,
            MatchId = match.Id,
            Selection = selection,
            PredictedChance = 0.5m,
            FairOdds = 2,
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1)
        };
    }

    private static Match Match(
        MatchStatus status,
        DateTimeOffset kickoffUtc,
        int? homeScore = null,
        int? awayScore = null)
    {
        return new Match
        {
            Status = status,
            KickoffUtc = kickoffUtc,
            HomeScore = homeScore,
            AwayScore = awayScore
        };
    }
}
