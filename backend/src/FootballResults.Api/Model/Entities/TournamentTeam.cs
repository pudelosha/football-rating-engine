namespace FootballResults.Api.Model.Entities;

public sealed class TournamentTeam
{
    public int TournamentId { get; set; }
    public int TeamId { get; set; }
    public DateTimeOffset FirstSeenAtUtc { get; set; }
    public DateTimeOffset LastSeenAtUtc { get; set; }

    public Tournament Tournament { get; set; } = null!;
    public Team Team { get; set; } = null!;
}
