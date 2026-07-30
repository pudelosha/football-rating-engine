namespace FootballResults.Api.Model.Entities;

public sealed class BettingCouponBet
{
    public int Id { get; set; }
    public int BettingCouponId { get; set; }
    public int MatchId { get; set; }
    public BettingCouponSelection Selection { get; set; }
    public BettingCouponBetStatus Status { get; set; } = BettingCouponBetStatus.Pending;
    public decimal PredictedChance { get; set; }
    public decimal FairOdds { get; set; }
    public string ModelShape { get; set; } = string.Empty;
    public string DrawRisk { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? SettledAtUtc { get; set; }

    public BettingCoupon BettingCoupon { get; set; } = null!;
    public Match Match { get; set; } = null!;
}
