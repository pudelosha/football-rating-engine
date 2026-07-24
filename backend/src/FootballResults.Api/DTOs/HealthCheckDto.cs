namespace FootballResults.Api.DTOs;

public sealed record HealthCheckDto(
    string Status,
    string Application,
    string Environment,
    DateTimeOffset CheckedAtUtc);
