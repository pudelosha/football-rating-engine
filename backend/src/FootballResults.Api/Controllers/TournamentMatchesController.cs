using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
[Route("api/tournaments/{tournamentId:int}/matches")]
public sealed class TournamentMatchesController(
    IMatchQueryService matchQueryService,
    AppDbContext dbContext) : ControllerBase
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

    [HttpPut("{matchId:int}")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(MatchDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MatchDto>> UpdateMatch(
        int tournamentId,
        int matchId,
        UpdateMatchRequest request,
        CancellationToken cancellationToken)
    {
        var match = await dbContext.Matches
            .Include(item => item.HomeTeam)
            .Include(item => item.AwayTeam)
            .FirstOrDefaultAsync(item => item.TournamentId == tournamentId && item.Id == matchId, cancellationToken);

        if (match is null)
        {
            return NotFound();
        }

        if (request.StageId.HasValue)
        {
            var stageExists = await dbContext.TournamentStages
                .AnyAsync(stage => stage.TournamentId == tournamentId && stage.Id == request.StageId.Value, cancellationToken);

            if (!stageExists)
            {
                return BadRequest(new { message = "Stage does not belong to this tournament." });
            }
        }

        if (match.StageId != request.StageId)
        {
            match.IsStageManualOverride = true;
        }

        if (!string.Equals(match.RoundInfo, request.RoundInfo, StringComparison.Ordinal))
        {
            match.IsRoundInfoManualOverride = true;
        }

        match.StageId = request.StageId;
        match.KickoffUtc = request.KickoffUtc;
        match.HomeScore = request.HomeScore;
        match.AwayScore = request.AwayScore;
        match.RegularTimeHomeScore = request.RegularTimeHomeScore;
        match.RegularTimeAwayScore = request.RegularTimeAwayScore;
        match.AfterExtraTimeHomeScore = request.AfterExtraTimeHomeScore;
        match.AfterExtraTimeAwayScore = request.AfterExtraTimeAwayScore;
        match.PenaltyHomeScore = request.PenaltyHomeScore;
        match.PenaltyAwayScore = request.PenaltyAwayScore;
        match.Status = request.Status;
        match.RawStatus = request.RawStatus.Trim();
        match.SyncState = request.SyncState;
        match.RoundInfo = request.RoundInfo.Trim();
        match.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(DtoMapper.ToMatchDto(match));
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
