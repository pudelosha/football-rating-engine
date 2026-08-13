using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.UserPolicy)]
[Route("api/social-betting/tournaments")]
public sealed class SocialBettingController(
    IUserAccountService userAccountService,
    ISocialBettingService socialBettingService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SocialBettingTournamentSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SocialBettingTournamentSummaryDto>>> GetTournaments(
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await socialBettingService.GetTournamentsAsync(userId, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(SocialBettingTournamentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SocialBettingTournamentDto>> GetTournament(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var tournament = await socialBettingService.GetTournamentAsync(id, userId, cancellationToken);
        return tournament is null ? NotFound() : Ok(tournament);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SocialBettingTournamentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SocialBettingTournamentDto>> CreateTournament(
        CreateSocialBettingTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (request.SourceTournamentId <= 0 || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Source tournament and tournament name are required." });
        }

        try
        {
            var tournament = await socialBettingService.CreateTournamentAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetTournament), new { id = tournament.Id }, tournament);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(SocialBettingTournamentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SocialBettingTournamentDto>> UpdateTournament(
        int id,
        UpdateSocialBettingTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Tournament name is required." });
        }

        var tournament = await socialBettingService.UpdateTournamentAsync(id, userId, request, cancellationToken);
        return tournament is null ? NotFound() : Ok(tournament);
    }

    [HttpPost("{id:int}/participants")]
    [ProducesResponseType(typeof(SocialBettingParticipantDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SocialBettingParticipantDto>> AddParticipant(
        int id,
        AddSocialBettingParticipantRequest request,
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        try
        {
            var participant = await socialBettingService.AddParticipantAsync(id, userId, request, cancellationToken);
            return participant is null ? NotFound() : CreatedAtAction(nameof(GetTournament), new { id }, participant);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("{id:int}/participants/{participantId:int}/resend-invite")]
    [ProducesResponseType(typeof(SocialBettingParticipantDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SocialBettingParticipantDto>> ResendInvitation(
        int id,
        int participantId,
        [FromBody] AdminResendConfirmationEmailRequest? request,
        CancellationToken cancellationToken)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var participant = await socialBettingService.ResendInvitationAsync(
            id,
            participantId,
            userId,
            request?.Language,
            cancellationToken);

        return participant is null ? NotFound() : Ok(participant);
    }

}

[ApiController]
[AllowAnonymous]
[Route("api/social-betting/invitations")]
public sealed class SocialBettingInvitationsController(ISocialBettingService socialBettingService) : ControllerBase
{
    [HttpPost("accept")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthActionResponse>> AcceptInvitation(
        AcceptSocialBettingInvitationRequest request,
        CancellationToken cancellationToken)
    {
        var accepted = await socialBettingService.AcceptInvitationAsync(request, cancellationToken);
        return accepted
            ? Ok(new AuthActionResponse(true, "Invitation accepted."))
            : BadRequest(new AuthActionResponse(false, "Invitation could not be accepted."));
    }
}
