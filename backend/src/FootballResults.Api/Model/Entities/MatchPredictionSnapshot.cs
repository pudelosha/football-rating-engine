namespace FootballResults.Api.Model.Entities;

public sealed class MatchPredictionSnapshot
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public int TournamentId { get; set; }
    public DateTimeOffset CapturedAtUtc { get; set; }
    public string Source { get; set; } = string.Empty;
    public int? BaseEloRunId { get; set; }
    public int? FormRatingRunId { get; set; }
    public int? PerformanceRatingRunId { get; set; }
    public int? SnapshotStartSeasonOffset { get; set; }
    public DateTimeOffset RatingCalculatedAtUtc { get; set; }
    public int HomeTeamId { get; set; }
    public int AwayTeamId { get; set; }
    public string HomeTeamName { get; set; } = string.Empty;
    public string AwayTeamName { get; set; } = string.Empty;
    public decimal HomeBaseElo { get; set; }
    public decimal AwayBaseElo { get; set; }
    public decimal HomeFormAdjustment { get; set; }
    public decimal AwayFormAdjustment { get; set; }
    public decimal HomePerformanceAdjustment { get; set; }
    public decimal AwayPerformanceAdjustment { get; set; }
    public decimal HomeSquadQualityAdjustment { get; set; }
    public decimal AwaySquadQualityAdjustment { get; set; }
    public decimal HomeFinalRating { get; set; }
    public decimal AwayFinalRating { get; set; }
    public decimal HomeRatingConfidence { get; set; }
    public decimal AwayRatingConfidence { get; set; }
    public bool ApplyHomeAdvantage { get; set; }
    public decimal HomeAdvantage { get; set; }
    public decimal RatingGap { get; set; }
    public decimal HomeWinProbability { get; set; }
    public decimal DrawProbability { get; set; }
    public decimal AwayWinProbability { get; set; }
    public decimal HomeFairOdds { get; set; }
    public decimal DrawFairOdds { get; set; }
    public decimal AwayFairOdds { get; set; }
    public string FavoriteOutcome { get; set; } = string.Empty;
    public decimal FavoriteProbability { get; set; }

    public Match Match { get; set; } = null!;
    public Tournament Tournament { get; set; } = null!;
    public Team HomeTeam { get; set; } = null!;
    public Team AwayTeam { get; set; } = null!;
}
