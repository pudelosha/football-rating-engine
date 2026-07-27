namespace FootballResults.Api.DTOs;

public sealed record DataQualityTournamentCheckDto(
    string Key,
    string Title,
    string Status,
    int IssueCount,
    int CheckedCount,
    DateTimeOffset? LastSampleUtc,
    string Summary);

public sealed record DataQualityIssueDto(
    string Key,
    string Severity,
    string TournamentName,
    string EntityType,
    string EntityLabel,
    int? EntityId,
    DateTimeOffset? SampleUtc,
    string Issue);
