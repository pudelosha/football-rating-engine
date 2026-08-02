using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Repository.Services;

public sealed class RatingAutomationHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<RatingAutomationHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var syncOptions = options.Value;
            var configuration = await GetConfigurationAsync(syncOptions, stoppingToken);

            if (configuration.IsEnabled)
            {
                await RebuildRatingsAsync(stoppingToken);
            }
            else
            {
                logger.LogInformation("{ServiceName} is disabled.", nameof(RatingAutomationHostedService));
            }

            await Task.Delay(TimeSpan.FromMinutes(configuration.IntervalMinutes), stoppingToken);
        }
    }

    private async Task RebuildRatingsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var ratingAutomationService = scope.ServiceProvider.GetRequiredService<IRatingAutomationService>();
            var changedCount = await ratingAutomationService.RebuildStaleTournamentRatingsAsync(cancellationToken);

            if (changedCount > 0)
            {
                logger.LogInformation("Rating automation rebuilt stale tournament ratings. Tournaments changed: {ChangedCount}.", changedCount);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{ServiceName} failed.", nameof(RatingAutomationHostedService));
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
            .FirstOrDefaultAsync(configuration => configuration.ServiceKey == SyncServiceKeys.RatingAutomation, cancellationToken);

        return configuration is null
            ? new HostedSyncServiceConfiguration(syncOptions.EnableRatingAutomation, SecondsToMinutes(syncOptions.RatingAutomationIntervalSeconds))
            : new HostedSyncServiceConfiguration(configuration.IsEnabled, Math.Max(1, configuration.IntervalMinutes));
    }

    private static int SecondsToMinutes(int seconds)
    {
        return Math.Max(1, (int)Math.Ceiling(Math.Max(1, seconds) / 60.0));
    }

    private sealed record HostedSyncServiceConfiguration(bool IsEnabled, int IntervalMinutes);
}
