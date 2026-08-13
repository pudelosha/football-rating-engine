using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Repository.Services;

public sealed class TournamentSyncService(
    AppDbContext dbContext,
    ILiveScoreClient liveScoreClient,
    IBettingSlipSettlementService bettingSlipSettlementService,
    IMatchPredictionSnapshotService matchPredictionSnapshotService,
    IOptions<TournamentSyncOptions> options) : ITournamentSyncService
{
    public async Task<SyncTournamentResponse> SyncAsync(
        int tournamentId,
        TournamentSyncMode mode,
        CancellationToken cancellationToken)
    {
        var tournament = await dbContext.Tournaments
            .Include(tournament => tournament.Stages)
            .Include(tournament => tournament.Matches)
            .ThenInclude(match => match.Statistics)
            .FirstOrDefaultAsync(tournament => tournament.Id == tournamentId, cancellationToken);

        if (tournament is null)
        {
            throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");
        }

        var syncRun = new TournamentSyncRun
        {
            TournamentId = tournamentId,
            Mode = mode,
            Status = TournamentSyncRunStatus.Running,
            StartedAtUtc = DateTimeOffset.UtcNow
        };

        dbContext.TournamentSyncRuns.Add(syncRun);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var rows = await FetchRowsForModeAsync(tournament, mode, cancellationToken);
            var result = await UpsertRowsAsync(tournament, rows, cancellationToken);
            if (mode is TournamentSyncMode.Finalize or TournamentSyncMode.Results)
            {
                await EnrichFinishedMatchStatisticsAsync(tournament, cancellationToken);
            }

            syncRun.InsertedMatches = result.Inserted;
            syncRun.UpdatedMatches = result.Updated;
            syncRun.UnchangedMatches = result.Unchanged;
            syncRun.Status = TournamentSyncRunStatus.Succeeded;
            syncRun.FinishedAtUtc = DateTimeOffset.UtcNow;

            tournament.LastSyncedAtUtc = syncRun.FinishedAtUtc;
            tournament.UpdatedAtUtc = syncRun.FinishedAtUtc.Value;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            syncRun.Status = TournamentSyncRunStatus.Failed;
            syncRun.FinishedAtUtc = DateTimeOffset.UtcNow;
            syncRun.ErrorMessage = ex.Message;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        if (mode is TournamentSyncMode.Live or TournamentSyncMode.Finalize or TournamentSyncMode.Results)
        {
            await matchPredictionSnapshotService.CaptureMissingFinishedMatchSnapshotsAsync(tournamentId, cancellationToken);
            await bettingSlipSettlementService.ValidatePendingAndLockedSlipsAsync(cancellationToken);
        }

        return new SyncTournamentResponse(
            syncRun.Id,
            syncRun.TournamentId,
            syncRun.Mode,
            syncRun.Status,
            syncRun.InsertedMatches,
            syncRun.UpdatedMatches,
            syncRun.UnchangedMatches,
            syncRun.ErrorMessage);
    }

    public async Task<SyncAllTournamentsResponse> SyncAllActiveAsync(
        TournamentSyncMode mode,
        CancellationToken cancellationToken)
    {
        var tournamentIds = await dbContext.Tournaments
            .Where(tournament => tournament.IsActive)
            .OrderBy(tournament => tournament.Name)
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);

        var results = new List<SyncTournamentResponse>();
        foreach (var tournamentId in tournamentIds)
        {
            results.Add(await SyncAsync(tournamentId, mode, cancellationToken));
        }

        return new SyncAllTournamentsResponse(
            mode,
            tournamentIds.Count,
            results.Count(result => result.Status == TournamentSyncRunStatus.Succeeded),
            results.Count(result => result.Status == TournamentSyncRunStatus.Failed),
            results.Sum(result => result.InsertedMatches),
            results.Sum(result => result.UpdatedMatches),
            results.Sum(result => result.UnchangedMatches),
            results);
    }

    public async Task<IReadOnlyList<TournamentSyncRunDto>> GetTournamentSyncRunsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var syncRuns = await dbContext.TournamentSyncRuns
            .Where(syncRun => syncRun.TournamentId == tournamentId)
            .OrderByDescending(syncRun => syncRun.StartedAtUtc)
            .ToListAsync(cancellationToken);

        return syncRuns.Select(DtoMapper.ToSyncRunDto).ToList();
    }

    public async Task<IReadOnlyList<TournamentSyncRunSummaryDto>> GetRecentSyncRunsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var take = Math.Clamp(limit, 1, 100);
        var syncRuns = await dbContext.TournamentSyncRuns
            .Include(syncRun => syncRun.Tournament)
            .OrderByDescending(syncRun => syncRun.StartedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

        return syncRuns
            .Select(syncRun => new TournamentSyncRunSummaryDto(
                syncRun.Id,
                syncRun.TournamentId,
                syncRun.Tournament.Name,
                syncRun.Mode,
                syncRun.Status,
                syncRun.StartedAtUtc,
                syncRun.FinishedAtUtc,
                syncRun.InsertedMatches,
                syncRun.UpdatedMatches,
                syncRun.UnchangedMatches,
                syncRun.ErrorMessage))
            .ToList();
    }

    public async Task<IReadOnlyList<SyncServiceHealthDto>> GetServiceHealthAsync(CancellationToken cancellationToken)
    {
        var syncOptions = options.Value;
        var now = DateTimeOffset.UtcNow;
        var since = now.AddHours(-24);
        var activeTournamentCount = await dbContext.Tournaments.CountAsync(tournament => tournament.IsActive, cancellationToken);
        var configurations = await dbContext.SyncServiceConfigurations.ToListAsync(cancellationToken);
        var scheduleConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.Schedule, syncOptions.EnableScheduleSync, syncOptions.ScheduleIntervalSeconds);
        var liveConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.Live, syncOptions.EnableLiveSync, syncOptions.LiveIntervalSeconds);
        var finalizeConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.Finalize, syncOptions.EnableFinalizeSync, syncOptions.FinalizeIntervalSeconds);
        var resultsConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.Results, syncOptions.EnableResultsSync, syncOptions.ResultsIntervalSeconds);
        var slipValidatorConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.SlipValidator, syncOptions.EnableSlipValidation, syncOptions.SlipValidationIntervalSeconds);
        var predictionSnapshotConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.PredictionSnapshot, syncOptions.EnablePredictionSnapshot, syncOptions.PredictionSnapshotIntervalSeconds);
        var ratingAutomationConfig = GetEffectiveConfiguration(configurations, SyncServiceKeys.RatingAutomation, syncOptions.EnableRatingAutomation, syncOptions.RatingAutomationIntervalSeconds);

        var syncRuns = await dbContext.TournamentSyncRuns
            .Where(syncRun => syncRun.StartedAtUtc >= since)
            .OrderByDescending(syncRun => syncRun.StartedAtUtc)
            .ToListAsync(cancellationToken);

        var latestByMode = await dbContext.TournamentSyncRuns
            .GroupBy(syncRun => syncRun.Mode)
            .Select(group => group
                .OrderByDescending(syncRun => syncRun.StartedAtUtc)
                .First())
            .ToListAsync(cancellationToken);

        var latestSuccessByMode = await dbContext.TournamentSyncRuns
            .Where(syncRun => syncRun.Status == TournamentSyncRunStatus.Succeeded)
            .GroupBy(syncRun => syncRun.Mode)
            .Select(group => group
                .OrderByDescending(syncRun => syncRun.StartedAtUtc)
                .First())
            .ToListAsync(cancellationToken);

        var latestFailureByMode = await dbContext.TournamentSyncRuns
            .Where(syncRun => syncRun.Status == TournamentSyncRunStatus.Failed)
            .GroupBy(syncRun => syncRun.Mode)
            .Select(group => group
                .OrderByDescending(syncRun => syncRun.StartedAtUtc)
                .First())
            .ToListAsync(cancellationToken);

        var liveEligibleCount = await CountLiveEligibleTournamentsAsync(syncOptions, cancellationToken);
        var finalizeEligibleCount = await CountFinalizeEligibleTournamentsAsync(syncOptions, cancellationToken);
        var slipEligibleCount = await CountSlipValidationEligibleAsync(cancellationToken);
        var predictionSnapshotEligibleCount = await CountPredictionSnapshotEligibleAsync(cancellationToken);
        var ratingAutomationEligibleCount = await CountRatingAutomationEligibleAsync(cancellationToken);
        var latestRatingRun = await GetLatestRatingRunAsync(null, cancellationToken);
        var latestSuccessfulRatingRun = await GetLatestRatingRunAsync(EloRatingRunStatus.Succeeded, cancellationToken);
        var latestFailedRatingRun = await GetLatestRatingRunAsync(EloRatingRunStatus.Failed, cancellationToken);
        var ratingRunsLast24Hours = await CountRatingRunsSinceAsync(since, null, cancellationToken);
        var ratingFailuresLast24Hours = await CountRatingRunsSinceAsync(since, EloRatingRunStatus.Failed, cancellationToken);

        return
        [
            BuildServiceHealth(
                SyncServiceKeys.Schedule,
                "Schedule sync service",
                TournamentSyncMode.Schedule,
                scheduleConfig.IsEnabled,
                scheduleConfig.IntervalMinutes,
                activeTournamentCount,
                activeTournamentCount,
                "Refreshes future fixtures, kickoff changes, postponed matches, and unknown qualified teams.",
                latestByMode,
                latestSuccessByMode,
                latestFailureByMode,
                syncRuns,
                now),
            BuildServiceHealth(
                SyncServiceKeys.Live,
                "Live results service",
                TournamentSyncMode.Live,
                liveConfig.IsEnabled,
                liveConfig.IntervalMinutes,
                activeTournamentCount,
                liveEligibleCount,
                $"Checks active tournaments from {Math.Max(0, syncOptions.LiveStartsBeforeMinutes)} minutes before kickoff.",
                latestByMode,
                latestSuccessByMode,
                latestFailureByMode,
                syncRuns,
                now),
            BuildServiceHealth(
                SyncServiceKeys.Finalize,
                "Match finalizer service",
                TournamentSyncMode.Finalize,
                finalizeConfig.IsEnabled,
                finalizeConfig.IntervalMinutes,
                activeTournamentCount,
                finalizeEligibleCount,
                "Confirms finished matches and enriches final details when required.",
                latestByMode,
                latestSuccessByMode,
                latestFailureByMode,
                syncRuns,
                now),
            BuildServiceHealth(
                SyncServiceKeys.Results,
                "Results safety net service",
                TournamentSyncMode.Results,
                resultsConfig.IsEnabled,
                resultsConfig.IntervalMinutes,
                activeTournamentCount,
                activeTournamentCount,
                "Daily reconciliation for completed matches and late result corrections.",
                latestByMode,
                latestSuccessByMode,
                latestFailureByMode,
                syncRuns,
                now),
            BuildDetailsExtractorHealth(
                syncOptions,
                finalizeConfig,
                activeTournamentCount,
                finalizeEligibleCount,
                latestByMode,
                latestSuccessByMode,
                latestFailureByMode,
                syncRuns,
                now),
            new SyncServiceHealthDto(
                SyncServiceKeys.SlipValidator,
                "Betting slip validator",
                null,
                slipValidatorConfig.IsEnabled,
                slipValidatorConfig.IsEnabled ? "Healthy" : "Disabled",
                slipValidatorConfig.IntervalMinutes,
                null,
                null,
                null,
                string.Empty,
                activeTournamentCount,
                slipEligibleCount,
                0,
                0,
                "Locks slips after first kickoff and settles them as won or lost when all selected matches are final."),
            new SyncServiceHealthDto(
                SyncServiceKeys.PredictionSnapshot,
                "Prediction snapshot service",
                null,
                predictionSnapshotConfig.IsEnabled,
                predictionSnapshotConfig.IsEnabled ? "Healthy" : "Disabled",
                predictionSnapshotConfig.IntervalMinutes,
                null,
                null,
                null,
                string.Empty,
                activeTournamentCount,
                predictionSnapshotEligibleCount,
                0,
                0,
                "Stores immutable 1X2 prediction snapshots for finished matches before later rating rebuilds can change the model view."),
            new SyncServiceHealthDto(
                SyncServiceKeys.RatingAutomation,
                "Rating automation service",
                null,
                ratingAutomationConfig.IsEnabled,
                GetBackgroundServiceStatus(ratingAutomationConfig.IsEnabled, latestRatingRun),
                ratingAutomationConfig.IntervalMinutes,
                latestRatingRun?.StartedAtUtc,
                latestSuccessfulRatingRun?.FinishedAtUtc,
                latestFailedRatingRun?.FinishedAtUtc,
                latestFailedRatingRun?.ErrorMessage ?? string.Empty,
                activeTournamentCount,
                ratingAutomationEligibleCount,
                ratingRunsLast24Hours,
                ratingFailuresLast24Hours,
                "Automatically rebuilds Base Elo, Form, and Performance layers when finished match results or statistics change. Squad snapshots stay manual.")
        ];
    }

    public async Task<SyncServiceConfigurationDto?> UpdateServiceConfigurationAsync(
        string serviceKey,
        UpdateSyncServiceConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedKey = serviceKey.Trim().ToLowerInvariant();
        if (!IsConfigurableService(normalizedKey))
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        var intervalMinutes = Math.Clamp(request.IntervalMinutes, 1, 1440);
        var configuration = await dbContext.SyncServiceConfigurations
            .FirstOrDefaultAsync(configuration => configuration.ServiceKey == normalizedKey, cancellationToken);

        if (configuration is null)
        {
            configuration = new SyncServiceConfiguration
            {
                ServiceKey = normalizedKey,
                CreatedAtUtc = now
            };
            dbContext.SyncServiceConfigurations.Add(configuration);
        }

        configuration.IsEnabled = request.IsEnabled;
        configuration.IntervalMinutes = intervalMinutes;
        configuration.UpdatedAtUtc = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        return new SyncServiceConfigurationDto(
            configuration.ServiceKey,
            configuration.IsEnabled,
            configuration.IntervalMinutes,
            configuration.UpdatedAtUtc);
    }

    public async Task<TournamentSyncRunDto?> GetSyncRunAsync(int syncRunId, CancellationToken cancellationToken)
    {
        var syncRun = await dbContext.TournamentSyncRuns.FindAsync([syncRunId], cancellationToken);
        return syncRun is null ? null : DtoMapper.ToSyncRunDto(syncRun);
    }

    private static SyncServiceHealthDto BuildServiceHealth(
        string serviceKey,
        string serviceName,
        TournamentSyncMode mode,
        bool isEnabled,
        int intervalMinutes,
        int activeTournamentCount,
        int eligibleTournamentCount,
        string notes,
        IReadOnlyList<TournamentSyncRun> latestByMode,
        IReadOnlyList<TournamentSyncRun> latestSuccessByMode,
        IReadOnlyList<TournamentSyncRun> latestFailureByMode,
        IReadOnlyList<TournamentSyncRun> last24Hours,
        DateTimeOffset now)
    {
        var latest = latestByMode.FirstOrDefault(syncRun => syncRun.Mode == mode);
        var latestSuccess = latestSuccessByMode.FirstOrDefault(syncRun => syncRun.Mode == mode);
        var latestFailure = latestFailureByMode.FirstOrDefault(syncRun => syncRun.Mode == mode);
        var runsLast24Hours = last24Hours.Count(syncRun => syncRun.Mode == mode);
        var failuresLast24Hours = last24Hours.Count(syncRun => syncRun.Mode == mode && syncRun.Status == TournamentSyncRunStatus.Failed);

        var status = GetServiceStatus(isEnabled, latest, intervalMinutes, now);

        return new SyncServiceHealthDto(
            serviceKey,
            serviceName,
            mode,
            isEnabled,
            status,
            intervalMinutes,
            latest?.StartedAtUtc,
            latestSuccess?.FinishedAtUtc,
            latestFailure?.FinishedAtUtc,
            latestFailure?.ErrorMessage ?? string.Empty,
            activeTournamentCount,
            eligibleTournamentCount,
            runsLast24Hours,
            failuresLast24Hours,
            notes);
    }

    private static SyncServiceHealthDto BuildDetailsExtractorHealth(
        TournamentSyncOptions syncOptions,
        EffectiveSyncServiceConfiguration finalizeConfig,
        int activeTournamentCount,
        int eligibleTournamentCount,
        IReadOnlyList<TournamentSyncRun> latestByMode,
        IReadOnlyList<TournamentSyncRun> latestSuccessByMode,
        IReadOnlyList<TournamentSyncRun> latestFailureByMode,
        IReadOnlyList<TournamentSyncRun> last24Hours,
        DateTimeOffset now)
    {
        var finalizeHealth = BuildServiceHealth(
            "match-details-extractor",
            "Match details extractor",
            TournamentSyncMode.Finalize,
            finalizeConfig.IsEnabled,
            finalizeConfig.IntervalMinutes,
            activeTournamentCount,
            eligibleTournamentCount,
            $"Runs inside finalize/results processing after roughly {Math.Max(0, syncOptions.StatisticsDelayAfterFinishedMinutes)} minutes for finished matches that need statistics or extra-time details.",
            latestByMode,
            latestSuccessByMode,
            latestFailureByMode,
            last24Hours,
            now);

        return finalizeHealth with { Mode = null };
    }

    private static string GetServiceStatus(bool isEnabled, TournamentSyncRun? latest, int intervalMinutes, DateTimeOffset now)
    {
        if (!isEnabled)
        {
            return "Disabled";
        }

        if (latest?.Status == TournamentSyncRunStatus.Running)
        {
            return "Running";
        }

        if (latest is null)
        {
            return "Waiting";
        }

        var expectedInterval = TimeSpan.FromMinutes(Math.Max(1, intervalMinutes));
        var staleAfter = expectedInterval + TimeSpan.FromMinutes(5);
        if (now - latest.StartedAtUtc > staleAfter)
        {
            return "Stale";
        }

        return latest.Status == TournamentSyncRunStatus.Failed ? "Failing" : "Healthy";
    }

    private static string GetBackgroundServiceStatus(bool isEnabled, RatingRunHealthSnapshot? latest)
    {
        if (!isEnabled)
        {
            return "Disabled";
        }

        if (latest?.Status == EloRatingRunStatus.Running)
        {
            return "Running";
        }

        if (latest is null)
        {
            return "Waiting";
        }

        return latest.Status == EloRatingRunStatus.Failed ? "Failing" : "Healthy";
    }

    private static EffectiveSyncServiceConfiguration GetEffectiveConfiguration(
        IReadOnlyList<SyncServiceConfiguration> configurations,
        string serviceKey,
        bool defaultEnabled,
        int defaultIntervalSeconds)
    {
        var configuration = configurations.FirstOrDefault(configuration => configuration.ServiceKey == serviceKey);
        return configuration is null
            ? new EffectiveSyncServiceConfiguration(defaultEnabled, SecondsToMinutes(defaultIntervalSeconds))
            : new EffectiveSyncServiceConfiguration(configuration.IsEnabled, Math.Max(1, configuration.IntervalMinutes));
    }

    private static int SecondsToMinutes(int seconds)
    {
        return Math.Max(1, (int)Math.Ceiling(Math.Max(1, seconds) / 60.0));
    }

    private static bool IsConfigurableService(string serviceKey)
    {
        return serviceKey is SyncServiceKeys.Schedule
            or SyncServiceKeys.Live
            or SyncServiceKeys.Finalize
            or SyncServiceKeys.Results
            or SyncServiceKeys.SlipValidator
            or SyncServiceKeys.PredictionSnapshot
            or SyncServiceKeys.RatingAutomation;
    }

    private sealed record EffectiveSyncServiceConfiguration(bool IsEnabled, int IntervalMinutes);

    private sealed record RatingRunHealthSnapshot(
        EloRatingRunStatus Status,
        DateTimeOffset StartedAtUtc,
        DateTimeOffset? FinishedAtUtc,
        string ErrorMessage);

    private Task<int> CountLiveEligibleTournamentsAsync(TournamentSyncOptions syncOptions, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var liveWindowStart = now.AddMinutes(Math.Max(0, syncOptions.LiveStartsBeforeMinutes));

        return dbContext.Tournaments
            .Where(tournament => tournament.IsActive)
            .CountAsync(tournament => tournament.Matches.Any(match =>
                match.Status == MatchStatus.Live ||
                match.SyncState == MatchSyncState.Live ||
                (match.KickoffUtc <= liveWindowStart &&
                    match.Status != MatchStatus.Finished &&
                    match.Status != MatchStatus.Cancelled &&
                    match.Status != MatchStatus.Postponed &&
                    match.SyncState != MatchSyncState.Finalized &&
                    match.SyncState != MatchSyncState.Cancelled &&
                    match.SyncState != MatchSyncState.Postponed)), cancellationToken);
    }

    private Task<int> CountFinalizeEligibleTournamentsAsync(TournamentSyncOptions syncOptions, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var liveWindowStart = now.AddMinutes(Math.Max(0, syncOptions.LiveStartsBeforeMinutes));

        return dbContext.Tournaments
            .Where(tournament => tournament.IsActive)
            .CountAsync(tournament => tournament.Matches.Any(match =>
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
                        match.Statistics == null))), cancellationToken);
    }

    private Task<int> CountSlipValidationEligibleAsync(CancellationToken cancellationToken)
    {
        return dbContext.BettingCoupons
            .CountAsync(coupon => coupon.Status == BettingCouponStatus.Pending || coupon.Status == BettingCouponStatus.Locked, cancellationToken);
    }

    private Task<int> CountPredictionSnapshotEligibleAsync(CancellationToken cancellationToken)
    {
        return dbContext.Matches
            .CountAsync(match =>
                match.Status == MatchStatus.Finished &&
                match.HomeTeamId.HasValue &&
                match.AwayTeamId.HasValue &&
                match.PredictionSnapshot == null,
                cancellationToken);
    }

    private async Task<int> CountRatingAutomationEligibleAsync(CancellationToken cancellationToken)
    {
        var latestFinishedMatches = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                match.Tournament.IsActive &&
                match.Status == MatchStatus.Finished &&
                match.HomeTeamId.HasValue &&
                match.AwayTeamId.HasValue &&
                match.HomeScore.HasValue &&
                match.AwayScore.HasValue)
            .GroupBy(match => match.TournamentId)
            .Select(group => new
            {
                TournamentId = group.Key,
                EventId = group
                    .OrderByDescending(match => match.KickoffUtc)
                    .ThenByDescending(match => match.UpdatedAtUtc)
                    .Select(match => match.LiveScoreEventId)
                    .First(),
                SourceUtc = group.Max(match => match.UpdatedAtUtc)
            })
            .ToListAsync(cancellationToken);

        if (latestFinishedMatches.Count == 0)
        {
            return 0;
        }

        var tournamentIds = latestFinishedMatches.Select(match => match.TournamentId).ToList();
        var latestRatingRuns = await dbContext.EloRatingRuns
            .AsNoTracking()
            .Where(run =>
                tournamentIds.Contains(run.TournamentId) &&
                run.Status == EloRatingRunStatus.Succeeded &&
                run.FinishedAtUtc.HasValue)
            .Select(group => new
            {
                group.TournamentId,
                RunId = group.Id,
                FinishedAtUtc = group.FinishedAtUtc!.Value
            })
            .GroupBy(run => run.TournamentId)
            .Select(group => group.OrderByDescending(run => run.FinishedAtUtc).First())
            .ToListAsync(cancellationToken);

        var latestRunByTournament = latestRatingRuns.ToDictionary(run => run.TournamentId, run => run.FinishedAtUtc);
        var latestRunIds = latestRatingRuns.Select(run => run.RunId).ToList();
        var latestFinishedMatchEventIds = latestFinishedMatches
            .Select(match => match.EventId)
            .ToList();
        var coveredLatestMatchEventIds = await dbContext.MatchEloSnapshots
            .AsNoTracking()
            .Where(snapshot =>
                latestRunIds.Contains(snapshot.EloRatingRunId) &&
                latestFinishedMatchEventIds.Contains(snapshot.LiveScoreEventId))
            .Select(snapshot => snapshot.LiveScoreEventId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var coveredLatestMatchEventIdSet = coveredLatestMatchEventIds.ToHashSet(StringComparer.OrdinalIgnoreCase);

        return latestFinishedMatches.Count(match =>
            !latestRunByTournament.TryGetValue(match.TournamentId, out var latestRunUtc) ||
            match.SourceUtc > latestRunUtc ||
            !coveredLatestMatchEventIdSet.Contains(match.EventId));
    }

    private async Task<RatingRunHealthSnapshot?> GetLatestRatingRunAsync(
        EloRatingRunStatus? status,
        CancellationToken cancellationToken)
    {
        var latestBaseRun = await dbContext.EloRatingRuns
            .AsNoTracking()
            .Where(run => !status.HasValue || run.Status == status.Value)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new RatingRunHealthSnapshot(run.Status, run.StartedAtUtc, run.FinishedAtUtc, run.ErrorMessage))
            .FirstOrDefaultAsync(cancellationToken);

        var latestFormRun = await dbContext.FormRatingRuns
            .AsNoTracking()
            .Where(run => !status.HasValue || run.Status == status.Value)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new RatingRunHealthSnapshot(run.Status, run.StartedAtUtc, run.FinishedAtUtc, run.ErrorMessage))
            .FirstOrDefaultAsync(cancellationToken);

        var latestPerformanceRun = await dbContext.PerformanceRatingRuns
            .AsNoTracking()
            .Where(run => !status.HasValue || run.Status == status.Value)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new RatingRunHealthSnapshot(run.Status, run.StartedAtUtc, run.FinishedAtUtc, run.ErrorMessage))
            .FirstOrDefaultAsync(cancellationToken);

        return new[] { latestBaseRun, latestFormRun, latestPerformanceRun }
            .Where(run => run is not null)
            .OrderByDescending(run => run!.StartedAtUtc)
            .FirstOrDefault();
    }

    private async Task<int> CountRatingRunsSinceAsync(
        DateTimeOffset since,
        EloRatingRunStatus? status,
        CancellationToken cancellationToken)
    {
        var baseRunCount = await dbContext.EloRatingRuns.CountAsync(run =>
                run.StartedAtUtc >= since && (!status.HasValue || run.Status == status.Value),
                cancellationToken);
        var formRunCount = await dbContext.FormRatingRuns.CountAsync(run =>
                run.StartedAtUtc >= since && (!status.HasValue || run.Status == status.Value),
                cancellationToken);
        var performanceRunCount = await dbContext.PerformanceRatingRuns.CountAsync(run =>
                run.StartedAtUtc >= since && (!status.HasValue || run.Status == status.Value),
                cancellationToken);

        return baseRunCount + formRunCount + performanceRunCount;
    }

    private async Task<IReadOnlyList<LiveScoreFixtureRow>> FetchRowsForModeAsync(
        Tournament tournament,
        TournamentSyncMode mode,
        CancellationToken cancellationToken)
    {
        var skipDetailEventIds = tournament.Matches
            .Where(match =>
                match.Status == MatchStatus.Finished &&
                match.RegularTimeHomeScore.HasValue &&
                match.RegularTimeAwayScore.HasValue)
            .Select(match => match.LiveScoreEventId)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var rows = new List<LiveScoreFixtureRow>();
        foreach (var request in GetLiveScoreRequests(mode))
        {
            rows.AddRange(await liveScoreClient.GetCompetitionRowsAsync(
                tournament,
                request.ListType,
                request.EnrichScoreBreakdowns,
                skipDetailEventIds,
                cancellationToken));
        }

        return rows
            .Where(row => !string.IsNullOrWhiteSpace(row.EventId))
            .GroupBy(row => row.EventId, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.OrderByDescending(PreferredListTypeSortKey).First())
            .OrderBy(row => row.KickoffUtc)
            .ThenBy(row => row.EventId)
            .ToList();
    }

    private async Task<UpsertResult> UpsertRowsAsync(
        Tournament tournament,
        IReadOnlyList<LiveScoreFixtureRow> rows,
        CancellationToken cancellationToken)
    {
        var inserted = 0;
        var updated = 0;
        var unchanged = 0;
        var now = DateTimeOffset.UtcNow;

        UpdateTournamentMetadata(tournament, rows, now);

        var stagesByLiveScoreId = tournament.Stages
            .Where(stage => !string.IsNullOrWhiteSpace(stage.LiveScoreStageId))
            .ToDictionary(stage => stage.LiveScoreStageId, StringComparer.OrdinalIgnoreCase);

        var matchesByEventId = tournament.Matches
            .ToDictionary(match => match.LiveScoreEventId, StringComparer.OrdinalIgnoreCase);

        var teamIds = rows
            .SelectMany(row => new[] { row.HomeTeamId, row.AwayTeamId })
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var teamNamesWithoutIds = rows
            .SelectMany(row => new[] { (row.HomeTeamId, row.HomeTeam), (row.AwayTeamId, row.AwayTeam) })
            .Where(team => string.IsNullOrWhiteSpace(team.Item1) && !string.IsNullOrWhiteSpace(team.Item2))
            .Select(team => team.Item2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existingTeams = await dbContext.Teams
            .Where(team =>
                (team.LiveScoreTeamId != null && teamIds.Contains(team.LiveScoreTeamId)) ||
                (team.LiveScoreTeamId == null && teamNamesWithoutIds.Contains(team.Name)))
            .ToListAsync(cancellationToken);

        var teamsByKey = existingTeams.ToDictionary(TeamLookupKey, StringComparer.OrdinalIgnoreCase);
        var tournamentTeams = await dbContext.TournamentTeams
            .Where(tournamentTeam => tournamentTeam.TournamentId == tournament.Id)
            .ToListAsync(cancellationToken);
        var tournamentTeamIds = tournamentTeams
            .Select(tournamentTeam => tournamentTeam.TeamId)
            .ToHashSet();

        foreach (var row in rows)
        {
            var stage = UpsertStage(tournament, row, stagesByLiveScoreId, now);
            var homeTeam = UpsertTeam(row.HomeTeamId, row.HomeTeam, row.HomeAbbr, row.HomeTeamImage, teamsByKey, now);
            var awayTeam = UpsertTeam(row.AwayTeamId, row.AwayTeam, row.AwayAbbr, row.AwayTeamImage, teamsByKey, now);

            await dbContext.SaveChangesAsync(cancellationToken);

            AddTournamentTeam(tournament, homeTeam, tournamentTeamIds, now);
            AddTournamentTeam(tournament, awayTeam, tournamentTeamIds, now);

            if (!matchesByEventId.TryGetValue(row.EventId, out var match))
            {
                match = CreateMatch(tournament, stage, homeTeam, awayTeam, row, now);
                dbContext.Matches.Add(match);
                matchesByEventId[row.EventId] = match;
                inserted++;
                continue;
            }

            if (UpdateMatch(match, stage, homeTeam, awayTeam, row, now))
            {
                updated++;
            }
            else
            {
                unchanged++;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new UpsertResult(inserted, updated, unchanged);
    }

    private static IEnumerable<LiveScoreRequest> GetLiveScoreRequests(TournamentSyncMode mode)
    {
        return mode switch
        {
            TournamentSyncMode.Live => [new LiveScoreRequest(LiveScoreListType.Fixtures, false)],
            TournamentSyncMode.Results => [new LiveScoreRequest(LiveScoreListType.Results, true)],
            TournamentSyncMode.Finalize =>
            [
                new LiveScoreRequest(LiveScoreListType.Fixtures, false),
                new LiveScoreRequest(LiveScoreListType.Results, true)
            ],
            TournamentSyncMode.Schedule =>
            [
                new LiveScoreRequest(LiveScoreListType.Fixtures, false),
                new LiveScoreRequest(LiveScoreListType.Results, false)
            ],
            _ =>
            [
                new LiveScoreRequest(LiveScoreListType.Fixtures, true),
                new LiveScoreRequest(LiveScoreListType.Results, true)
            ]
        };
    }

    private static int PreferredListTypeSortKey(LiveScoreFixtureRow row)
    {
        return row.ListType == LiveScoreListType.Fixtures ? 1 : 0;
    }

    private static void UpdateTournamentMetadata(
        Tournament tournament,
        IReadOnlyList<LiveScoreFixtureRow> rows,
        DateTimeOffset now)
    {
        var preferred = rows.FirstOrDefault(row => row.ListType == LiveScoreListType.Fixtures) ?? rows.FirstOrDefault();
        if (preferred is null)
        {
            return;
        }

        AssignIfNotEmpty(value => tournament.LiveScoreCompetitionId = value, preferred.CompetitionId);
        AssignIfNotEmpty(value => tournament.CompetitionName = value, preferred.CompetitionName);
        AssignIfNotEmpty(value => tournament.CompetitionUrlName = value, preferred.CompetitionUrlName);
        AssignIfNotEmpty(value => tournament.CategoryCode = value, preferred.CategoryCode);
        AssignIfNotEmpty(value => tournament.CategoryName = value, preferred.CategoryName);
        AssignIfNotEmpty(value => tournament.CategoryTransliteratedName = value, preferred.CategoryTransliteratedName);

        tournament.UpdatedAtUtc = now;
    }

    private TournamentStage? UpsertStage(
        Tournament tournament,
        LiveScoreFixtureRow row,
        Dictionary<string, TournamentStage> stagesByLiveScoreId,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(row.StageId))
        {
            return null;
        }

        if (!stagesByLiveScoreId.TryGetValue(row.StageId, out var stage))
        {
            stage = new TournamentStage
            {
                TournamentId = tournament.Id,
                LiveScoreStageId = row.StageId,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            tournament.Stages.Add(stage);
            dbContext.TournamentStages.Add(stage);
            stagesByLiveScoreId[row.StageId] = stage;
        }

        stage.Name = row.StageName;
        stage.Code = row.StageCode;
        stage.UpdatedAtUtc = now;
        return stage;
    }

    private Team? UpsertTeam(
        string liveScoreTeamId,
        string name,
        string abbreviation,
        string imageUrl,
        Dictionary<string, Team> teamsByKey,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(liveScoreTeamId) && string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        var key = TeamLookupKey(liveScoreTeamId, name);
        if (!teamsByKey.TryGetValue(key, out var team))
        {
            team = new Team
            {
                LiveScoreTeamId = string.IsNullOrWhiteSpace(liveScoreTeamId) ? null : liveScoreTeamId,
                Name = name,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            dbContext.Teams.Add(team);
            teamsByKey[key] = team;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            team.Name = name;
        }

        team.Abbreviation = abbreviation;
        team.ImageUrl = imageUrl;
        team.UpdatedAtUtc = now;
        return team;
    }

    private void AddTournamentTeam(
        Tournament tournament,
        Team? team,
        HashSet<int> tournamentTeamIds,
        DateTimeOffset now)
    {
        if (team is null || tournamentTeamIds.Contains(team.Id))
        {
            return;
        }

        dbContext.TournamentTeams.Add(new TournamentTeam
        {
            TournamentId = tournament.Id,
            TeamId = team.Id,
            FirstSeenAtUtc = now,
            LastSeenAtUtc = now
        });
        tournamentTeamIds.Add(team.Id);
    }

    private static Match CreateMatch(
        Tournament tournament,
        TournamentStage? stage,
        Team? homeTeam,
        Team? awayTeam,
        LiveScoreFixtureRow row,
        DateTimeOffset now)
    {
        var match = new Match
        {
            TournamentId = tournament.Id,
            LiveScoreEventId = row.EventId,
            CreatedAtUtc = now
        };

        UpdateMatch(match, stage, homeTeam, awayTeam, row, now);
        return match;
    }

    private static bool UpdateMatch(
        Match match,
        TournamentStage? stage,
        Team? homeTeam,
        Team? awayTeam,
        LiveScoreFixtureRow row,
        DateTimeOffset now)
    {
        var changed = false;

        if (!match.IsStageManualOverride && match.StageId is null)
        {
            changed |= SetIfChanged(value => match.StageId = value, match.StageId, stage?.Id);
        }

        changed |= SetIfChanged(value => match.KickoffUtc = value, match.KickoffUtc, row.KickoffUtc);
        changed |= SetIfChanged(value => match.HomeTeamId = value, match.HomeTeamId, homeTeam?.Id);
        changed |= SetIfChanged(value => match.AwayTeamId = value, match.AwayTeamId, awayTeam?.Id);
        changed |= SetIfChanged(value => match.HomeTeamNameSnapshot = value, match.HomeTeamNameSnapshot, row.HomeTeam);
        changed |= SetIfChanged(value => match.AwayTeamNameSnapshot = value, match.AwayTeamNameSnapshot, row.AwayTeam);
        changed |= SetIfChanged(value => match.HomeTeamAbbrSnapshot = value, match.HomeTeamAbbrSnapshot, row.HomeAbbr);
        changed |= SetIfChanged(value => match.AwayTeamAbbrSnapshot = value, match.AwayTeamAbbrSnapshot, row.AwayAbbr);
        changed |= SetIfChanged(value => match.HomeTeamImageSnapshot = value, match.HomeTeamImageSnapshot, row.HomeTeamImage);
        changed |= SetIfChanged(value => match.AwayTeamImageSnapshot = value, match.AwayTeamImageSnapshot, row.AwayTeamImage);
        changed |= SetIfChanged(value => match.HomeScore = value, match.HomeScore, row.HomeScore);
        changed |= SetIfChanged(value => match.AwayScore = value, match.AwayScore, row.AwayScore);
        changed |= SetIfChanged(value => match.RegularTimeHomeScore = value, match.RegularTimeHomeScore, row.RegularHomeScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.RegularTimeAwayScore = value, match.RegularTimeAwayScore, row.RegularAwayScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.AfterExtraTimeHomeScore = value, match.AfterExtraTimeHomeScore, row.AfterExtraTimeHomeScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.AfterExtraTimeAwayScore = value, match.AfterExtraTimeAwayScore, row.AfterExtraTimeAwayScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.ExtraTimeHomeGoals = value, match.ExtraTimeHomeGoals, row.ExtraTimeHomeGoals, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.ExtraTimeAwayGoals = value, match.ExtraTimeAwayGoals, row.ExtraTimeAwayGoals, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.PenaltyHomeScore = value, match.PenaltyHomeScore, row.PenaltyHomeScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.PenaltyAwayScore = value, match.PenaltyAwayScore, row.PenaltyAwayScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.Status = value, match.Status, row.Status);
        changed |= SetIfChanged(value => match.RawStatus = value, match.RawStatus, row.StatusRaw);
        changed |= SetIfChanged(value => match.SyncState = value, match.SyncState, row.SyncState);
        if (!match.IsRoundInfoManualOverride && string.IsNullOrWhiteSpace(match.RoundInfo))
        {
            changed |= SetIfChanged(value => match.RoundInfo = value, match.RoundInfo, row.RoundInfo);
        }
        changed |= SetIfChanged(value => match.MatchUrl = value, match.MatchUrl, row.MatchUrl);
        changed |= SetIfChanged(value => match.LastSourceEndpoint = value, match.LastSourceEndpoint, row.SourceEndpoint);
        changed |= SetIfChanged(value => match.LastSeenInListType = value, match.LastSeenInListType, row.ListType);

        if (match.FinishedAtUtc is null &&
            (row.Status == MatchStatus.Finished || row.SyncState == MatchSyncState.Finalized))
        {
            match.FinishedAtUtc = now;
            changed = true;
        }

        match.LastSyncedAtUtc = now;
        if (changed)
        {
            match.UpdatedAtUtc = now;
        }

        return changed;
    }

    private async Task EnrichFinishedMatchStatisticsAsync(Tournament tournament, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var statisticsDelay = TimeSpan.FromMinutes(Math.Max(0, options.Value.StatisticsDelayAfterFinishedMinutes));
        var eligibleMatches = tournament.Matches
            .Where(match =>
                match.Statistics is null &&
                match.FinishedAtUtc.HasValue &&
                now - match.FinishedAtUtc.Value >= statisticsDelay &&
                match.Status == MatchStatus.Finished &&
                !string.IsNullOrWhiteSpace(match.LiveScoreEventId))
            .ToList();

        foreach (var match in eligibleMatches)
        {
            var statisticsRow = await liveScoreClient.GetMatchStatisticsAsync(
                tournament,
                match.LiveScoreEventId,
                cancellationToken);

            if (statisticsRow is null)
            {
                continue;
            }

            dbContext.MatchStatistics.Add(CreateMatchStatistics(match, statisticsRow, now));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static MatchStatistics CreateMatchStatistics(
        Match match,
        LiveScoreMatchStatisticsRow row,
        DateTimeOffset now)
    {
        return new MatchStatistics
        {
            MatchId = match.Id,
            LiveScoreEventId = string.IsNullOrWhiteSpace(row.EventId) ? match.LiveScoreEventId : row.EventId,
            FetchedAtUtc = now,
            UpdatedAtUtc = now,
            HomeExpectedGoals = row.HomeExpectedGoals,
            AwayExpectedGoals = row.AwayExpectedGoals,
            HomeShotsOnTarget = row.HomeShotsOnTarget,
            AwayShotsOnTarget = row.AwayShotsOnTarget,
            HomeShotsOffTarget = row.HomeShotsOffTarget,
            AwayShotsOffTarget = row.AwayShotsOffTarget,
            HomeBlockedShots = row.HomeBlockedShots,
            AwayBlockedShots = row.AwayBlockedShots,
            HomePossession = row.HomePossession,
            AwayPossession = row.AwayPossession,
            HomeCorners = row.HomeCorners,
            AwayCorners = row.AwayCorners,
            HomeFouls = row.HomeFouls,
            AwayFouls = row.AwayFouls,
            HomeThrowIns = row.HomeThrowIns,
            AwayThrowIns = row.AwayThrowIns,
            HomeCrosses = row.HomeCrosses,
            AwayCrosses = row.AwayCrosses,
            HomeGoalkeeperSaves = row.HomeGoalkeeperSaves,
            AwayGoalkeeperSaves = row.AwayGoalkeeperSaves,
            HomeGoalKicks = row.HomeGoalKicks,
            AwayGoalKicks = row.AwayGoalKicks,
            HomeOffsides = row.HomeOffsides,
            AwayOffsides = row.AwayOffsides,
            HomeYellowCards = row.HomeYellowCards,
            AwayYellowCards = row.AwayYellowCards,
            HomeRedCards = row.HomeRedCards,
            AwayRedCards = row.AwayRedCards,
            HomeYellowRedCards = row.HomeYellowRedCards,
            AwayYellowRedCards = row.AwayYellowRedCards,
            HomeCounterAttacks = row.HomeCounterAttacks,
            AwayCounterAttacks = row.AwayCounterAttacks
        };
    }

    private static bool SetIfChanged<T>(
        Action<T> assign,
        T current,
        T incoming,
        bool preserveExistingWhenIncomingNull = false)
    {
        if (preserveExistingWhenIncomingNull && incoming is null)
        {
            return false;
        }

        if (EqualityComparer<T>.Default.Equals(current, incoming))
        {
            return false;
        }

        assign(incoming);
        return true;
    }

    private static void AssignIfNotEmpty(Action<string> assign, string value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            assign(value);
        }
    }

    private static string TeamLookupKey(Team team)
    {
        return TeamLookupKey(team.LiveScoreTeamId ?? string.Empty, team.Name);
    }

    private static string TeamLookupKey(string liveScoreTeamId, string name)
    {
        return string.IsNullOrWhiteSpace(liveScoreTeamId)
            ? $"name:{name.Trim().ToUpperInvariant()}"
            : $"id:{liveScoreTeamId.Trim().ToUpperInvariant()}";
    }

    private sealed record LiveScoreRequest(LiveScoreListType ListType, bool EnrichScoreBreakdowns);

    private sealed record UpsertResult(int Inserted, int Updated, int Unchanged);
}
