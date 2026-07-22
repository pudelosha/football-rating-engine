using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
public sealed class SquadQualityController(ISquadQualityService squadQualityService) : ControllerBase
{
    [HttpPost("api/admin/teams/{teamId:int}/transfermarkt/import")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(ImportTransfermarktSquadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImportTransfermarktSquadResponse>> ImportTransfermarktSquad(
        int teamId,
        ImportTransfermarktSquadRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await squadQualityService.ImportTransfermarktSquadAsync(teamId, request, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException or HttpRequestException)
        {
            return BadRequest(new AuthActionResponse(false, exception.Message));
        }
    }

    [HttpGet("api/teams/{teamId:int}/external-mappings")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<ExternalTeamMappingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExternalTeamMappingDto>>> GetTeamMappings(
        int teamId,
        CancellationToken cancellationToken)
    {
        return Ok(await squadQualityService.GetTeamMappingsAsync(teamId, cancellationToken));
    }

    [HttpGet("api/teams/{teamId:int}/squad-quality/latest")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(SquadQualitySnapshotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SquadQualitySnapshotDto>> GetLatestSnapshot(
        int teamId,
        CancellationToken cancellationToken)
    {
        var snapshot = await squadQualityService.GetLatestSnapshotAsync(teamId, cancellationToken);
        return snapshot is null ? NotFound() : Ok(snapshot);
    }

    [HttpGet("api/squad-quality/snapshots/{snapshotId:int}/players")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<SquadPlayerSnapshotDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SquadPlayerSnapshotDto>>> GetSnapshotPlayers(
        int snapshotId,
        CancellationToken cancellationToken)
    {
        return Ok(await squadQualityService.GetSnapshotPlayersAsync(snapshotId, cancellationToken));
    }

    [HttpGet("api/tournaments/{tournamentId:int}/ratings/squad-quality/teams")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TeamSquadQualityRatingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamSquadQualityRatingDto>>> GetTournamentTeamRatings(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await squadQualityService.GetTournamentTeamRatingsAsync(tournamentId, cancellationToken));
    }
}
