using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TournamentsController(
    ITournamentCreationService tournamentCreationService,
    ITournamentQueryService tournamentQueryService,
    ILiveScoreTournamentDiscoveryService discoveryService) : ControllerBase
{
    [HttpPost("preview")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(TournamentPreviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TournamentPreviewDto>> Preview(
        CreateTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var preview = await discoveryService.PreviewAsync(
            request.LiveScoreUrl,
            request.Locale,
            request.TimezoneOffset,
            cancellationToken);

        return Ok(preview);
    }

    [HttpPost]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(TournamentDetailsDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<TournamentDetailsDto>> Create(
        CreateTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await tournamentCreationService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = tournament.Id }, tournament);
    }

    [HttpGet]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<TournamentSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TournamentSummaryDto>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await tournamentQueryService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
    [ProducesResponseType(typeof(TournamentDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TournamentDetailsDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var tournament = await tournamentQueryService.GetByIdAsync(id, cancellationToken);
        return tournament is null ? NotFound() : Ok(tournament);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(TournamentDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TournamentDetailsDto>> Update(
        int id,
        UpdateTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await tournamentQueryService.UpdateAsync(id, request, cancellationToken);
        return tournament is null ? NotFound() : Ok(tournament);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await tournamentQueryService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
