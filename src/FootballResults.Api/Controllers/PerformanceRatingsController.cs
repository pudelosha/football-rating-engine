using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
public sealed class PerformanceRatingsController(IPerformanceRatingService performanceRatingService) : ControllerBase
{
    [HttpPost("api/tournaments/{tournamentId:int}/ratings/performance/rebuild")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(RebuildPerformanceRatingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RebuildPerformanceRatingResponse>> Rebuild(
        int tournamentId,
        RebuildPerformanceRatingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await performanceRatingService.RebuildAsync(tournamentId, request, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new AuthActionResponse(false, exception.Message));
        }
    }

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/performance/latest-run")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(PerformanceRatingRunDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PerformanceRatingRunDto>> GetLatestRun(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var run = await performanceRatingService.GetLatestRunAsync(tournamentId, cancellationToken);
        return run is null ? NotFound() : Ok(run);
    }

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/performance/teams")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamPerformanceRatingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamPerformanceRatingDto>>> GetLatestTeamRatings(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await performanceRatingService.GetLatestTeamRatingsAsync(tournamentId, cancellationToken));
    }

    [HttpGet("api/rating-runs/{runId:int}/performance/snapshots")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamPerformanceMatchSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamPerformanceMatchSnapshotDto>>> GetRunSnapshots(
        int runId,
        CancellationToken cancellationToken)
    {
        return Ok(await performanceRatingService.GetRunSnapshotsAsync(runId, cancellationToken));
    }
}
