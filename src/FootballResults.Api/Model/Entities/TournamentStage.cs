namespace FootballResults.Api.Model.Entities;

public sealed class TournamentStage
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public string LiveScoreStageId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public Tournament Tournament { get; set; } = null!;
    public List<Match> Matches { get; set; } = [];
}
