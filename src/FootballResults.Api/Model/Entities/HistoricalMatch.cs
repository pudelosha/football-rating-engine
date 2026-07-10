namespace FootballResults.Api.Model.Entities;

public sealed class HistoricalMatch
{
    public int Id { get; set; }
    public string LiveScoreEventId { get; set; } = string.Empty;
    public string LiveScoreCompetitionId { get; set; } = string.Empty;
    public string CompetitionName { get; set; } = string.Empty;
    public string CompetitionCountry { get; set; } = string.Empty;
    public string SeasonName { get; set; } = string.Empty;
    public string StageName { get; set; } = string.Empty;
    public string StageCode { get; set; } = string.Empty;
    public DateTimeOffset? KickoffUtc { get; set; }
    public int? HomeTeamId { get; set; }
    public int? AwayTeamId { get; set; }
    public string HomeTeamLiveScoreId { get; set; } = string.Empty;
    public string AwayTeamLiveScoreId { get; set; } = string.Empty;
    public string HomeTeamNameSnapshot { get; set; } = string.Empty;
    public string AwayTeamNameSnapshot { get; set; } = string.Empty;
    public string HomeTeamAbbrSnapshot { get; set; } = string.Empty;
    public string AwayTeamAbbrSnapshot { get; set; } = string.Empty;
    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }
    public int? RegularTimeHomeScore { get; set; }
    public int? RegularTimeAwayScore { get; set; }
    public MatchStatus Status { get; set; }
    public string RawStatus { get; set; } = string.Empty;
    public string RoundInfo { get; set; } = string.Empty;
    public string SourceEndpoint { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public Team? HomeTeam { get; set; }
    public Team? AwayTeam { get; set; }
    public List<MatchEloSnapshot> EloSnapshots { get; set; } = [];
}
