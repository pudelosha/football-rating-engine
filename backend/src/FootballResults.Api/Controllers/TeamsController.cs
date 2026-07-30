using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Repository.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.ApiKeyOrAdminPolicy)]
[Route("api")]
public sealed class TeamsController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("teams")]
    [ProducesResponseType(typeof(IReadOnlyList<TeamDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamDto>>> GetTeams(CancellationToken cancellationToken)
    {
        var teams = await dbContext.Teams
            .Where(team => team.IsEnabled)
            .OrderBy(team => team.Name)
            .ToListAsync(cancellationToken);

        return Ok(teams.Select(DtoMapper.ToTeamDto).ToList());
    }

    [HttpGet("admin/teams")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(IReadOnlyList<AdminTeamDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminTeamDto>>> GetAdminTeams(CancellationToken cancellationToken)
    {
        var teams = await dbContext.Teams
            .Include(team => team.TournamentTeams)
            .ThenInclude(tournamentTeam => tournamentTeam.Tournament)
            .OrderBy(team => team.Name)
            .ToListAsync(cancellationToken);

        return Ok(teams
            .Select(team => new AdminTeamDto(
                team.Id,
                team.Name,
                team.Abbreviation,
                team.IsEnabled,
                team.TournamentTeams
                    .OrderBy(tournamentTeam => tournamentTeam.Tournament.Name)
                    .ThenBy(tournamentTeam => tournamentTeam.Tournament.Season)
                    .Select(tournamentTeam => new TeamTournamentAssignmentDto(
                        tournamentTeam.TournamentId,
                        tournamentTeam.Tournament.Name,
                        tournamentTeam.Tournament.Season,
                        tournamentTeam.Tournament.CompetitionCountry))
                    .ToList()))
            .ToList());
    }

    [HttpGet("teams/{id:int}")]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamDto>> GetTeam(int id, CancellationToken cancellationToken)
    {
        var team = await dbContext.Teams.FindAsync([id], cancellationToken);
        return team is null ? NotFound() : Ok(DtoMapper.ToTeamDto(team));
    }

    [HttpPut("teams/{id:int}")]
    [Authorize(Policy = AuthExtensions.AdminPolicy)]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamDto>> UpdateTeam(
        int id,
        UpdateTeamRequest request,
        CancellationToken cancellationToken)
    {
        var team = await dbContext.Teams.FindAsync([id], cancellationToken);
        if (team is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            team.Name = request.Name.Trim();
        }

        team.Abbreviation = request.Abbreviation.Trim();
        team.IsEnabled = request.IsEnabled;
        team.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(DtoMapper.ToTeamDto(team));
    }

    [HttpGet("tournaments/{tournamentId:int}/teams")]
    [ProducesResponseType(typeof(IReadOnlyList<TeamDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TeamDto>>> GetTournamentTeams(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var teams = await dbContext.TournamentTeams
            .Where(tournamentTeam => tournamentTeam.TournamentId == tournamentId)
            .Select(tournamentTeam => tournamentTeam.Team)
            .OrderBy(team => team.Name)
            .ToListAsync(cancellationToken);

        return Ok(teams.Select(DtoMapper.ToTeamDto).ToList());
    }
}
