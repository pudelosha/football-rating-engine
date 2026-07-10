namespace FootballResults.Api.Model.Entities;

public sealed class FormRatingRun
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public int EloRatingRunId { get; set; }
    public int MatchCount { get; set; }
    public decimal Scale { get; set; }
    public decimal MaxAdjustment { get; set; }
    public EloRatingRunStatus Status { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? FinishedAtUtc { get; set; }
    public int ProcessedTeams { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;

    public Tournament Tournament { get; set; } = null!;
    public EloRatingRun EloRatingRun { get; set; } = null!;
    public List<TeamFormRating> TeamRatings { get; set; } = [];
    public List<TeamFormMatchSnapshot> MatchSnapshots { get; set; } = [];
}
