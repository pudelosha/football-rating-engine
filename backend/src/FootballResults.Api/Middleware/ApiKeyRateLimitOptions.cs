namespace FootballResults.Api.Middleware;

public sealed class ApiKeyRateLimitOptions
{
    public int PermitLimit { get; set; } = 60;
    public int WindowSeconds { get; set; } = 60;
}
