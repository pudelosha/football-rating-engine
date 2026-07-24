using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
public sealed class FormRatingsController(IFormRatingService formRatingService) : ControllerBase
{
    [HttpPost("api/tournaments/{tournamentId:int}/ratings/form/rebuild")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(RebuildFormRatingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RebuildFormRatingResponse>> Rebuild(
        int tournamentId,
        RebuildFormRatingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await formRatingService.RebuildAsync(tournamentId, request, cancellationToken));
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

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/form/latest-run")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(FormRatingRunDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FormRatingRunDto>> GetLatestRun(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var run = await formRatingService.GetLatestRunAsync(tournamentId, cancellationToken);
        return run is null ? NotFound() : Ok(run);
    }

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/form/teams")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamFormRatingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamFormRatingDto>>> GetLatestTeamRatings(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await formRatingService.GetLatestTeamRatingsAsync(tournamentId, cancellationToken));
    }

    [HttpGet("api/rating-runs/{runId:int}/form/snapshots")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamFormMatchSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamFormMatchSnapshotDto>>> GetRunSnapshots(
        int runId,
        CancellationToken cancellationToken)
    {
        return Ok(await formRatingService.GetRunSnapshotsAsync(runId, cancellationToken));
    }
}
