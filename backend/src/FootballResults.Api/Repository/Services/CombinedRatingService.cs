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
        var latestEloRun = await dbContext.EloRatingRuns
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new { run.Id, run.StartedAtUtc })
            .FirstOrDefaultAsync(cancellationToken);

        if (latestEloRun is null)
        {
            return new CombinedTeamRatingsDto(
                tournamentId,
                new CombinedRatingRunContextDto(null, null, null, DateTimeOffset.UtcNow),
                []);
        }

        var latestFormRun = await dbContext.FormRatingRuns
            .Where(run =>
                run.TournamentId == tournamentId &&
                run.EloRatingRunId == latestEloRun.Id &&
                run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new { run.Id, run.EloRatingRunId })
            .FirstOrDefaultAsync(cancellationToken);

        var latestPerformanceRun = await dbContext.PerformanceRatingRuns
            .Where(run =>
                run.TournamentId == tournamentId &&
                run.EloRatingRunId == latestEloRun.Id &&
                run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new { run.Id, run.EloRatingRunId })
            .FirstOrDefaultAsync(cancellationToken);

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

        var squadRatings = (await squadQualityService.GetTournamentTeamRatingsAsync(tournamentId, cancellationToken))
            .ToDictionary(rating => rating.TeamId);

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
                DateTimeOffset.UtcNow),
            teams);
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
