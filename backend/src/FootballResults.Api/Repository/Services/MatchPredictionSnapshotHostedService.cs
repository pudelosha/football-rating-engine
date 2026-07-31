using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Repository.Services;

public sealed class MatchPredictionSnapshotHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<MatchPredictionSnapshotHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var syncOptions = options.Value;
            var configuration = await GetConfigurationAsync(syncOptions, stoppingToken);

            if (configuration.IsEnabled)
            {
                await CaptureSnapshotsAsync(stoppingToken);
            }
            else
            {
                logger.LogInformation("{ServiceName} is disabled.", nameof(MatchPredictionSnapshotHostedService));
            }

            await Task.Delay(TimeSpan.FromMinutes(configuration.IntervalMinutes), stoppingToken);
        }
    }

    private async Task CaptureSnapshotsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var snapshotService = scope.ServiceProvider.GetRequiredService<IMatchPredictionSnapshotService>();
            var capturedCount = await snapshotService.CaptureMissingFinishedMatchSnapshotsAsync(cancellationToken);

            if (capturedCount > 0)
            {
                logger.LogInformation("Captured match prediction snapshots. New snapshots: {CapturedCount}.", capturedCount);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{ServiceName} failed.", nameof(MatchPredictionSnapshotHostedService));
        }
    }

    private async Task<HostedSyncServiceConfiguration> GetConfigurationAsync(
        TournamentSyncOptions syncOptions,
        CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var configuration = await dbContext.SyncServiceConfigurations
            .AsNoTracking()
            .FirstOrDefaultAsync(configuration => configuration.ServiceKey == SyncServiceKeys.PredictionSnapshot, cancellationToken);

        return configuration is null
            ? new HostedSyncServiceConfiguration(syncOptions.EnablePredictionSnapshot, SecondsToMinutes(syncOptions.PredictionSnapshotIntervalSeconds))
            : new HostedSyncServiceConfiguration(configuration.IsEnabled, Math.Max(1, configuration.IntervalMinutes));
    }

    private static int SecondsToMinutes(int seconds)
    {
        return Math.Max(1, (int)Math.Ceiling(Math.Max(1, seconds) / 60.0));
    }

    private sealed record HostedSyncServiceConfiguration(bool IsEnabled, int IntervalMinutes);
}
