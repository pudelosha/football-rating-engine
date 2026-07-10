using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.AdminPolicy)]
public sealed class TournamentSyncController(ITournamentSyncService tournamentSyncService) : ControllerBase
{
    [HttpPost("api/tournaments/{tournamentId:int}/sync/full")]
    [ProducesResponseType(typeof(SyncTournamentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<ActionResult<SyncTournamentResponse>> SyncFull(int tournamentId, CancellationToken cancellationToken)
    {
        return Sync(tournamentId, TournamentSyncMode.Full, cancellationToken);
    }

    [HttpPost("api/tournaments/{tournamentId:int}/sync/schedule")]
    [ProducesResponseType(typeof(SyncTournamentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<ActionResult<SyncTournamentResponse>> SyncSchedule(int tournamentId, CancellationToken cancellationToken)
    {
        return Sync(tournamentId, TournamentSyncMode.Schedule, cancellationToken);
    }

    [HttpPost("api/tournaments/{tournamentId:int}/sync/live")]
    [ProducesResponseType(typeof(SyncTournamentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<ActionResult<SyncTournamentResponse>> SyncLive(int tournamentId, CancellationToken cancellationToken)
    {
        return Sync(tournamentId, TournamentSyncMode.Live, cancellationToken);
    }

    [HttpPost("api/tournaments/{tournamentId:int}/sync/finalize")]
    [ProducesResponseType(typeof(SyncTournamentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<ActionResult<SyncTournamentResponse>> SyncFinalize(int tournamentId, CancellationToken cancellationToken)
    {
        return Sync(tournamentId, TournamentSyncMode.Finalize, cancellationToken);
    }

    [HttpPost("api/tournaments/{tournamentId:int}/sync/results")]
    [ProducesResponseType(typeof(SyncTournamentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<ActionResult<SyncTournamentResponse>> SyncResults(int tournamentId, CancellationToken cancellationToken)
    {
        return Sync(tournamentId, TournamentSyncMode.Results, cancellationToken);
    }

    [HttpGet("api/tournaments/{tournamentId:int}/sync-runs")]
    [ProducesResponseType(typeof(IReadOnlyList<TournamentSyncRunDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TournamentSyncRunDto>>> GetTournamentSyncRuns(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return Ok(await tournamentSyncService.GetTournamentSyncRunsAsync(tournamentId, cancellationToken));
    }

    [HttpGet("api/tournament-sync-runs/{syncRunId:int}")]
    [ProducesResponseType(typeof(TournamentSyncRunDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TournamentSyncRunDto>> GetSyncRun(
        int syncRunId,
        CancellationToken cancellationToken)
    {
        var syncRun = await tournamentSyncService.GetSyncRunAsync(syncRunId, cancellationToken);
        return syncRun is null ? NotFound() : Ok(syncRun);
    }

    private async Task<ActionResult<SyncTournamentResponse>> Sync(
        int tournamentId,
        TournamentSyncMode mode,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await tournamentSyncService.SyncAsync(tournamentId, mode, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
