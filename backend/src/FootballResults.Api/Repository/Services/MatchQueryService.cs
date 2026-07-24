using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class MatchQueryService(AppDbContext dbContext) : IMatchQueryService
{
    public Task<IReadOnlyList<MatchDto>> GetTournamentMatchesAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return QueryTournamentMatches(tournamentId)
            .ToDtoListAsync(cancellationToken);
    }

    public async Task<MatchDto?> GetTournamentMatchAsync(
        int tournamentId,
        int matchId,
        CancellationToken cancellationToken)
    {
        var match = await QueryTournamentMatches(tournamentId)
            .FirstOrDefaultAsync(match => match.Id == matchId, cancellationToken);

        return match is null ? null : DtoMapper.ToMatchDto(match);
    }

    public Task<IReadOnlyList<MatchDto>> GetTournamentResultsAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return QueryTournamentMatches(tournamentId)
            .Where(match => match.Status == MatchStatus.Finished)
            .ToDtoListAsync(cancellationToken);
    }

    public Task<IReadOnlyList<MatchDto>> GetTournamentLiveMatchesAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return QueryTournamentMatches(tournamentId)
            .Where(match => match.Status == MatchStatus.Live)
            .ToDtoListAsync(cancellationToken);
    }

    public Task<IReadOnlyList<MatchDto>> GetTournamentUpcomingMatchesAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return QueryTournamentMatches(tournamentId)
            .Where(match => match.Status == MatchStatus.Upcoming)
            .ToDtoListAsync(cancellationToken);
    }

    private IQueryable<Match> QueryTournamentMatches(int tournamentId)
    {
        return dbContext.Matches
            .Include(match => match.HomeTeam)
            .Include(match => match.AwayTeam)
            .Where(match => match.TournamentId == tournamentId)
            .OrderBy(match => match.KickoffUtc)
            .ThenBy(match => match.Id);
    }
}

internal static class MatchQueryExtensions
{
    public static async Task<IReadOnlyList<MatchDto>> ToDtoListAsync(
        this IQueryable<Match> query,
        CancellationToken cancellationToken)
    {
        var matches = await query.ToListAsync(cancellationToken);
        return matches.Select(DtoMapper.ToMatchDto).ToList();
    }
}
