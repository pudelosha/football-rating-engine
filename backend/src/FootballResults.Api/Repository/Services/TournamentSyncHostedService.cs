using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Repository.Services;

public abstract class TournamentSyncHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger logger) : BackgroundService
{
    protected abstract TournamentSyncMode Mode { get; }
    protected abstract bool IsEnabled(TournamentSyncOptions options);
    protected abstract TimeSpan GetInterval(TournamentSyncOptions options);
    protected virtual Task<List<int>> GetTournamentIdsAsync(
        AppDbContext dbContext,
        TournamentSyncOptions options,
        CancellationToken cancellationToken)
    {
        return dbContext.Tournaments
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var syncOptions = options.Value;
        if (!IsEnabled(syncOptions))
        {
            logger.LogInformation("{ServiceName} is disabled.", GetType().Name);
            return;
        }

        using var timer = new PeriodicTimer(GetInterval(syncOptions));
        do
        {
            await SyncAllTournamentsAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task SyncAllTournamentsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var syncService = scope.ServiceProvider.GetRequiredService<ITournamentSyncService>();
            var tournamentIds = await GetTournamentIdsAsync(dbContext, options.Value, cancellationToken);

            foreach (var tournamentId in tournamentIds)
            {
                await syncService.SyncAsync(tournamentId, Mode, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{ServiceName} failed.", GetType().Name);
        }
    }
}

public sealed class TournamentScheduleSyncHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<TournamentScheduleSyncHostedService> logger)
    : TournamentSyncHostedService(scopeFactory, options, logger)
{
    protected override TournamentSyncMode Mode => TournamentSyncMode.Schedule;
    protected override bool IsEnabled(TournamentSyncOptions options) => options.EnableScheduleSync;
    protected override TimeSpan GetInterval(TournamentSyncOptions options) => TimeSpan.FromSeconds(Math.Max(1, options.ScheduleIntervalSeconds));
}

public sealed class LiveMatchSyncHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<LiveMatchSyncHostedService> logger)
    : TournamentSyncHostedService(scopeFactory, options, logger)
{
    protected override TournamentSyncMode Mode => TournamentSyncMode.Live;
    protected override bool IsEnabled(TournamentSyncOptions options) => options.EnableLiveSync;
    protected override TimeSpan GetInterval(TournamentSyncOptions options) => TimeSpan.FromSeconds(Math.Max(1, options.LiveIntervalSeconds));

    protected override Task<List<int>> GetTournamentIdsAsync(
        AppDbContext dbContext,
        TournamentSyncOptions options,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var liveWindowStart = now.AddMinutes(Math.Max(0, options.LiveStartsBeforeMinutes));

        return dbContext.Tournaments
            .Where(tournament => tournament.Matches.Any(match =>
                match.Status == MatchStatus.Live ||
                match.SyncState == MatchSyncState.Live ||
                (match.KickoffUtc <= liveWindowStart &&
                    match.Status != MatchStatus.Finished &&
                    match.Status != MatchStatus.Cancelled &&
                    match.Status != MatchStatus.Postponed &&
                    match.SyncState != MatchSyncState.Finalized &&
                    match.SyncState != MatchSyncState.Cancelled &&
                    match.SyncState != MatchSyncState.Postponed)))
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);
    }
}

public sealed class MatchFinalizationHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<MatchFinalizationHostedService> logger)
    : TournamentSyncHostedService(scopeFactory, options, logger)
{
    protected override TournamentSyncMode Mode => TournamentSyncMode.Finalize;
    protected override bool IsEnabled(TournamentSyncOptions options) => options.EnableFinalizeSync;
    protected override TimeSpan GetInterval(TournamentSyncOptions options) => TimeSpan.FromSeconds(Math.Max(1, options.FinalizeIntervalSeconds));

    protected override Task<List<int>> GetTournamentIdsAsync(
        AppDbContext dbContext,
        TournamentSyncOptions options,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var liveWindowStart = now.AddMinutes(Math.Max(0, options.LiveStartsBeforeMinutes));

        return dbContext.Tournaments
            .Where(tournament => tournament.Matches.Any(match =>
                match.Status == MatchStatus.Live ||
                match.SyncState == MatchSyncState.Live ||
                (match.KickoffUtc <= liveWindowStart &&
                    match.Status != MatchStatus.Cancelled &&
                    match.Status != MatchStatus.Postponed &&
                    match.SyncState != MatchSyncState.Cancelled &&
                    match.SyncState != MatchSyncState.Postponed &&
                    match.SyncState != MatchSyncState.Finalized) ||
                (match.Status == MatchStatus.Finished &&
                    (!match.RegularTimeHomeScore.HasValue ||
                        !match.RegularTimeAwayScore.HasValue ||
                        match.Statistics == null))))
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);
    }
}

public sealed class ResultsReconciliationHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<ResultsReconciliationHostedService> logger)
    : TournamentSyncHostedService(scopeFactory, options, logger)
{
    protected override TournamentSyncMode Mode => TournamentSyncMode.Results;
    protected override bool IsEnabled(TournamentSyncOptions options) => options.EnableResultsSync;
    protected override TimeSpan GetInterval(TournamentSyncOptions options) => TimeSpan.FromSeconds(Math.Max(1, options.ResultsIntervalSeconds));
}
