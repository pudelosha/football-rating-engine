using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
public sealed class CombinedRatingsController(ICombinedRatingService combinedRatingService) : ControllerBase
{
    [HttpGet("api/tournaments/{tournamentId:int}/ratings/combined/teams")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrUserPolicy)]
    [ProducesResponseType(typeof(CombinedTeamRatingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CombinedTeamRatingsDto>> GetTournamentTeamRatings(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await combinedRatingService.GetTournamentTeamRatingsAsync(tournamentId, cancellationToken));
    }
}
