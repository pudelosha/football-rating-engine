using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class TournamentQueryService(
    AppDbContext dbContext,
    ILiveScoreTournamentDiscoveryService discoveryService) : ITournamentQueryService
{
    public async Task<IReadOnlyList<TournamentSummaryDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await dbContext.Tournaments
            .AsNoTracking()
            .OrderBy(tournament => tournament.Name)
            .Select(tournament => new TournamentSummaryDto(
                tournament.Id,
                tournament.IsActive,
                tournament.ApplyHomeAdvantage,
                tournament.Name,
                tournament.Season,
                tournament.CompetitionName,
                tournament.CompetitionCountry,
                tournament.CreatedAtUtc,
                tournament.UpdatedAtUtc,
                tournament.LastSyncedAtUtc,
                tournament.Stages.Count,
                tournament.TournamentTeams.Count,
                tournament.Matches.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<TournamentDetailsDto?> GetByIdAsync(int tournamentId, CancellationToken cancellationToken)
    {
        var tournament = await LoadDetailsQuery()
            .FirstOrDefaultAsync(tournament => tournament.Id == tournamentId, cancellationToken);

        return tournament is null ? null : DtoMapper.ToDetailsDto(tournament);
    }

    public async Task<TournamentDetailsDto?> UpdateAsync(
        int tournamentId,
        UpdateTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadDetailsQuery()
            .FirstOrDefaultAsync(tournament => tournament.Id == tournamentId, cancellationToken);

        if (tournament is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            tournament.Name = request.Name;
        }

        if (!string.IsNullOrWhiteSpace(request.Season))
        {
            tournament.Season = request.Season;
        }

        if (request.IsActive.HasValue)
        {
            tournament.IsActive = request.IsActive.Value;
        }

        if (request.ApplyHomeAdvantage.HasValue)
        {
            tournament.ApplyHomeAdvantage = request.ApplyHomeAdvantage.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.LiveScoreUrl))
        {
            var discovery = await discoveryService.DiscoverAsync(
                request.LiveScoreUrl,
                request.Locale ?? tournament.Locale,
                request.TimezoneOffset ?? tournament.TimezoneOffset,
                cancellationToken);

            if (!string.Equals(discovery.LiveScoreCompetitionId, tournament.LiveScoreCompetitionId, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("The LiveScore URL points to a different competition.");
            }

            tournament.CompetitionName = KeepExistingWhenBlank(discovery.CompetitionName, tournament.CompetitionName);
            tournament.CompetitionCountry = KeepExistingWhenBlank(discovery.CompetitionCountry, tournament.CompetitionCountry);
            tournament.CompetitionUrlName = KeepExistingWhenBlank(discovery.CompetitionUrlName, tournament.CompetitionUrlName);
            tournament.CategoryCode = KeepExistingWhenBlank(discovery.CategoryCode, tournament.CategoryCode);
            tournament.CategoryName = KeepExistingWhenBlank(discovery.CategoryName, tournament.CategoryName);
            tournament.CategoryTransliteratedName = KeepExistingWhenBlank(discovery.CategoryTransliteratedName, tournament.CategoryTransliteratedName);
            tournament.BaseUrl = KeepExistingWhenBlank(discovery.BaseUrl, tournament.BaseUrl);
            tournament.FixturesUrl = KeepExistingWhenBlank(discovery.FixturesUrl, tournament.FixturesUrl);
            tournament.ResultsUrl = KeepExistingWhenBlank(discovery.ResultsUrl, tournament.ResultsUrl);
            tournament.ApiBaseUrl = KeepExistingWhenBlank(discovery.ApiBaseUrl, tournament.ApiBaseUrl);
        }

        if (!string.IsNullOrWhiteSpace(request.Locale))
        {
            tournament.Locale = request.Locale;
        }

        if (!string.IsNullOrWhiteSpace(request.CompetitionCountry))
        {
            tournament.CompetitionCountry = request.CompetitionCountry;
        }

        if (!string.IsNullOrWhiteSpace(request.TimezoneOffset))
        {
            tournament.TimezoneOffset = request.TimezoneOffset;
        }

        tournament.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return DtoMapper.ToDetailsDto(tournament);
    }

    public async Task<bool> DeleteAsync(int tournamentId, CancellationToken cancellationToken)
    {
        var tournament = await dbContext.Tournaments.FindAsync([tournamentId], cancellationToken);
        if (tournament is null)
        {
            return false;
        }

        if (dbContext.Database.IsRelational())
        {
            await dbContext.Matches
                .Where(match => match.TournamentId == tournamentId)
                .ExecuteDeleteAsync(cancellationToken);

            await dbContext.TournamentSyncRuns
                .Where(syncRun => syncRun.TournamentId == tournamentId)
                .ExecuteDeleteAsync(cancellationToken);

            await dbContext.TournamentTeams
                .Where(tournamentTeam => tournamentTeam.TournamentId == tournamentId)
                .ExecuteDeleteAsync(cancellationToken);

            await dbContext.TournamentStages
                .Where(stage => stage.TournamentId == tournamentId)
                .ExecuteDeleteAsync(cancellationToken);
        }
        else
        {
            dbContext.Matches.RemoveRange(dbContext.Matches.Where(match => match.TournamentId == tournamentId));
            dbContext.TournamentSyncRuns.RemoveRange(dbContext.TournamentSyncRuns.Where(syncRun => syncRun.TournamentId == tournamentId));
            dbContext.TournamentTeams.RemoveRange(dbContext.TournamentTeams.Where(tournamentTeam => tournamentTeam.TournamentId == tournamentId));
            dbContext.TournamentStages.RemoveRange(dbContext.TournamentStages.Where(stage => stage.TournamentId == tournamentId));
        }

        dbContext.Tournaments.Remove(tournament);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<Model.Entities.Tournament> LoadDetailsQuery()
    {
        return dbContext.Tournaments
            .Include(tournament => tournament.Stages)
            .Include(tournament => tournament.TournamentTeams)
            .ThenInclude(tournamentTeam => tournamentTeam.Team);
    }

    private static string KeepExistingWhenBlank(string discoveredValue, string existingValue)
    {
        return string.IsNullOrWhiteSpace(discoveredValue) ? existingValue : discoveredValue;
    }
}
