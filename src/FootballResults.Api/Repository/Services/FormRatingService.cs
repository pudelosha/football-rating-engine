using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class FormRatingService(AppDbContext dbContext) : IFormRatingService
{
    public async Task<RebuildFormRatingResponse> RebuildAsync(
        int tournamentId,
        RebuildFormRatingRequest request,
        CancellationToken cancellationToken)
    {
        var tournamentExists = await dbContext.Tournaments.AnyAsync(
            tournament => tournament.Id == tournamentId,
            cancellationToken);
        if (!tournamentExists)
        {
            throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");
        }

        var eloRun = await dbContext.EloRatingRuns
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (eloRun is null)
        {
            throw new InvalidOperationException($"Tournament {tournamentId} does not have a successful Base Elo run.");
        }

        var now = DateTimeOffset.UtcNow;
        var run = new FormRatingRun
        {
            TournamentId = tournamentId,
            EloRatingRunId = eloRun.Id,
            MatchCount = Math.Clamp(request.MatchCount, 1, 10),
            Scale = request.Scale <= 0 ? 100 : request.Scale,
            MaxAdjustment = request.MaxAdjustment <= 0 ? 35 : request.MaxAdjustment,
            Status = EloRatingRunStatus.Running,
            StartedAtUtc = now
        };

        dbContext.FormRatingRuns.Add(run);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var processedTeams = await CalculateFormAsync(run, cancellationToken);
            run.ProcessedTeams = processedTeams;
            run.Status = EloRatingRunStatus.Succeeded;
            run.FinishedAtUtc = DateTimeOffset.UtcNow;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            run.Status = EloRatingRunStatus.Failed;
            run.FinishedAtUtc = DateTimeOffset.UtcNow;
            run.ErrorMessage = ex.Message;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return new RebuildFormRatingResponse(
            run.Id,
            run.TournamentId,
            run.EloRatingRunId,
            run.Status,
            run.ProcessedTeams,
            run.ErrorMessage);
    }

    public async Task<FormRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        var run = await dbContext.FormRatingRuns
            .Where(run => run.TournamentId == tournamentId)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return run is null ? null : ToDto(run);
    }

    public async Task<IReadOnlyList<TeamFormRatingDto>> GetLatestTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var latestRun = await dbContext.FormRatingRuns
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new { run.Id, run.EloRatingRunId })
            .FirstOrDefaultAsync(cancellationToken);

        if (latestRun is null)
        {
            return [];
        }

        var ratings = await dbContext.TeamFormRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.FormRatingRunId == latestRun.Id)
            .Join(
                dbContext.TeamEloRatings.Where(rating => rating.EloRatingRunId == latestRun.EloRatingRunId),
                form => form.TeamId,
                elo => elo.TeamId,
                (form, elo) => new
                {
                    Form = form,
                    Elo = elo,
                    FormRating = elo.Rating + form.FormAdjustment
                })
            .OrderByDescending(rating => rating.FormRating)
            .ToListAsync(cancellationToken);

        return ratings
            .Select(rating => new TeamFormRatingDto(
                rating.Form.TeamId,
                rating.Form.Team.Name,
                rating.Form.Team.Abbreviation,
                rating.Elo.Rating,
                rating.Form.FormAdjustment,
                rating.FormRating,
                rating.Form.MatchCount,
                rating.Form.WeightedActual,
                rating.Form.WeightedExpected,
                rating.Form.WeightedDelta,
                rating.Form.AverageDelta,
                rating.Form.LastMatchUtc))
            .ToList();
    }

    public async Task<IReadOnlyList<TeamFormMatchSnapshotDto>> GetRunSnapshotsAsync(
        int runId,
        CancellationToken cancellationToken)
    {
        return await dbContext.TeamFormMatchSnapshots
            .Include(snapshot => snapshot.Team)
            .Include(snapshot => snapshot.OpponentTeam)
            .Where(snapshot => snapshot.FormRatingRunId == runId)
            .OrderBy(snapshot => snapshot.Team.Name)
            .ThenByDescending(snapshot => snapshot.KickoffUtc)
            .Select(snapshot => new TeamFormMatchSnapshotDto(
                snapshot.Id,
                snapshot.FormRatingRunId,
                snapshot.TeamId,
                snapshot.Team.Name,
                snapshot.OpponentTeamId,
                snapshot.OpponentTeam.Name,
                snapshot.LiveScoreEventId,
                snapshot.KickoffUtc,
                snapshot.IsHome,
                snapshot.Actual,
                snapshot.Expected,
                snapshot.Delta,
                snapshot.Weight,
                snapshot.WeightedDelta))
            .ToListAsync(cancellationToken);
    }

    private async Task<int> CalculateFormAsync(FormRatingRun run, CancellationToken cancellationToken)
    {
        var teamRatings = await dbContext.TeamEloRatings
            .Where(rating => rating.EloRatingRunId == run.EloRatingRunId)
            .ToListAsync(cancellationToken);

        var snapshots = await dbContext.MatchEloSnapshots
            .Where(snapshot => snapshot.EloRatingRunId == run.EloRatingRunId)
            .OrderByDescending(snapshot => snapshot.KickoffUtc)
            .ThenByDescending(snapshot => snapshot.LiveScoreEventId)
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var processedTeams = 0;

        foreach (var teamRating in teamRatings)
        {
            var teamMatches = snapshots
                .Where(snapshot => snapshot.HomeTeamId == teamRating.TeamId || snapshot.AwayTeamId == teamRating.TeamId)
                .Take(run.MatchCount)
                .Select((snapshot, index) => ToFormMatch(run, teamRating.TeamId, snapshot, index))
                .ToList();

            var weightSum = teamMatches.Sum(match => match.Weight);
            var weightedActual = teamMatches.Sum(match => match.Actual * match.Weight);
            var weightedExpected = teamMatches.Sum(match => match.Expected * match.Weight);
            var weightedDelta = teamMatches.Sum(match => match.WeightedDelta);
            var averageDelta = weightSum == 0 ? 0 : weightedDelta / weightSum;
            var adjustment = Clamp(averageDelta * run.Scale, -run.MaxAdjustment, run.MaxAdjustment);

            dbContext.TeamFormMatchSnapshots.AddRange(teamMatches);
            dbContext.TeamFormRatings.Add(new TeamFormRating
            {
                FormRatingRunId = run.Id,
                TeamId = teamRating.TeamId,
                MatchCount = teamMatches.Count,
                WeightedActual = RoundMetric(weightedActual),
                WeightedExpected = RoundMetric(weightedExpected),
                WeightedDelta = RoundMetric(weightedDelta),
                AverageDelta = RoundMetric(averageDelta),
                FormAdjustment = RoundRating(adjustment),
                LastMatchUtc = teamMatches.Count == 0 ? null : teamMatches.Max(match => match.KickoffUtc),
                UpdatedAtUtc = now
            });

            processedTeams++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return processedTeams;
    }

    private static TeamFormMatchSnapshot ToFormMatch(
        FormRatingRun run,
        int teamId,
        MatchEloSnapshot snapshot,
        int index)
    {
        var isHome = snapshot.HomeTeamId == teamId;
        var actual = isHome ? snapshot.HomeActual : snapshot.AwayActual;
        var expected = isHome ? snapshot.HomeExpected : snapshot.AwayExpected;
        var delta = actual - expected;
        var weight = WeightForIndex(index);
        return new TeamFormMatchSnapshot
        {
            FormRatingRunId = run.Id,
            TeamId = teamId,
            OpponentTeamId = isHome ? snapshot.AwayTeamId : snapshot.HomeTeamId,
            MatchEloSnapshotId = snapshot.Id,
            LiveScoreEventId = snapshot.LiveScoreEventId,
            KickoffUtc = snapshot.KickoffUtc,
            IsHome = isHome,
            Actual = actual,
            Expected = expected,
            Delta = RoundMetric(delta),
            Weight = weight,
            WeightedDelta = RoundMetric(delta * weight)
        };
    }

    private static decimal WeightForIndex(int index)
    {
        return index switch
        {
            0 => 1.00m,
            1 => 0.85m,
            2 => 0.70m,
            3 => 0.55m,
            4 => 0.40m,
            _ => Math.Max(0.10m, 0.40m - ((index - 4) * 0.05m))
        };
    }

    private static decimal Clamp(decimal value, decimal min, decimal max)
    {
        return Math.Min(Math.Max(value, min), max);
    }

    private static decimal RoundMetric(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundRating(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static FormRatingRunDto ToDto(FormRatingRun run)
    {
        return new FormRatingRunDto(
            run.Id,
            run.TournamentId,
            run.EloRatingRunId,
            run.MatchCount,
            run.Scale,
            run.MaxAdjustment,
            run.Status,
            run.StartedAtUtc,
            run.FinishedAtUtc,
            run.ProcessedTeams,
            run.ErrorMessage);
    }
}
