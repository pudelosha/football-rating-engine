namespace FootballResults.Api.Model.Entities;

public sealed class TournamentSyncRun
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public TournamentSyncMode Mode { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? FinishedAtUtc { get; set; }
    public TournamentSyncRunStatus Status { get; set; }
    public int InsertedMatches { get; set; }
    public int UpdatedMatches { get; set; }
    public int UnchangedMatches { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;

    public Tournament Tournament { get; set; } = null!;
}
