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
        string? requestedCurrentRoundInfo,
        string? compareRoundInfo,
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
                new CombinedRatingRunContextDto(null, null, null, null, string.Empty, string.Empty, string.Empty, string.Empty, [], null, false, false, DateTimeOffset.UtcNow),
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
                new CombinedRatingRunContextDto(null, null, null, null, string.Empty, string.Empty, string.Empty, string.Empty, [], null, false, false, DateTimeOffset.UtcNow),
                []);
        }

        var availableRoundInfos = await GetAvailableRoundInfosAsync(tournamentId, cancellationToken);
        var ratingCoveredRoundInfos = await GetRatingCoveredRoundInfosAsync(latestEloRun.Id, cancellationToken);
        var currentRoundInfo = availableRoundInfos.LastOrDefault() ?? string.Empty;
        var selectedCurrentRoundInfo = ResolveCurrentRoundInfo(requestedCurrentRoundInfo, availableRoundInfos, currentRoundInfo);
        var isSelectedCurrentRoundCoveredByRatings = ratingCoveredRoundInfos.Contains(selectedCurrentRoundInfo);
        var selectedCurrentRoundCutoffUtc = string.IsNullOrWhiteSpace(selectedCurrentRoundInfo)
            ? null
            : await GetRoundCutoffUtcAsync(tournamentId, selectedCurrentRoundInfo, cancellationToken);
        var previousRoundInfo = GetPreviousRoundInfo(availableRoundInfos, selectedCurrentRoundInfo);
        var selectedCompareRoundInfo = ResolveCompareRoundInfo(compareRoundInfo, availableRoundInfos);
        var isCompareRoundCoveredByRatings = ratingCoveredRoundInfos.Contains(selectedCompareRoundInfo);

        var latestFormRun = tournamentSetup.RatingIncludeForm
            ? await dbContext.FormRatingRuns
                .Where(run =>
                    run.TournamentId == tournamentId &&
                    run.EloRatingRunId == latestEloRun.Id &&
                    run.Status == EloRatingRunStatus.Succeeded)
                .OrderByDescending(run => run.StartedAtUtc)
                .Select(run => new { run.Id, run.EloRatingRunId, run.MatchCount, run.Scale, run.MaxAdjustment })
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var latestPerformanceRun = tournamentSetup.RatingIncludePerformance
            ? await dbContext.PerformanceRatingRuns
                .Where(run =>
                    run.TournamentId == tournamentId &&
                    run.EloRatingRunId == latestEloRun.Id &&
                    run.Status == EloRatingRunStatus.Succeeded)
                .OrderByDescending(run => run.StartedAtUtc)
                .Select(run => new { run.Id, run.EloRatingRunId, run.MatchCount, run.Scale, run.MaxAdjustment })
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var latestBaseRatings = await dbContext.TeamEloRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.EloRatingRunId == latestEloRun.Id)
            .ToListAsync(cancellationToken);

        var currentBaseRatings = selectedCurrentRoundCutoffUtc.HasValue
            ? await GetBaseEloRatingsAtOrBeforeAsync(tournamentId, latestEloRun.Id, selectedCurrentRoundCutoffUtc.Value, cancellationToken)
            : [];

        var formRatings = latestFormRun is null
            ? []
            : await GetFormRatingsAtOrBeforeAsync(
                latestFormRun.Id,
                selectedCurrentRoundCutoffUtc,
                latestFormRun.MatchCount,
                latestFormRun.Scale,
                latestFormRun.MaxAdjustment,
                cancellationToken);

        var performanceRatings = latestPerformanceRun is null
            ? []
            : await GetPerformanceRatingsAtOrBeforeAsync(
                latestPerformanceRun.Id,
                selectedCurrentRoundCutoffUtc,
                latestPerformanceRun.MatchCount,
                latestPerformanceRun.Scale,
                latestPerformanceRun.MaxAdjustment,
                cancellationToken);

        var squadRatings = tournamentSetup.RatingIncludeSquad
            ? (await squadQualityService.GetTournamentTeamRatingsAsync(tournamentId, cancellationToken))
                .ToDictionary(rating => rating.TeamId)
            : [];
        var compareRoundCutoffUtc = string.IsNullOrWhiteSpace(selectedCompareRoundInfo)
            ? null
            : await GetRoundCutoffUtcAsync(tournamentId, selectedCompareRoundInfo, cancellationToken);
        var compareBaseRatings = string.IsNullOrWhiteSpace(selectedCompareRoundInfo)
            ? new Dictionary<int, decimal>()
            : await GetBaseEloRatingsAtOrBeforeAsync(tournamentId, latestEloRun.Id, compareRoundCutoffUtc!.Value, cancellationToken);
        var compareFormRatings = latestFormRun is null || !compareRoundCutoffUtc.HasValue
            ? []
            : await GetFormRatingsAtOrBeforeAsync(
                latestFormRun.Id,
                compareRoundCutoffUtc,
                latestFormRun.MatchCount,
                latestFormRun.Scale,
                latestFormRun.MaxAdjustment,
                cancellationToken);
        var comparePerformanceRatings = latestPerformanceRun is null || !compareRoundCutoffUtc.HasValue
            ? []
            : await GetPerformanceRatingsAtOrBeforeAsync(
                latestPerformanceRun.Id,
                compareRoundCutoffUtc,
                latestPerformanceRun.MatchCount,
                latestPerformanceRun.Scale,
                latestPerformanceRun.MaxAdjustment,
                cancellationToken);

        var teams = latestBaseRatings
            .Select(baseRating =>
            {
                formRatings.TryGetValue(baseRating.TeamId, out var formRating);
                performanceRatings.TryGetValue(baseRating.TeamId, out var performanceRating);
                squadRatings.TryGetValue(baseRating.TeamId, out var squadRating);
                compareFormRatings.TryGetValue(baseRating.TeamId, out var compareFormRating);
                comparePerformanceRatings.TryGetValue(baseRating.TeamId, out var comparePerformanceRating);

                var currentBaseRating = currentBaseRatings.GetValueOrDefault(baseRating.TeamId, baseRating.Rating);
                var formAdjustment = formRating?.FormAdjustment ?? 0;
                var performanceAdjustment = performanceRating?.PerformanceAdjustment ?? 0;
                var squadAdjustment = squadRating?.SquadQualityAdjustment ?? 0;
                var totalAdjustment = formAdjustment + performanceAdjustment + squadAdjustment;
                var finalRating = currentBaseRating + totalAdjustment;
                compareBaseRatings.TryGetValue(baseRating.TeamId, out var compareBaseRating);
                var hasRoundChange = isSelectedCurrentRoundCoveredByRatings &&
                    isCompareRoundCoveredByRatings &&
                    !string.IsNullOrWhiteSpace(selectedCompareRoundInfo) &&
                    compareBaseRatings.ContainsKey(baseRating.TeamId);
                var previousFinalRating = hasRoundChange
                    ? RoundRating(compareBaseRating +
                        (compareFormRating?.FormAdjustment ?? 0) +
                        (comparePerformanceRating?.PerformanceAdjustment ?? 0) +
                        squadAdjustment)
                    : (decimal?)null;
                var finalRatingChange = previousFinalRating.HasValue
                    ? RoundRating(finalRating - previousFinalRating.Value)
                    : (decimal?)null;

                return new TeamCombinedRatingDto(
                    baseRating.TeamId,
                    baseRating.Team.Name,
                    baseRating.Team.Abbreviation,
                    currentBaseRating,
                    formAdjustment,
                    performanceAdjustment,
                    squadAdjustment,
                    RoundRating(totalAdjustment),
                    RoundRating(finalRating),
                    previousFinalRating,
                    finalRatingChange,
                    CalculateConfidence(formRating, performanceRating, squadRating),
                    formRating is not null,
                    performanceRating is not null,
                    squadRating?.SnapshotId is not null,
                    baseRating.MatchesPlayed,
                    formRating?.MatchCount ?? 0,
                    performanceRating?.MatchCount ?? 0,
                    squadRating?.PlayerCount ?? 0,
                    formRating?.WeightedActual ?? 0,
                    formRating?.WeightedExpected ?? 0,
                    formRating?.WeightedDelta ?? 0,
                    formRating?.AverageDelta ?? 0,
                    performanceRating?.DataCoverage ?? 0,
                    performanceRating?.RawPerformanceScore ?? 0,
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
                selectedCurrentRoundInfo,
                previousRoundInfo,
                selectedCompareRoundInfo,
                availableRoundInfos,
                selectedCurrentRoundCutoffUtc,
                isSelectedCurrentRoundCoveredByRatings,
                isCompareRoundCoveredByRatings,
                DateTimeOffset.UtcNow),
            teams);
    }

    private async Task<IReadOnlyList<string>> GetAvailableRoundInfosAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Matches
            .Where(match =>
                match.TournamentId == tournamentId &&
                match.Status == MatchStatus.Finished &&
                match.RoundInfo != string.Empty)
            .GroupBy(match => match.RoundInfo)
            .Select(group => new
            {
                RoundInfo = group.Key,
                LastKickoffUtc = group.Max(match => match.KickoffUtc)
            })
            .OrderBy(group => group.LastKickoffUtc)
            .ThenBy(group => group.RoundInfo)
            .Select(group => group.RoundInfo)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlySet<string>> GetRatingCoveredRoundInfosAsync(
        int eloRatingRunId,
        CancellationToken cancellationToken)
    {
        var roundInfos = await dbContext.MatchEloSnapshots
            .Include(snapshot => snapshot.HistoricalMatch)
            .Where(snapshot =>
                snapshot.EloRatingRunId == eloRatingRunId &&
                snapshot.HistoricalMatch.RoundInfo != string.Empty)
            .Select(snapshot => snapshot.HistoricalMatch.RoundInfo)
            .Distinct()
            .ToListAsync(cancellationToken);

        return roundInfos.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static string GetPreviousRoundInfo(
        IReadOnlyList<string> roundInfos,
        string currentRoundInfo)
    {
        if (string.IsNullOrWhiteSpace(currentRoundInfo))
        {
            return string.Empty;
        }

        var currentIndex = roundInfos
            .Select((roundInfo, index) => new { roundInfo, index })
            .FirstOrDefault(item => item.roundInfo == currentRoundInfo)
            ?.index ?? -1;

        return currentIndex > 0 ? roundInfos[currentIndex - 1] : string.Empty;
    }

    private static string ResolveCurrentRoundInfo(
        string? requestedRoundInfo,
        IReadOnlyList<string> availableRoundInfos,
        string latestRoundInfo)
    {
        if (!string.IsNullOrWhiteSpace(requestedRoundInfo) &&
            availableRoundInfos.Contains(requestedRoundInfo))
        {
            return requestedRoundInfo;
        }

        return latestRoundInfo;
    }

    private static string ResolveCompareRoundInfo(
        string? requestedRoundInfo,
        IReadOnlyList<string> availableRoundInfos)
    {
        if (!string.IsNullOrWhiteSpace(requestedRoundInfo) &&
            availableRoundInfos.Contains(requestedRoundInfo))
        {
            return requestedRoundInfo;
        }

        return availableRoundInfos.FirstOrDefault() ?? string.Empty;
    }

    private async Task<Dictionary<int, decimal>> GetBaseEloRatingsAfterRoundAsync(
        int tournamentId,
        int eloRunId,
        string roundInfo,
        CancellationToken cancellationToken)
    {
        var checkpointKickoffUtc = await GetRoundCutoffUtcAsync(tournamentId, roundInfo, cancellationToken);
        if (!checkpointKickoffUtc.HasValue)
        {
            return [];
        }

        return await GetBaseEloRatingsAtOrBeforeAsync(tournamentId, eloRunId, checkpointKickoffUtc.Value, cancellationToken);
    }

    private async Task<DateTimeOffset?> GetRoundCutoffUtcAsync(
        int tournamentId,
        string roundInfo,
        CancellationToken cancellationToken)
    {
        return await dbContext.Matches
            .Where(match =>
                match.TournamentId == tournamentId &&
                match.Status == MatchStatus.Finished &&
                match.RoundInfo == roundInfo)
            .Select(match => (DateTimeOffset?)match.KickoffUtc)
            .MaxAsync(cancellationToken);
    }

    private async Task<Dictionary<int, decimal>> GetBaseEloRatingsAtOrBeforeAsync(
        int tournamentId,
        int eloRunId,
        DateTimeOffset cutoffUtc,
        CancellationToken cancellationToken)
    {
        var snapshots = await dbContext.MatchEloSnapshots
            .Where(snapshot =>
                snapshot.EloRatingRunId == eloRunId &&
                snapshot.KickoffUtc <= cutoffUtc)
            .Select(snapshot => new
            {
                snapshot.HomeTeamId,
                snapshot.AwayTeamId,
                snapshot.KickoffUtc,
                snapshot.Id,
                snapshot.HomeEloAfter,
                snapshot.AwayEloAfter
            })
            .ToListAsync(cancellationToken);

        var ratings = new Dictionary<int, (DateTimeOffset KickoffUtc, int SnapshotId, decimal Rating)>();
        foreach (var snapshot in snapshots)
        {
            SetLatestRating(ratings, snapshot.HomeTeamId, snapshot.KickoffUtc, snapshot.Id, snapshot.HomeEloAfter);
            SetLatestRating(ratings, snapshot.AwayTeamId, snapshot.KickoffUtc, snapshot.Id, snapshot.AwayEloAfter);
        }

        return ratings.ToDictionary(item => item.Key, item => item.Value.Rating);
    }

    private async Task<Dictionary<int, TeamFormRating>> GetFormRatingsAtOrBeforeAsync(
        int formRunId,
        DateTimeOffset? cutoffUtc,
        int requestedMatchCount,
        decimal scale,
        decimal maxAdjustment,
        CancellationToken cancellationToken)
    {
        var query = dbContext.TeamFormMatchSnapshots
            .Where(snapshot => snapshot.FormRatingRunId == formRunId);

        if (cutoffUtc.HasValue)
        {
            query = query.Where(snapshot => snapshot.KickoffUtc <= cutoffUtc.Value);
        }

        var snapshots = await query
            .OrderBy(snapshot => snapshot.TeamId)
            .ThenByDescending(snapshot => snapshot.KickoffUtc)
            .ThenByDescending(snapshot => snapshot.Id)
            .ToListAsync(cancellationToken);

        return snapshots
            .GroupBy(snapshot => snapshot.TeamId)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var teamMatches = group
                        .Take(requestedMatchCount)
                        .Select((snapshot, index) => new
                        {
                            snapshot.Actual,
                            snapshot.Expected,
                            Delta = snapshot.Actual - snapshot.Expected,
                            Weight = WeightForIndex(index),
                            snapshot.KickoffUtc
                        })
                        .ToList();
                    var weightSum = teamMatches.Sum(match => match.Weight);
                    var weightedActual = teamMatches.Sum(match => match.Actual * match.Weight);
                    var weightedExpected = teamMatches.Sum(match => match.Expected * match.Weight);
                    var weightedDelta = teamMatches.Sum(match => match.Delta * match.Weight);
                    var averageDelta = weightSum == 0 ? 0 : weightedDelta / weightSum;
                    var sampleCoverage = SampleCoverage(teamMatches.Count, requestedMatchCount);
                    var adjustmentCap = maxAdjustment * sampleCoverage;
                    var adjustment = Clamp(averageDelta * scale * sampleCoverage, -adjustmentCap, adjustmentCap);

                    return new TeamFormRating
                    {
                        TeamId = group.Key,
                        MatchCount = teamMatches.Count,
                        WeightedActual = RoundMetric(weightedActual),
                        WeightedExpected = RoundMetric(weightedExpected),
                        WeightedDelta = RoundMetric(weightedDelta),
                        AverageDelta = RoundMetric(averageDelta),
                        FormAdjustment = RoundRating(adjustment),
                        LastMatchUtc = teamMatches.Count == 0 ? null : teamMatches.Max(match => match.KickoffUtc)
                    };
                });
    }

    private async Task<Dictionary<int, TeamPerformanceRating>> GetPerformanceRatingsAtOrBeforeAsync(
        int performanceRunId,
        DateTimeOffset? cutoffUtc,
        int requestedMatchCount,
        decimal scale,
        decimal maxAdjustment,
        CancellationToken cancellationToken)
    {
        var query = dbContext.TeamPerformanceMatchSnapshots
            .Where(snapshot => snapshot.PerformanceRatingRunId == performanceRunId);

        if (cutoffUtc.HasValue)
        {
            query = query.Where(snapshot => snapshot.KickoffUtc <= cutoffUtc.Value);
        }

        var snapshots = await query
            .OrderBy(snapshot => snapshot.TeamId)
            .ThenByDescending(snapshot => snapshot.KickoffUtc)
            .ThenByDescending(snapshot => snapshot.Id)
            .ToListAsync(cancellationToken);

        return snapshots
            .GroupBy(snapshot => snapshot.TeamId)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var teamMatches = group
                        .Take(requestedMatchCount)
                        .Select((snapshot, index) => new
                        {
                            snapshot.DataCoverage,
                            snapshot.RawPerformanceScore,
                            Weight = WeightForIndex(index),
                            snapshot.KickoffUtc
                        })
                        .ToList();
                    var weightSum = teamMatches.Sum(match => match.Weight);
                    var coverageWeightSum = teamMatches.Sum(match => match.DataCoverage * match.Weight);
                    var weightedPerformance = teamMatches.Sum(match => match.RawPerformanceScore * match.Weight);
                    var rawScore = weightSum == 0 ? 0 : weightedPerformance / weightSum;
                    var dataCoverage = weightSum == 0 ? 0 : coverageWeightSum / weightSum;
                    var sampleCoverage = SampleCoverage(teamMatches.Count, requestedMatchCount);
                    var adjustmentCap = maxAdjustment * sampleCoverage;
                    var adjustment = Clamp(rawScore * dataCoverage * scale * sampleCoverage, -adjustmentCap, adjustmentCap);

                    return new TeamPerformanceRating
                    {
                        TeamId = group.Key,
                        MatchCount = teamMatches.Count,
                        DataCoverage = RoundMetric(dataCoverage),
                        RawPerformanceScore = RoundMetric(rawScore),
                        PerformanceAdjustment = RoundRating(adjustment),
                        LastMatchUtc = teamMatches.Count == 0 ? null : teamMatches.Max(match => match.KickoffUtc)
                    };
                });
    }

    private static void SetLatestRating(
        Dictionary<int, (DateTimeOffset KickoffUtc, int SnapshotId, decimal Rating)> ratings,
        int teamId,
        DateTimeOffset kickoffUtc,
        int snapshotId,
        decimal rating)
    {
        if (!ratings.TryGetValue(teamId, out var current) ||
            kickoffUtc > current.KickoffUtc ||
            (kickoffUtc == current.KickoffUtc && snapshotId > current.SnapshotId))
        {
            ratings[teamId] = (kickoffUtc, snapshotId, RoundRating(rating));
        }
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

    private static decimal SampleCoverage(int matchCount, int requestedMatchCount)
    {
        if (matchCount <= 0 || requestedMatchCount <= 0)
        {
            return 0;
        }

        var actualWeight = Enumerable.Range(0, matchCount).Sum(WeightForIndex);
        var targetWeight = Enumerable.Range(0, requestedMatchCount).Sum(WeightForIndex);
        return targetWeight == 0 ? 0 : Math.Min(1, actualWeight / targetWeight);
    }

    private static decimal Clamp(decimal value, decimal min, decimal max)
    {
        return Math.Min(Math.Max(value, min), max);
    }

    private static decimal RoundMetric(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }
}
