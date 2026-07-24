namespace FootballResults.Api.Model.Entities;

public sealed class TeamEloRating
{
    public int Id { get; set; }
    public int EloRatingRunId { get; set; }
    public int TeamId { get; set; }
    public decimal Rating { get; set; }
    public int MatchesPlayed { get; set; }
    public DateTimeOffset? LastMatchUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public EloRatingRun EloRatingRun { get; set; } = null!;
    public Team Team { get; set; } = null!;
}
