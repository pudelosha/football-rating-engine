using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;

namespace FootballResults.Api.Repository.Services;

public sealed class HealthService(IHostEnvironment environment) : IHealthService
{
    public HealthCheckDto GetHealth()
    {
        return new HealthCheckDto(
            Status: "Healthy",
            Application: environment.ApplicationName,
            Environment: environment.EnvironmentName,
            CheckedAtUtc: DateTimeOffset.UtcNow);
    }
}
