using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
public sealed class BaseEloRatingsController(IBaseEloRatingService baseEloRatingService) : ControllerBase
{
    [HttpPost("api/tournaments/{tournamentId:int}/ratings/base-elo/rebuild")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(RebuildBaseEloResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RebuildBaseEloResponse>> Rebuild(
        int tournamentId,
        RebuildBaseEloRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await baseEloRatingService.RebuildAsync(tournamentId, request, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/base-elo/latest-run")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(EloRatingRunDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EloRatingRunDto>> GetLatestRun(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var run = await baseEloRatingService.GetLatestRunAsync(tournamentId, cancellationToken);
        return run is null ? NotFound() : Ok(run);
    }

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/base-elo/teams")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamEloRatingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamEloRatingDto>>> GetLatestTeamRatings(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await baseEloRatingService.GetLatestTeamRatingsAsync(tournamentId, cancellationToken));
    }

    [HttpGet("api/rating-runs/{runId:int}/base-elo/snapshots")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<MatchEloSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MatchEloSnapshotDto>>> GetRunSnapshots(
        int runId,
        CancellationToken cancellationToken)
    {
        return Ok(await baseEloRatingService.GetRunSnapshotsAsync(runId, cancellationToken));
    }
}
