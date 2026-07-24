namespace FootballResults.Api.Model.Entities;

public sealed class Team
{
    public int Id { get; set; }
    public string? LiveScoreTeamId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Abbreviation { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public List<TournamentTeam> TournamentTeams { get; set; } = [];
    public List<Match> HomeMatches { get; set; } = [];
    public List<Match> AwayMatches { get; set; } = [];
    public List<ExternalTeamMapping> ExternalMappings { get; set; } = [];
    public List<SquadQualitySnapshot> SquadQualitySnapshots { get; set; } = [];
}
