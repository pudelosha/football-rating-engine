namespace FootballResults.Api.Model.Entities;

public sealed class MatchStatistics
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public string LiveScoreEventId { get; set; } = string.Empty;
    public DateTimeOffset FetchedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public decimal? HomeExpectedGoals { get; set; }
    public decimal? AwayExpectedGoals { get; set; }
    public int? HomeShotsOnTarget { get; set; }
    public int? AwayShotsOnTarget { get; set; }
    public int? HomeShotsOffTarget { get; set; }
    public int? AwayShotsOffTarget { get; set; }
    public int? HomeBlockedShots { get; set; }
    public int? AwayBlockedShots { get; set; }
    public int? HomePossession { get; set; }
    public int? AwayPossession { get; set; }
    public int? HomeCorners { get; set; }
    public int? AwayCorners { get; set; }
    public int? HomeFouls { get; set; }
    public int? AwayFouls { get; set; }
    public int? HomeThrowIns { get; set; }
    public int? AwayThrowIns { get; set; }
    public int? HomeCrosses { get; set; }
    public int? AwayCrosses { get; set; }
    public int? HomeGoalkeeperSaves { get; set; }
    public int? AwayGoalkeeperSaves { get; set; }
    public int? HomeGoalKicks { get; set; }
    public int? AwayGoalKicks { get; set; }
    public int? HomeOffsides { get; set; }
    public int? AwayOffsides { get; set; }
    public int? HomeYellowCards { get; set; }
    public int? AwayYellowCards { get; set; }
    public int? HomeRedCards { get; set; }
    public int? AwayRedCards { get; set; }
    public int? HomeYellowRedCards { get; set; }
    public int? AwayYellowRedCards { get; set; }
    public int? HomeCounterAttacks { get; set; }
    public int? AwayCounterAttacks { get; set; }

    public Match Match { get; set; } = null!;
}
