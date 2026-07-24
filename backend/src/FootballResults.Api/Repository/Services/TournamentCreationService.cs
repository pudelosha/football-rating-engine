using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class TournamentCreationService(
    AppDbContext dbContext,
    ILiveScoreTournamentDiscoveryService discoveryService,
    ITournamentSyncService tournamentSyncService) : ITournamentCreationService
{
    public async Task<TournamentDetailsDto> CreateAsync(CreateTournamentRequest request, CancellationToken cancellationToken)
    {
        var preview = await discoveryService.DiscoverAsync(
            request.LiveScoreUrl,
            request.Locale,
            request.TimezoneOffset,
            cancellationToken);

        var existing = await dbContext.Tournaments
            .Include(tournament => tournament.Stages)
            .Include(tournament => tournament.TournamentTeams)
            .ThenInclude(tournamentTeam => tournamentTeam.Team)
            .FirstOrDefaultAsync(
                tournament =>
                    tournament.LiveScoreCompetitionId == preview.LiveScoreCompetitionId ||
                    tournament.BaseUrl == preview.BaseUrl,
                cancellationToken);

        if (existing is not null)
        {
            return DtoMapper.ToDetailsDto(existing);
        }

        var now = DateTimeOffset.UtcNow;
        var tournament = new Tournament
        {
            LiveScoreCompetitionId = preview.LiveScoreCompetitionId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? preview.Name : request.Name,
            CompetitionName = preview.CompetitionName,
            CompetitionCountry = preview.CompetitionCountry,
            CompetitionUrlName = preview.CompetitionUrlName,
            CategoryCode = preview.CategoryCode,
            CategoryName = preview.CategoryName,
            CategoryTransliteratedName = preview.CategoryTransliteratedName,
            BaseUrl = preview.BaseUrl,
            FixturesUrl = preview.FixturesUrl,
            ResultsUrl = preview.ResultsUrl,
            ApiBaseUrl = preview.ApiBaseUrl,
            Locale = preview.Locale,
            TimezoneOffset = preview.TimezoneOffset,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        dbContext.Tournaments.Add(tournament);
        await dbContext.SaveChangesAsync(cancellationToken);

        await tournamentSyncService.SyncAsync(tournament.Id, TournamentSyncMode.Full, cancellationToken);

        var syncedTournament = await dbContext.Tournaments
            .Include(item => item.Stages)
            .Include(item => item.TournamentTeams)
            .ThenInclude(tournamentTeam => tournamentTeam.Team)
            .FirstAsync(item => item.Id == tournament.Id, cancellationToken);

        return DtoMapper.ToDetailsDto(syncedTournament);
    }
}
