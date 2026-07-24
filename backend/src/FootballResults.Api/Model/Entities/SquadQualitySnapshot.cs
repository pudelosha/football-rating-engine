namespace FootballResults.Api.Model.Entities;

public sealed class SquadQualitySnapshot
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public int ExternalTeamMappingId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ExternalTeamId { get; set; } = string.Empty;
    public string ExternalSlug { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string? Season { get; set; }
    public DateTimeOffset FetchedAtUtc { get; set; }

    public string ClubName { get; set; } = string.Empty;
    public string LeagueName { get; set; } = string.Empty;
    public string LeagueLevel { get; set; } = string.Empty;
    public string InLeagueSince { get; set; } = string.Empty;
    public string StadiumName { get; set; } = string.Empty;
    public int? StadiumCapacity { get; set; }
    public string TransferRecordText { get; set; } = string.Empty;
    public decimal? TransferRecordValueEur { get; set; }

    public int? SquadSize { get; set; }
    public decimal? AverageAge { get; set; }
    public int? ForeignersCount { get; set; }
    public decimal? ForeignersPercentage { get; set; }
    public int? NationalTeamPlayers { get; set; }
    public decimal? TotalMarketValueEur { get; set; }
    public decimal? AverageMarketValueEur { get; set; }
    public decimal? TopElevenMarketValueEur { get; set; }
    public decimal? TopFifteenMarketValueEur { get; set; }
    public decimal? ValueWeightedAverageAge { get; set; }
    public decimal? ValueWeightedContractYears { get; set; }
    public int PlayerCount { get; set; }

    public Team Team { get; set; } = null!;
    public ExternalTeamMapping ExternalTeamMapping { get; set; } = null!;
    public List<SquadPlayerSnapshot> Players { get; set; } = [];
}
