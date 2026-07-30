namespace FootballResults.Api.Model.Entities;

public sealed class BettingCoupon
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public BettingCouponStatus Status { get; set; } = BettingCouponStatus.Pending;
    public decimal Stake { get; set; }
    public decimal TotalOdds { get; set; }
    public decimal PotentialPayout { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset? ClosedAtUtc { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public List<BettingCouponBet> Bets { get; set; } = [];
}
