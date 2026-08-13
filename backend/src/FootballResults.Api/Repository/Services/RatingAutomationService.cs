using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class RatingAutomationService(
    AppDbContext dbContext,
    IBaseEloRatingService baseEloRatingService,
    IFormRatingService formRatingService,
    IPerformanceRatingService performanceRatingService,
    ILogger<RatingAutomationService> logger) : IRatingAutomationService
{
    public async Task<int> RebuildStaleTournamentRatingsAsync(CancellationToken cancellationToken)
    {
        var tournamentIds = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament => tournament.IsActive)
            .OrderBy(tournament => tournament.Name)
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);

        var rebuiltCount = 0;
        foreach (var tournamentId in tournamentIds)
        {
            if (await RebuildTournamentRatingsIfStaleAsync(tournamentId, cancellationToken))
            {
                rebuiltCount++;
            }
        }

        return rebuiltCount;
    }

    public async Task<bool> RebuildTournamentRatingsIfStaleAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var tournament = await dbContext.Tournaments
            .AsNoTracking()
            .FirstOrDefaultAsync(tournament => tournament.Id == tournamentId, cancellationToken);
        if (tournament is null)
        {
            return false;
        }

        var latestFinishedMatch = await GetLatestFinishedMatchSignalAsync(tournamentId, cancellationToken);
        if (latestFinishedMatch is null)
        {
            return false;
        }

        if (await HasRunningRatingRunAsync(tournamentId, cancellationToken))
        {
            logger.LogInformation("Skipping rating automation for tournament {TournamentId}; a rating run is already active.", tournamentId);
            return false;
        }

        var configuration = await GetRatingConfigurationAsync(cancellationToken);
        var statisticsSourceUtc = await GetLatestStatisticsSourceUtcAsync(tournamentId, cancellationToken);
        var baseRun = await GetLatestBaseRunAsync(tournamentId, cancellationToken);
        var formRun = await GetLatestFormRunAsync(tournamentId, cancellationToken);
        var performanceRun = await GetLatestPerformanceRunAsync(tournamentId, cancellationToken);

        var anyRebuilt = false;
        var baseRebuilt = false;
        var baseEloIsStale = ShouldRebuildBaseElo(
            tournament,
            configuration,
            baseRun,
            latestFinishedMatch.SourceUtc) ||
            !await IsLatestFinishedMatchCoveredByBaseRunAsync(baseRun, latestFinishedMatch, cancellationToken);
        if (baseEloIsStale)
        {
            var response = await baseEloRatingService.RebuildAsync(
                tournamentId,
                BuildBaseEloRequest(tournament, configuration),
                cancellationToken);
            baseRebuilt = response.Status == EloRatingRunStatus.Succeeded;
            anyRebuilt = baseRebuilt || anyRebuilt;
            logger.LogInformation(
                "Rating automation rebuilt Base Elo for tournament {TournamentId}. Run {RunId}, status {Status}.",
                tournamentId,
                response.RunId,
                response.Status);

            if (!baseRebuilt)
            {
                return anyRebuilt;
            }
        }

        if (tournament.RatingIncludeForm &&
            (baseRebuilt || ShouldRebuildForm(configuration, formRun, latestFinishedMatch.SourceUtc)))
        {
            var response = await formRatingService.RebuildAsync(
                tournamentId,
                BuildFormRequest(configuration),
                cancellationToken);
            anyRebuilt = response.Status == EloRatingRunStatus.Succeeded || anyRebuilt;
            logger.LogInformation(
                "Rating automation rebuilt Form for tournament {TournamentId}. Run {RunId}, status {Status}.",
                tournamentId,
                response.RunId,
                response.Status);
        }

        if (tournament.RatingIncludePerformance &&
            (baseRebuilt || ShouldRebuildPerformance(configuration, performanceRun, statisticsSourceUtc ?? latestFinishedMatch.SourceUtc)))
        {
            var response = await performanceRatingService.RebuildAsync(
                tournamentId,
                BuildPerformanceRequest(configuration),
                cancellationToken);
            anyRebuilt = response.Status == EloRatingRunStatus.Succeeded || anyRebuilt;
            logger.LogInformation(
                "Rating automation rebuilt Performance for tournament {TournamentId}. Run {RunId}, status {Status}.",
                tournamentId,
                response.RunId,
                response.Status);
        }

        return anyRebuilt;
    }

    private Task<LatestFinishedMatchSignal?> GetLatestFinishedMatchSignalAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                match.TournamentId == tournamentId &&
                match.Status == MatchStatus.Finished &&
                match.HomeTeamId.HasValue &&
                match.AwayTeamId.HasValue &&
                match.HomeScore.HasValue &&
                match.AwayScore.HasValue)
            .OrderByDescending(match => match.KickoffUtc)
            .ThenByDescending(match => match.UpdatedAtUtc)
            .Select(match => new LatestFinishedMatchSignal(
                match.LiveScoreEventId,
                match.UpdatedAtUtc))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<bool> IsLatestFinishedMatchCoveredByBaseRunAsync(
        EloRatingRun? run,
        LatestFinishedMatchSignal latestFinishedMatch,
        CancellationToken cancellationToken)
    {
        if (run?.FinishedAtUtc is null)
        {
            return false;
        }

        return await dbContext.MatchEloSnapshots
            .AsNoTracking()
            .AnyAsync(snapshot =>
                snapshot.EloRatingRunId == run.Id &&
                snapshot.LiveScoreEventId == latestFinishedMatch.LiveScoreEventId,
                cancellationToken);
    }

    private Task<DateTimeOffset?> GetLatestStatisticsSourceUtcAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return dbContext.MatchStatistics
            .AsNoTracking()
            .Where(statistics => statistics.Match.TournamentId == tournamentId)
            .Select(statistics => (DateTimeOffset?)statistics.UpdatedAtUtc)
            .MaxAsync(cancellationToken);
    }

    private async Task<bool> HasRunningRatingRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        var hasRunningBaseRun = await dbContext.EloRatingRuns.AnyAsync(run =>
                run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Running,
                cancellationToken);
        if (hasRunningBaseRun)
        {
            return true;
        }

        var hasRunningFormRun = await dbContext.FormRatingRuns.AnyAsync(run =>
                run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Running,
                cancellationToken);
        if (hasRunningFormRun)
        {
            return true;
        }

        return await dbContext.PerformanceRatingRuns.AnyAsync(run =>
                run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Running,
                cancellationToken);
    }

    private async Task<RatingConfiguration> GetRatingConfigurationAsync(CancellationToken cancellationToken)
    {
        var configuration = await dbContext.RatingConfigurations
            .AsNoTracking()
            .OrderBy(configuration => configuration.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return configuration ?? new RatingConfiguration
        {
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.MinValue
        };
    }

    private Task<EloRatingRun?> GetLatestBaseRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return dbContext.EloRatingRuns
            .AsNoTracking()
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private Task<FormRatingRun?> GetLatestFormRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return dbContext.FormRatingRuns
            .AsNoTracking()
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private Task<PerformanceRatingRun?> GetLatestPerformanceRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        return dbContext.PerformanceRatingRuns
            .AsNoTracking()
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static bool ShouldRebuildBaseElo(
        Tournament tournament,
        RatingConfiguration configuration,
        EloRatingRun? run,
        DateTimeOffset matchSourceUtc)
    {
        if (run?.FinishedAtUtc is null)
        {
            return true;
        }

        return matchSourceUtc > run.FinishedAtUtc.Value ||
            configuration.UpdatedAtUtc > run.FinishedAtUtc.Value ||
            run.BaseRating != configuration.BaseRating ||
            run.PromotedBaselineRating != configuration.PromotedBaselineRating ||
            run.KFactor != configuration.KFactor ||
            run.HomeAdvantage != EffectiveHomeAdvantage(tournament, configuration) ||
            run.BootstrapSeasonCount != Math.Max(1, configuration.BootstrapSeasonCount) ||
            run.SnapshotStartSeasonOffset != tournament.RatingSnapshotStartSeasonOffset;
    }

    private static bool ShouldRebuildForm(
        RatingConfiguration configuration,
        FormRatingRun? run,
        DateTimeOffset matchSourceUtc)
    {
        if (run?.FinishedAtUtc is null)
        {
            return true;
        }

        return matchSourceUtc > run.FinishedAtUtc.Value ||
            configuration.UpdatedAtUtc > run.FinishedAtUtc.Value ||
            run.MatchCount != Math.Clamp(configuration.FormMatchCount, 1, 10) ||
            run.Scale != (configuration.FormScale <= 0 ? 100 : configuration.FormScale) ||
            run.MaxAdjustment != (configuration.FormMaxAdjustment <= 0 ? 35 : configuration.FormMaxAdjustment);
    }

    private static bool ShouldRebuildPerformance(
        RatingConfiguration configuration,
        PerformanceRatingRun? run,
        DateTimeOffset sourceUtc)
    {
        if (run?.FinishedAtUtc is null)
        {
            return true;
        }

        return sourceUtc > run.FinishedAtUtc.Value ||
            configuration.UpdatedAtUtc > run.FinishedAtUtc.Value ||
            run.MatchCount != Math.Clamp(configuration.PerformanceMatchCount, 1, 10) ||
            run.Scale != (configuration.PerformanceScale <= 0 ? 45 : configuration.PerformanceScale) ||
            run.MaxAdjustment != (configuration.PerformanceMaxAdjustment <= 0 ? 45 : configuration.PerformanceMaxAdjustment);
    }

    private static RebuildBaseEloRequest BuildBaseEloRequest(
        Tournament tournament,
        RatingConfiguration configuration)
    {
        return new RebuildBaseEloRequest(
            configuration.BaseRating,
            configuration.PromotedBaselineRating,
            configuration.KFactor,
            EffectiveHomeAdvantage(tournament, configuration),
            Math.Max(1, configuration.BootstrapSeasonCount),
            "Tournament",
            tournament.RatingSnapshotStartSeasonOffset);
    }

    private static RebuildFormRatingRequest BuildFormRequest(RatingConfiguration configuration)
    {
        return new RebuildFormRatingRequest(
            Math.Clamp(configuration.FormMatchCount, 1, 10),
            configuration.FormScale <= 0 ? 100 : configuration.FormScale,
            configuration.FormMaxAdjustment <= 0 ? 35 : configuration.FormMaxAdjustment);
    }

    private static RebuildPerformanceRatingRequest BuildPerformanceRequest(RatingConfiguration configuration)
    {
        return new RebuildPerformanceRatingRequest(
            Math.Clamp(configuration.PerformanceMatchCount, 1, 10),
            configuration.PerformanceScale <= 0 ? 45 : configuration.PerformanceScale,
            configuration.PerformanceMaxAdjustment <= 0 ? 45 : configuration.PerformanceMaxAdjustment);
    }

    private static decimal EffectiveHomeAdvantage(Tournament tournament, RatingConfiguration configuration)
    {
        return tournament.ApplyHomeAdvantage ? configuration.HomeAdvantage : 0;
    }

    private sealed record LatestFinishedMatchSignal(
        string LiveScoreEventId,
        DateTimeOffset SourceUtc);
}
