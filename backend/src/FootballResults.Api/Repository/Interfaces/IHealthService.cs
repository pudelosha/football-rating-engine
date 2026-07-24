using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IHealthService
{
    HealthCheckDto GetHealth();
}
