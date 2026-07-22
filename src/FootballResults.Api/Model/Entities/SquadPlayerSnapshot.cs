namespace FootballResults.Api.Model.Entities;

public sealed class SquadPlayerSnapshot
{
    public int Id { get; set; }
    public int SquadQualitySnapshotId { get; set; }
    public string ExternalPlayerId { get; set; } = string.Empty;
    public string ProfileUrl { get; set; } = string.Empty;
    public string PlayerName { get; set; } = string.Empty;
    public string PositionGroup { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string ShirtNumber { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public int? Age { get; set; }
    public string Nationalities { get; set; } = string.Empty;
    public decimal? HeightCm { get; set; }
    public string Foot { get; set; } = string.Empty;
    public DateOnly? JoinedDate { get; set; }
    public string SignedFromClubName { get; set; } = string.Empty;
    public string SignedFromExternalClubId { get; set; } = string.Empty;
    public string SignedFromSeasonId { get; set; } = string.Empty;
    public string TransferMovementText { get; set; } = string.Empty;
    public string TransferFeeText { get; set; } = string.Empty;
    public decimal? TransferFeeEur { get; set; }
    public DateOnly? ContractUntil { get; set; }
    public string MarketValueText { get; set; } = string.Empty;
    public decimal? MarketValueEur { get; set; }

    public SquadQualitySnapshot SquadQualitySnapshot { get; set; } = null!;
}
