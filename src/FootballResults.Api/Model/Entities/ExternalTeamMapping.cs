namespace FootballResults.Api.Model.Entities;

public sealed class ExternalTeamMapping
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ExternalTeamId { get; set; } = string.Empty;
    public string ExternalSlug { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public Team Team { get; set; } = null!;
}
