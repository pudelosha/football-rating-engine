namespace FootballResults.Api.Model.Entities;

public sealed class SyncServiceConfiguration
{
    public int Id { get; set; }
    public string ServiceKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public int IntervalMinutes { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
