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
            .OrderBy(team => team.Name)
            .ToListAsync(cancellationToken);

        return Ok(teams.Select(DtoMapper.ToTeamDto).ToList());
    }

    [HttpGet("teams/{id:int}")]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamDto>> GetTeam(int id, CancellationToken cancellationToken)
    {
        var team = await dbContext.Teams.FindAsync([id], cancellationToken);
        return team is null ? NotFound() : Ok(DtoMapper.ToTeamDto(team));
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
