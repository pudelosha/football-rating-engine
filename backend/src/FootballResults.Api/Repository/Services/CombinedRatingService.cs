using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class CombinedRatingService(
    AppDbContext dbContext,
    ISquadQualityService squadQualityService) : ICombinedRatingService
{
    public async Task<CombinedTeamRatingsDto> GetTournamentTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var tournamentSetup = await dbContext.Tournaments
            .Where(tournament => tournament.Id == tournamentId)
            .Select(tournament => new
            {
                tournament.RatingIncludeForm,
                tournament.RatingIncludePerformance,
                tournament.RatingIncludeSquad
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (tournamentSetup is null)
        {
            return new CombinedTeamRatingsDto(
                tournamentId,
                new CombinedRatingRunContextDto(null, null, null, null, string.Empty, string.Empty, DateTimeOffset.UtcNow),
                []);
        }

        var latestEloRun = await dbContext.EloRatingRuns
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new { run.Id, run.StartedAtUtc, run.SnapshotStartSeasonOffset })
            .FirstOrDefaultAsync(cancellationToken);

        if (latestEloRun is null)
        {
            return new CombinedTeamRatingsDto(
                tournamentId,
                new CombinedRatingRunContextDto(null, null, null, null, string.Empty, string.Empty, DateTimeOffset.UtcNow),
                []);
        }

        var currentRoundInfo = await GetCurrentRoundInfoAsync(tournamentId, cancellationToken);
        var previousRoundInfo = await GetPreviousRoundInfoAsync(tournamentId, currentRoundInfo, cancellationToken);
        var latestRoundChanges = string.IsNullOrWhiteSpace(currentRoundInfo)
            ? []
            : await GetLatestRoundBaseEloChangesAsync(tournamentId, latestEloRun.Id, currentRoundInfo, cancellationToken);

        var latestFormRun = tournamentSetup.RatingIncludeForm
            ? await dbContext.FormRatingRuns
                .Where(run =>
                    run.TournamentId == tournamentId &&
                    run.EloRatingRunId == latestEloRun.Id &&
                    run.Status == EloRatingRunStatus.Succeeded)
                .OrderByDescending(run => run.StartedAtUtc)
                .Select(run => new { run.Id, run.EloRatingRunId })
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var latestPerformanceRun = tournamentSetup.RatingIncludePerformance
            ? await dbContext.PerformanceRatingRuns
                .Where(run =>
                    run.TournamentId == tournamentId &&
                    run.EloRatingRunId == latestEloRun.Id &&
                    run.Status == EloRatingRunStatus.Succeeded)
                .OrderByDescending(run => run.StartedAtUtc)
                .Select(run => new { run.Id, run.EloRatingRunId })
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var baseRatings = await dbContext.TeamEloRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.EloRatingRunId == latestEloRun.Id)
            .ToListAsync(cancellationToken);

        var formRatings = latestFormRun is null
            ? []
            : await dbContext.TeamFormRatings
                .Where(rating => rating.FormRatingRunId == latestFormRun.Id)
                .ToDictionaryAsync(rating => rating.TeamId, cancellationToken);

        var performanceRatings = latestPerformanceRun is null
            ? []
            : await dbContext.TeamPerformanceRatings
                .Where(rating => rating.PerformanceRatingRunId == latestPerformanceRun.Id)
                .ToDictionaryAsync(rating => rating.TeamId, cancellationToken);

        var squadRatings = tournamentSetup.RatingIncludeSquad
            ? (await squadQualityService.GetTournamentTeamRatingsAsync(tournamentId, cancellationToken))
                .ToDictionary(rating => rating.TeamId)
            : [];

        var teams = baseRatings
            .Select(baseRating =>
            {
                formRatings.TryGetValue(baseRating.TeamId, out var formRating);
                performanceRatings.TryGetValue(baseRating.TeamId, out var performanceRating);
                squadRatings.TryGetValue(baseRating.TeamId, out var squadRating);

                var formAdjustment = formRating?.FormAdjustment ?? 0;
                var performanceAdjustment = performanceRating?.PerformanceAdjustment ?? 0;
                var squadAdjustment = squadRating?.SquadQualityAdjustment ?? 0;
                var totalAdjustment = formAdjustment + performanceAdjustment + squadAdjustment;
                var finalRating = baseRating.Rating + totalAdjustment;
                latestRoundChanges.TryGetValue(baseRating.TeamId, out var finalRatingChange);
                var hasRoundChange = !string.IsNullOrWhiteSpace(currentRoundInfo);
                var previousFinalRating = hasRoundChange
                    ? RoundRating(finalRating - finalRatingChange)
                    : (decimal?)null;

                return new TeamCombinedRatingDto(
                    baseRating.TeamId,
                    baseRating.Team.Name,
                    baseRating.Team.Abbreviation,
                    baseRating.Rating,
                    formAdjustment,
                    performanceAdjustment,
                    squadAdjustment,
                    RoundRating(totalAdjustment),
                    RoundRating(finalRating),
                    previousFinalRating,
                    hasRoundChange ? RoundRating(finalRatingChange) : null,
                    CalculateConfidence(formRating, performanceRating, squadRating),
                    formRating is not null,
                    performanceRating is not null,
                    squadRating?.SnapshotId is not null,
                    baseRating.MatchesPlayed,
                    formRating?.MatchCount ?? 0,
                    performanceRating?.MatchCount ?? 0,
                    squadRating?.PlayerCount ?? 0,
                    baseRating.LastMatchUtc,
                    formRating?.LastMatchUtc,
                    performanceRating?.LastMatchUtc,
                    squadRating?.FetchedAtUtc);
            })
            .OrderByDescending(rating => rating.FinalRating)
            .ThenBy(rating => rating.TeamName)
            .ToList();

        return new CombinedTeamRatingsDto(
            tournamentId,
            new CombinedRatingRunContextDto(
                latestEloRun.Id,
                latestFormRun?.Id,
                latestPerformanceRun?.Id,
                latestEloRun.SnapshotStartSeasonOffset,
                currentRoundInfo,
                previousRoundInfo,
                DateTimeOffset.UtcNow),
            teams);
    }

    private async Task<string> GetCurrentRoundInfoAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Matches
            .Where(match =>
                match.TournamentId == tournamentId &&
                match.Status == MatchStatus.Finished &&
                match.RoundInfo != string.Empty)
            .OrderByDescending(match => match.KickoffUtc)
            .ThenByDescending(match => match.Id)
            .Select(match => match.RoundInfo)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;
    }

    private async Task<string> GetPreviousRoundInfoAsync(
        int tournamentId,
        string currentRoundInfo,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(currentRoundInfo))
        {
            return string.Empty;
        }

        return await dbContext.Matches
            .Where(match =>
                match.TournamentId == tournamentId &&
                match.Status == MatchStatus.Finished &&
                match.RoundInfo != string.Empty &&
                match.RoundInfo != currentRoundInfo)
            .OrderByDescending(match => match.KickoffUtc)
            .ThenByDescending(match => match.Id)
            .Select(match => match.RoundInfo)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;
    }

    private async Task<Dictionary<int, decimal>> GetLatestRoundBaseEloChangesAsync(
        int tournamentId,
        int eloRunId,
        string currentRoundInfo,
        CancellationToken cancellationToken)
    {
        var latestRoundEventIds = await dbContext.Matches
            .Where(match =>
                match.TournamentId == tournamentId &&
                match.Status == MatchStatus.Finished &&
                match.RoundInfo == currentRoundInfo)
            .Select(match => match.LiveScoreEventId)
            .ToListAsync(cancellationToken);

        var snapshots = await dbContext.MatchEloSnapshots
            .Where(snapshot =>
                snapshot.EloRatingRunId == eloRunId &&
                latestRoundEventIds.Contains(snapshot.LiveScoreEventId))
            .Select(snapshot => new
            {
                snapshot.HomeTeamId,
                snapshot.AwayTeamId,
                snapshot.HomeEloChange,
                snapshot.AwayEloChange
            })
            .ToListAsync(cancellationToken);

        var changes = new Dictionary<int, decimal>();
        foreach (var snapshot in snapshots)
        {
            changes[snapshot.HomeTeamId] = changes.GetValueOrDefault(snapshot.HomeTeamId) + snapshot.HomeEloChange;
            changes[snapshot.AwayTeamId] = changes.GetValueOrDefault(snapshot.AwayTeamId) + snapshot.AwayEloChange;
        }

        return changes;
    }

    private static decimal CalculateConfidence(
        TeamFormRating? formRating,
        TeamPerformanceRating? performanceRating,
        TeamSquadQualityRatingDto? squadRating)
    {
        var score = 0.55m;

        if (formRating is not null)
        {
            score += 0.15m * Math.Min(formRating.MatchCount, 5) / 5m;
        }

        if (performanceRating is not null)
        {
            score += 0.15m * Math.Min(performanceRating.DataCoverage, 1);
        }

        if (squadRating?.SnapshotId is not null)
        {
            score += 0.15m;
        }

        return RoundMetric(Math.Min(score, 1m));
    }

    private static decimal RoundRating(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundMetric(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }
}
