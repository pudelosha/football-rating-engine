namespace FootballResults.Api.Model.Entities;

public sealed class TeamFormMatchSnapshot
{
    public int Id { get; set; }
    public int FormRatingRunId { get; set; }
    public int TeamId { get; set; }
    public int OpponentTeamId { get; set; }
    public int MatchEloSnapshotId { get; set; }
    public string LiveScoreEventId { get; set; } = string.Empty;
    public DateTimeOffset KickoffUtc { get; set; }
    public bool IsHome { get; set; }
    public decimal Actual { get; set; }
    public decimal Expected { get; set; }
    public decimal Delta { get; set; }
    public decimal Weight { get; set; }
    public decimal WeightedDelta { get; set; }

    public FormRatingRun FormRatingRun { get; set; } = null!;
    public Team Team { get; set; } = null!;
    public Team OpponentTeam { get; set; } = null!;
    public MatchEloSnapshot MatchEloSnapshot { get; set; } = null!;
}
