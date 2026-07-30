namespace FootballResults.Api.Model.Entities;

public sealed class DataQualityAcceptedIssue
{
    public int Id { get; set; }
    public string CheckKey { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string Issue { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string AcceptedByUserId { get; set; } = string.Empty;
    public DateTimeOffset AcceptedAtUtc { get; set; }
}
