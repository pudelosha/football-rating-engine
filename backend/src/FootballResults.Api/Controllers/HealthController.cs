using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController(IHealthService healthService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(HealthCheckDto), StatusCodes.Status200OK)]
    public ActionResult<HealthCheckDto> Get()
    {
        return Ok(healthService.GetHealth());
    }
}
