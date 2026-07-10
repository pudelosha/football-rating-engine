using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class PerformanceRatingService(
    AppDbContext dbContext,
    ILiveScoreClient liveScoreClient) : IPerformanceRatingService
{
    public async Task<RebuildPerformanceRatingResponse> RebuildAsync(
        int tournamentId,
        RebuildPerformanceRatingRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await dbContext.Tournaments.FirstOrDefaultAsync(t => t.Id == tournamentId, cancellationToken);
        if (tournament is null)
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

        var run = new PerformanceRatingRun
        {
            TournamentId = tournamentId,
            EloRatingRunId = eloRun.Id,
            MatchCount = Math.Clamp(request.MatchCount, 1, 10),
            Scale = request.Scale <= 0 ? 45 : request.Scale,
            MaxAdjustment = request.MaxAdjustment <= 0 ? 45 : request.MaxAdjustment,
            Status = EloRatingRunStatus.Running,
            StartedAtUtc = DateTimeOffset.UtcNow
        };

        dbContext.PerformanceRatingRuns.Add(run);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            run.ProcessedTeams = await CalculatePerformanceAsync(tournament, run, cancellationToken);
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

        return new RebuildPerformanceRatingResponse(
            run.Id,
            run.TournamentId,
            run.EloRatingRunId,
            run.Status,
            run.ProcessedTeams,
            run.ErrorMessage);
    }

    public async Task<PerformanceRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        var run = await dbContext.PerformanceRatingRuns
            .Where(run => run.TournamentId == tournamentId)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return run is null ? null : ToDto(run);
    }

    public async Task<IReadOnlyList<TeamPerformanceRatingDto>> GetLatestTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var latestRun = await dbContext.PerformanceRatingRuns
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new { run.Id, run.EloRatingRunId })
            .FirstOrDefaultAsync(cancellationToken);

        if (latestRun is null)
        {
            return [];
        }

        var ratings = await dbContext.TeamPerformanceRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.PerformanceRatingRunId == latestRun.Id)
            .Join(
                dbContext.TeamEloRatings.Where(rating => rating.EloRatingRunId == latestRun.EloRatingRunId),
                performance => performance.TeamId,
                elo => elo.TeamId,
                (performance, elo) => new
                {
                    Performance = performance,
                    Elo = elo,
                    PerformanceRating = elo.Rating + performance.PerformanceAdjustment
                })
            .OrderByDescending(rating => rating.PerformanceRating)
            .ToListAsync(cancellationToken);

        return ratings
            .Select(rating => new TeamPerformanceRatingDto(
                rating.Performance.TeamId,
                rating.Performance.Team.Name,
                rating.Performance.Team.Abbreviation,
                rating.Elo.Rating,
                rating.Performance.PerformanceAdjustment,
                rating.PerformanceRating,
                rating.Performance.MatchCount,
                rating.Performance.DataCoverage,
                rating.Performance.RawPerformanceScore,
                rating.Performance.LastMatchUtc))
            .ToList();
    }

    public async Task<IReadOnlyList<TeamPerformanceMatchSnapshotDto>> GetRunSnapshotsAsync(
        int runId,
        CancellationToken cancellationToken)
    {
        return await dbContext.TeamPerformanceMatchSnapshots
            .Include(snapshot => snapshot.Team)
            .Include(snapshot => snapshot.OpponentTeam)
            .Where(snapshot => snapshot.PerformanceRatingRunId == runId)
            .OrderBy(snapshot => snapshot.Team.Name)
            .ThenByDescending(snapshot => snapshot.KickoffUtc)
            .Select(snapshot => new TeamPerformanceMatchSnapshotDto(
                snapshot.Id,
                snapshot.PerformanceRatingRunId,
                snapshot.TeamId,
                snapshot.Team.Name,
                snapshot.OpponentTeamId,
                snapshot.OpponentTeam.Name,
                snapshot.LiveScoreEventId,
                snapshot.KickoffUtc,
                snapshot.IsHome,
                snapshot.DataCoverage,
                snapshot.XgScore,
                snapshot.ShotScore,
                snapshot.ShotsOnTargetScore,
                snapshot.ShotQualityScore,
                snapshot.PossessionScore,
                snapshot.TerritoryScore,
                snapshot.OffsidesScore,
                snapshot.FoulStressScore,
                snapshot.GoalkeeperStressScore,
                snapshot.RawPerformanceScore,
                snapshot.Weight,
                snapshot.WeightedPerformanceScore))
            .ToListAsync(cancellationToken);
    }

    private async Task<int> CalculatePerformanceAsync(
        Tournament tournament,
        PerformanceRatingRun run,
        CancellationToken cancellationToken)
    {
        var teamRatings = await dbContext.TeamEloRatings
            .Where(rating => rating.EloRatingRunId == run.EloRatingRunId)
            .ToListAsync(cancellationToken);

        var snapshots = await dbContext.MatchEloSnapshots
            .Include(snapshot => snapshot.HistoricalMatch)
            .Where(snapshot => snapshot.EloRatingRunId == run.EloRatingRunId)
            .OrderByDescending(snapshot => snapshot.KickoffUtc)
            .ThenByDescending(snapshot => snapshot.LiveScoreEventId)
            .ToListAsync(cancellationToken);

        var candidateSnapshots = teamRatings
            .SelectMany(teamRating => snapshots
                .Where(snapshot => snapshot.HomeTeamId == teamRating.TeamId || snapshot.AwayTeamId == teamRating.TeamId)
                .Take(run.MatchCount))
            .GroupBy(snapshot => snapshot.LiveScoreEventId, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .ToList();

        var statisticsByEventId = await LoadPerformanceStatisticsAsync(tournament, candidateSnapshots, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var processedTeams = 0;

        foreach (var teamRating in teamRatings)
        {
            var teamMatches = snapshots
                .Where(snapshot =>
                    (snapshot.HomeTeamId == teamRating.TeamId || snapshot.AwayTeamId == teamRating.TeamId) &&
                    statisticsByEventId.ContainsKey(snapshot.LiveScoreEventId))
                .Take(run.MatchCount)
                .Select((snapshot, index) => ToPerformanceMatch(
                    run,
                    teamRating.TeamId,
                    snapshot,
                    statisticsByEventId[snapshot.LiveScoreEventId],
                    index))
                .ToList();

            var weightSum = teamMatches.Sum(match => match.Weight);
            var coverageWeightSum = teamMatches.Sum(match => match.DataCoverage * match.Weight);
            var weightedPerformance = teamMatches.Sum(match => match.WeightedPerformanceScore);
            var rawScore = weightSum == 0 ? 0 : weightedPerformance / weightSum;
            var dataCoverage = weightSum == 0 ? 0 : coverageWeightSum / weightSum;
            var adjustment = Clamp(rawScore * run.Scale, -run.MaxAdjustment, run.MaxAdjustment);

            dbContext.TeamPerformanceMatchSnapshots.AddRange(teamMatches);
            dbContext.TeamPerformanceRatings.Add(new TeamPerformanceRating
            {
                PerformanceRatingRunId = run.Id,
                TeamId = teamRating.TeamId,
                MatchCount = teamMatches.Count,
                DataCoverage = RoundMetric(dataCoverage),
                RawPerformanceScore = RoundMetric(rawScore),
                PerformanceAdjustment = RoundRating(adjustment),
                LastMatchUtc = teamMatches.Count == 0 ? null : teamMatches.Max(match => match.KickoffUtc),
                UpdatedAtUtc = now
            });

            processedTeams++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return processedTeams;
    }

    private static TeamPerformanceMatchSnapshot ToPerformanceMatch(
        PerformanceRatingRun run,
        int teamId,
        MatchEloSnapshot snapshot,
        PerformanceStatisticsValues statistics,
        int index)
    {
        var isHome = snapshot.HomeTeamId == teamId;
        var score = CalculateMatchScore(statistics, isHome);
        var weight = WeightForIndex(index);

        return new TeamPerformanceMatchSnapshot
        {
            PerformanceRatingRunId = run.Id,
            TeamId = teamId,
            OpponentTeamId = isHome ? snapshot.AwayTeamId : snapshot.HomeTeamId,
            MatchEloSnapshotId = snapshot.Id,
            MatchStatisticsId = statistics.MatchStatisticsId,
            HistoricalMatchStatisticsId = statistics.HistoricalMatchStatisticsId,
            LiveScoreEventId = snapshot.LiveScoreEventId,
            KickoffUtc = snapshot.KickoffUtc,
            IsHome = isHome,
            DataCoverage = score.DataCoverage,
            XgScore = score.XgScore,
            ShotScore = score.ShotScore,
            ShotsOnTargetScore = score.ShotsOnTargetScore,
            ShotQualityScore = score.ShotQualityScore,
            PossessionScore = score.PossessionScore,
            TerritoryScore = score.TerritoryScore,
            OffsidesScore = score.OffsidesScore,
            FoulStressScore = score.FoulStressScore,
            GoalkeeperStressScore = score.GoalkeeperStressScore,
            RawPerformanceScore = score.RawPerformanceScore,
            Weight = weight,
            WeightedPerformanceScore = RoundMetric(score.RawPerformanceScore * weight)
        };
    }

    private async Task<Dictionary<string, PerformanceStatisticsValues>> LoadPerformanceStatisticsAsync(
        Tournament tournament,
        IReadOnlyList<MatchEloSnapshot> candidateSnapshots,
        CancellationToken cancellationToken)
    {
        var eventIds = candidateSnapshots
            .Select(snapshot => snapshot.LiveScoreEventId)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var currentStatistics = await dbContext.MatchStatistics
            .Where(statistics => eventIds.Contains(statistics.LiveScoreEventId))
            .ToListAsync(cancellationToken);

        var historicalStatistics = await dbContext.HistoricalMatchStatistics
            .Where(statistics => eventIds.Contains(statistics.LiveScoreEventId))
            .ToListAsync(cancellationToken);

        var valuesByEventId = new Dictionary<string, PerformanceStatisticsValues>(StringComparer.OrdinalIgnoreCase);
        foreach (var statistics in currentStatistics)
        {
            valuesByEventId[statistics.LiveScoreEventId] = FromCurrentStatistics(statistics);
        }

        foreach (var statistics in historicalStatistics)
        {
            valuesByEventId.TryAdd(statistics.LiveScoreEventId, FromHistoricalStatistics(statistics));
        }

        foreach (var snapshot in candidateSnapshots.Where(snapshot => !valuesByEventId.ContainsKey(snapshot.LiveScoreEventId)))
        {
            var row = await liveScoreClient.GetMatchStatisticsAsync(
                tournament,
                snapshot.LiveScoreEventId,
                cancellationToken);
            if (row is null)
            {
                continue;
            }

            var statistics = CreateHistoricalStatistics(snapshot, row);
            dbContext.HistoricalMatchStatistics.Add(statistics);
            await dbContext.SaveChangesAsync(cancellationToken);

            valuesByEventId[statistics.LiveScoreEventId] = FromHistoricalStatistics(statistics);
        }

        return valuesByEventId;
    }

    private static HistoricalMatchStatistics CreateHistoricalStatistics(
        MatchEloSnapshot snapshot,
        LiveScoreMatchStatisticsRow row)
    {
        var now = DateTimeOffset.UtcNow;
        return new HistoricalMatchStatistics
        {
            HistoricalMatchId = snapshot.HistoricalMatchId,
            LiveScoreEventId = string.IsNullOrWhiteSpace(row.EventId) ? snapshot.LiveScoreEventId : row.EventId,
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

    private static PerformanceStatisticsValues FromCurrentStatistics(MatchStatistics statistics)
    {
        return new PerformanceStatisticsValues(
            statistics.Id,
            null,
            statistics.HomeExpectedGoals,
            statistics.AwayExpectedGoals,
            statistics.HomeShotsOnTarget,
            statistics.AwayShotsOnTarget,
            statistics.HomeShotsOffTarget,
            statistics.AwayShotsOffTarget,
            statistics.HomeBlockedShots,
            statistics.AwayBlockedShots,
            statistics.HomePossession,
            statistics.AwayPossession,
            statistics.HomeCorners,
            statistics.AwayCorners,
            statistics.HomeFouls,
            statistics.AwayFouls,
            statistics.HomeCrosses,
            statistics.AwayCrosses,
            statistics.HomeGoalkeeperSaves,
            statistics.AwayGoalkeeperSaves,
            statistics.HomeOffsides,
            statistics.AwayOffsides);
    }

    private static PerformanceStatisticsValues FromHistoricalStatistics(HistoricalMatchStatistics statistics)
    {
        return new PerformanceStatisticsValues(
            null,
            statistics.Id,
            statistics.HomeExpectedGoals,
            statistics.AwayExpectedGoals,
            statistics.HomeShotsOnTarget,
            statistics.AwayShotsOnTarget,
            statistics.HomeShotsOffTarget,
            statistics.AwayShotsOffTarget,
            statistics.HomeBlockedShots,
            statistics.AwayBlockedShots,
            statistics.HomePossession,
            statistics.AwayPossession,
            statistics.HomeCorners,
            statistics.AwayCorners,
            statistics.HomeFouls,
            statistics.AwayFouls,
            statistics.HomeCrosses,
            statistics.AwayCrosses,
            statistics.HomeGoalkeeperSaves,
            statistics.AwayGoalkeeperSaves,
            statistics.HomeOffsides,
            statistics.AwayOffsides);
    }

    private static MatchPerformanceScore CalculateMatchScore(PerformanceStatisticsValues statistics, bool isHome)
    {
        var components = new List<(decimal? Score, decimal Weight)>
        {
            (DiffScore(Value(statistics.HomeExpectedGoals, statistics.AwayExpectedGoals, isHome), Value(statistics.AwayExpectedGoals, statistics.HomeExpectedGoals, isHome), 2.0m), 0.35m),
            (DiffScore(TotalShots(statistics, isHome), TotalShots(statistics, !isHome), 12m), 0.15m),
            (DiffScore(Value(statistics.HomeShotsOnTarget, statistics.AwayShotsOnTarget, isHome), Value(statistics.AwayShotsOnTarget, statistics.HomeShotsOnTarget, isHome), 6m), 0.15m),
            (ShotQualityScore(statistics, isHome), 0.10m),
            (DiffScore(Value(statistics.HomePossession, statistics.AwayPossession, isHome), Value(statistics.AwayPossession, statistics.HomePossession, isHome), 30m), 0.05m),
            (TerritoryScore(statistics, isHome), 0.075m),
            (DiffScore(Value(statistics.HomeOffsides, statistics.AwayOffsides, isHome), Value(statistics.AwayOffsides, statistics.HomeOffsides, isHome), 4m), 0.025m),
            (StressScore(Value(statistics.HomeFouls, statistics.AwayFouls, isHome), Value(statistics.AwayFouls, statistics.HomeFouls, isHome), 10m), 0.05m),
            (StressScore(Value(statistics.HomeGoalkeeperSaves, statistics.AwayGoalkeeperSaves, isHome), Value(statistics.AwayGoalkeeperSaves, statistics.HomeGoalkeeperSaves, isHome), 6m), 0.05m)
        };

        var availableWeight = components.Where(component => component.Score.HasValue).Sum(component => component.Weight);
        var rawScore = availableWeight == 0
            ? 0
            : components
                .Where(component => component.Score.HasValue)
                .Sum(component => component.Score!.Value * component.Weight) / availableWeight;

        return new MatchPerformanceScore(
            DataCoverage: RoundMetric(availableWeight),
            XgScore: RoundNullable(components[0].Score),
            ShotScore: RoundNullable(components[1].Score),
            ShotsOnTargetScore: RoundNullable(components[2].Score),
            ShotQualityScore: RoundNullable(components[3].Score),
            PossessionScore: RoundNullable(components[4].Score),
            TerritoryScore: RoundNullable(components[5].Score),
            OffsidesScore: RoundNullable(components[6].Score),
            FoulStressScore: RoundNullable(components[7].Score),
            GoalkeeperStressScore: RoundNullable(components[8].Score),
            RawPerformanceScore: RoundMetric(rawScore));
    }

    private static decimal? TerritoryScore(PerformanceStatisticsValues statistics, bool isHome)
    {
        var cornerScore = DiffScore(Value(statistics.HomeCorners, statistics.AwayCorners, isHome), Value(statistics.AwayCorners, statistics.HomeCorners, isHome), 8m);
        var crossScore = DiffScore(Value(statistics.HomeCrosses, statistics.AwayCrosses, isHome), Value(statistics.AwayCrosses, statistics.HomeCrosses, isHome), 20m);
        if (!cornerScore.HasValue && !crossScore.HasValue)
        {
            return null;
        }

        var weight = (cornerScore.HasValue ? 0.65m : 0) + (crossScore.HasValue ? 0.35m : 0);
        return ((cornerScore ?? 0) * 0.65m + (crossScore ?? 0) * 0.35m) / weight;
    }

    private static decimal? ShotQualityScore(PerformanceStatisticsValues statistics, bool isHome)
    {
        var teamXg = Value(statistics.HomeExpectedGoals, statistics.AwayExpectedGoals, isHome);
        var opponentXg = Value(statistics.AwayExpectedGoals, statistics.HomeExpectedGoals, isHome);
        var teamShots = TotalShots(statistics, isHome);
        var opponentShots = TotalShots(statistics, !isHome);
        if (!teamXg.HasValue || !opponentXg.HasValue || !teamShots.HasValue || !opponentShots.HasValue || teamShots.Value <= 0 || opponentShots.Value <= 0)
        {
            return null;
        }

        return Normalize((teamXg.Value / teamShots.Value) - (opponentXg.Value / opponentShots.Value), 0.20m);
    }

    private static decimal? TotalShots(PerformanceStatisticsValues statistics, bool isHome)
    {
        var on = Value(statistics.HomeShotsOnTarget, statistics.AwayShotsOnTarget, isHome);
        var off = Value(statistics.HomeShotsOffTarget, statistics.AwayShotsOffTarget, isHome);
        var blocked = Value(statistics.HomeBlockedShots, statistics.AwayBlockedShots, isHome);
        if (!on.HasValue && !off.HasValue && !blocked.HasValue)
        {
            return null;
        }

        return (on ?? 0) + (off ?? 0) + (blocked ?? 0);
    }

    private static decimal? DiffScore(decimal? team, decimal? opponent, decimal cap)
    {
        return team.HasValue && opponent.HasValue ? Normalize(team.Value - opponent.Value, cap) : null;
    }

    private static decimal? StressScore(decimal? team, decimal? opponent, decimal cap)
    {
        var diff = DiffScore(team, opponent, cap);
        return diff.HasValue ? -diff.Value : null;
    }

    private static decimal Normalize(decimal value, decimal cap)
    {
        return Clamp(value / cap, -1, 1);
    }

    private static decimal? Value(decimal? home, decimal? away, bool isHome)
    {
        return isHome ? home : away;
    }

    private static decimal? Value(int? home, int? away, bool isHome)
    {
        var value = isHome ? home : away;
        return value.HasValue ? value.Value : null;
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

    private static decimal? RoundNullable(decimal? value)
    {
        return value.HasValue ? RoundMetric(value.Value) : null;
    }

    private static PerformanceRatingRunDto ToDto(PerformanceRatingRun run)
    {
        return new PerformanceRatingRunDto(
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

    private sealed record MatchPerformanceScore(
        decimal DataCoverage,
        decimal? XgScore,
        decimal? ShotScore,
        decimal? ShotsOnTargetScore,
        decimal? ShotQualityScore,
        decimal? PossessionScore,
        decimal? TerritoryScore,
        decimal? OffsidesScore,
        decimal? FoulStressScore,
        decimal? GoalkeeperStressScore,
        decimal RawPerformanceScore);

    private sealed record PerformanceStatisticsValues(
        int? MatchStatisticsId,
        int? HistoricalMatchStatisticsId,
        decimal? HomeExpectedGoals,
        decimal? AwayExpectedGoals,
        int? HomeShotsOnTarget,
        int? AwayShotsOnTarget,
        int? HomeShotsOffTarget,
        int? AwayShotsOffTarget,
        int? HomeBlockedShots,
        int? AwayBlockedShots,
        int? HomePossession,
        int? AwayPossession,
        int? HomeCorners,
        int? AwayCorners,
        int? HomeFouls,
        int? AwayFouls,
        int? HomeCrosses,
        int? AwayCrosses,
        int? HomeGoalkeeperSaves,
        int? AwayGoalkeeperSaves,
        int? HomeOffsides,
        int? AwayOffsides);
}
