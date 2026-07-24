namespace FootballResults.Api.Model.Entities;

public sealed class Tournament
{
    public int Id { get; set; }
    public string LiveScoreCompetitionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CompetitionName { get; set; } = string.Empty;
    public string CompetitionCountry { get; set; } = string.Empty;
    public string CompetitionUrlName { get; set; } = string.Empty;
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryTransliteratedName { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string FixturesUrl { get; set; } = string.Empty;
    public string ResultsUrl { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = string.Empty;
    public string Locale { get; set; } = "en";
    public string TimezoneOffset { get; set; } = "0";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset? LastSyncedAtUtc { get; set; }

    public List<TournamentStage> Stages { get; set; } = [];
    public List<TournamentTeam> TournamentTeams { get; set; } = [];
    public List<Match> Matches { get; set; } = [];
    public List<TournamentSyncRun> SyncRuns { get; set; } = [];
}
