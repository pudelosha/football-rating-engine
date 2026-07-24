using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
[Route("api/tournaments/{tournamentId:int}/matches")]
public sealed class TournamentMatchesController(IMatchQueryService matchQueryService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MatchDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetMatches(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await matchQueryService.GetTournamentMatchesAsync(tournamentId, cancellationToken));
    }

    [HttpGet("{matchId:int}")]
    [ProducesResponseType(typeof(MatchDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MatchDto>> GetMatch(
        int tournamentId,
        int matchId,
        CancellationToken cancellationToken)
    {
        var match = await matchQueryService.GetTournamentMatchAsync(tournamentId, matchId, cancellationToken);
        return match is null ? NotFound() : Ok(match);
    }

    [HttpGet("results")]
    [ProducesResponseType(typeof(IReadOnlyList<MatchDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetResults(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await matchQueryService.GetTournamentResultsAsync(tournamentId, cancellationToken));
    }

    [HttpGet("live")]
    [ProducesResponseType(typeof(IReadOnlyList<MatchDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetLive(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await matchQueryService.GetTournamentLiveMatchesAsync(tournamentId, cancellationToken));
    }

    [HttpGet("upcoming")]
    [ProducesResponseType(typeof(IReadOnlyList<MatchDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetUpcoming(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await matchQueryService.GetTournamentUpcomingMatchesAsync(tournamentId, cancellationToken));
    }
}
