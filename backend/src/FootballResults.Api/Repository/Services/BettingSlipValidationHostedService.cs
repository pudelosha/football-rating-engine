using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Repository.Services;

public sealed class BettingSlipValidationHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<TournamentSyncOptions> options,
    ILogger<BettingSlipValidationHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var syncOptions = options.Value;
            var configuration = await GetConfigurationAsync(syncOptions, stoppingToken);

            if (configuration.IsEnabled)
            {
                await ValidateSlipsAsync(stoppingToken);
            }
            else
            {
                logger.LogInformation("{ServiceName} is disabled.", nameof(BettingSlipValidationHostedService));
            }

            await Task.Delay(TimeSpan.FromMinutes(configuration.IntervalMinutes), stoppingToken);
        }
    }

    private async Task ValidateSlipsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var settlementService = scope.ServiceProvider.GetRequiredService<IBettingSlipSettlementService>();
            var changedCount = await settlementService.ValidatePendingAndLockedSlipsAsync(cancellationToken);

            if (changedCount > 0)
            {
                logger.LogInformation("Validated betting slips. Changed slips: {ChangedCount}.", changedCount);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{ServiceName} failed.", nameof(BettingSlipValidationHostedService));
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
            .FirstOrDefaultAsync(configuration => configuration.ServiceKey == SyncServiceKeys.SlipValidator, cancellationToken);

        return configuration is null
            ? new HostedSyncServiceConfiguration(syncOptions.EnableSlipValidation, SecondsToMinutes(syncOptions.SlipValidationIntervalSeconds))
            : new HostedSyncServiceConfiguration(configuration.IsEnabled, Math.Max(1, configuration.IntervalMinutes));
    }

    private static int SecondsToMinutes(int seconds)
    {
        return Math.Max(1, (int)Math.Ceiling(Math.Max(1, seconds) / 60.0));
    }

    private sealed record HostedSyncServiceConfiguration(bool IsEnabled, int IntervalMinutes);
}
