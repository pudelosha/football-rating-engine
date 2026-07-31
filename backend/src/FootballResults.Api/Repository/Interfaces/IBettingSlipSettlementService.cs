using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Interfaces;

public interface IBettingSlipSettlementService
{
    bool RefreshCouponStatus(
        BettingCoupon coupon,
        IReadOnlyDictionary<int, Match>? matchesById = null,
        DateTimeOffset? now = null);

    Task<int> ValidatePendingAndLockedSlipsAsync(CancellationToken cancellationToken);
}
