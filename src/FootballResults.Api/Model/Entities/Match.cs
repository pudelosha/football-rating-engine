namespace FootballResults.Api.Model.Entities;

public sealed class Match
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public int? StageId { get; set; }
    public string LiveScoreEventId { get; set; } = string.Empty;
    public DateTimeOffset? KickoffUtc { get; set; }
    public int? HomeTeamId { get; set; }
    public int? AwayTeamId { get; set; }
    public string HomeTeamNameSnapshot { get; set; } = string.Empty;
    public string AwayTeamNameSnapshot { get; set; } = string.Empty;
    public string HomeTeamAbbrSnapshot { get; set; } = string.Empty;
    public string AwayTeamAbbrSnapshot { get; set; } = string.Empty;
    public string HomeTeamImageSnapshot { get; set; } = string.Empty;
    public string AwayTeamImageSnapshot { get; set; } = string.Empty;
    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }
    public int? RegularTimeHomeScore { get; set; }
    public int? RegularTimeAwayScore { get; set; }
    public int? AfterExtraTimeHomeScore { get; set; }
    public int? AfterExtraTimeAwayScore { get; set; }
    public int? ExtraTimeHomeGoals { get; set; }
    public int? ExtraTimeAwayGoals { get; set; }
    public int? PenaltyHomeScore { get; set; }
    public int? PenaltyAwayScore { get; set; }
    public MatchStatus Status { get; set; }
    public string RawStatus { get; set; } = string.Empty;
    public MatchSyncState SyncState { get; set; }
    public string RoundInfo { get; set; } = string.Empty;
    public string MatchUrl { get; set; } = string.Empty;
    public string LastSourceEndpoint { get; set; } = string.Empty;
    public LiveScoreListType LastSeenInListType { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset? LastSyncedAtUtc { get; set; }
    public DateTimeOffset? FinishedAtUtc { get; set; }

    public Tournament Tournament { get; set; } = null!;
    public TournamentStage? Stage { get; set; }
    public Team? HomeTeam { get; set; }
    public Team? AwayTeam { get; set; }
    public MatchStatistics? Statistics { get; set; }
}
