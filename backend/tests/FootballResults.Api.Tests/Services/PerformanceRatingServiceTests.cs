using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class PerformanceRatingServiceTests
{
    [Fact]
    public async Task RebuildAsync_UsesMatchStatisticsToRewardBetterUnderlyingPerformance()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("performance-rating");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var chelsea = ServiceTestData.Team("Chelsea", "CHE");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var historicalMatch = ServiceTestData.HistoricalMatch(arsenal, chelsea, DateTimeOffset.UtcNow.AddDays(-1), 1, 0);
        var snapshot = ServiceTestData.MatchEloSnapshot(eloRun, historicalMatch, arsenal, chelsea, 1, 0, 0.55m, 0.45m);

        dbContext.AddRange(
            tournament,
            arsenal,
            chelsea,
            new TournamentTeam { Tournament = tournament, Team = arsenal },
            new TournamentTeam { Tournament = tournament, Team = chelsea },
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1510),
            ServiceTestData.TeamElo(eloRun, chelsea, 1490),
            historicalMatch,
            snapshot,
            Statistics(snapshot.LiveScoreEventId, homeXg: 2.4m, awayXg: 0.5m, homeShotsOnTarget: 8, awayShotsOnTarget: 2));
        await dbContext.SaveChangesAsync();

        var service = new PerformanceRatingService(dbContext, new NullLiveScoreClient());
        var result = await service.RebuildAsync(
            tournament.Id,
            new RebuildPerformanceRatingRequest(MatchCount: 1, Scale: 45, MaxAdjustment: 45),
            CancellationToken.None);

        Assert.Equal(EloRatingRunStatus.Succeeded, result.Status);
        Assert.Equal(2, result.ProcessedTeams);

        var ratings = await dbContext.TeamPerformanceRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.PerformanceRatingRunId == result.RunId)
            .ToDictionaryAsync(rating => rating.Team.Name);

        Assert.True(ratings["Arsenal"].PerformanceAdjustment > 0);
        Assert.True(ratings["Chelsea"].PerformanceAdjustment < 0);
        Assert.Equal(1, ratings["Arsenal"].MatchCount);
        Assert.True(ratings["Arsenal"].DataCoverage > 0.5m);
        Assert.Equal(2, await dbContext.TeamPerformanceMatchSnapshots.CountAsync());
    }

    [Fact]
    public async Task RebuildAsync_CreatesZeroCoverageRatings_WhenNoStatisticsExist()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("performance-no-stats");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var chelsea = ServiceTestData.Team("Chelsea", "CHE");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var historicalMatch = ServiceTestData.HistoricalMatch(arsenal, chelsea, DateTimeOffset.UtcNow.AddDays(-1), 1, 0);

        dbContext.AddRange(
            tournament,
            arsenal,
            chelsea,
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1510),
            ServiceTestData.TeamElo(eloRun, chelsea, 1490),
            historicalMatch,
            ServiceTestData.MatchEloSnapshot(eloRun, historicalMatch, arsenal, chelsea, 1, 0, 0.55m, 0.45m));
        await dbContext.SaveChangesAsync();

        var service = new PerformanceRatingService(dbContext, new NullLiveScoreClient());
        var result = await service.RebuildAsync(
            tournament.Id,
            new RebuildPerformanceRatingRequest(MatchCount: 1, Scale: 45, MaxAdjustment: 45),
            CancellationToken.None);

        Assert.Equal(EloRatingRunStatus.Succeeded, result.Status);
        var ratings = await dbContext.TeamPerformanceRatings
            .Where(rating => rating.PerformanceRatingRunId == result.RunId)
            .ToListAsync();

        Assert.Equal(2, ratings.Count);
        Assert.All(ratings, rating =>
        {
            Assert.Equal(0, rating.MatchCount);
            Assert.Equal(0, rating.DataCoverage);
            Assert.Equal(0, rating.PerformanceAdjustment);
        });
    }

    private static MatchStatistics Statistics(
        string eventId,
        decimal homeXg,
        decimal awayXg,
        int homeShotsOnTarget,
        int awayShotsOnTarget)
    {
        return new MatchStatistics
        {
            LiveScoreEventId = eventId,
            FetchedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow,
            HomeExpectedGoals = homeXg,
            AwayExpectedGoals = awayXg,
            HomeShotsOnTarget = homeShotsOnTarget,
            AwayShotsOnTarget = awayShotsOnTarget,
            HomeShotsOffTarget = 6,
            AwayShotsOffTarget = 3,
            HomeBlockedShots = 4,
            AwayBlockedShots = 1,
            HomePossession = 63,
            AwayPossession = 37,
            HomeCorners = 8,
            AwayCorners = 2,
            HomeFouls = 8,
            AwayFouls = 16,
            HomeCrosses = 20,
            AwayCrosses = 8,
            HomeGoalkeeperSaves = 1,
            AwayGoalkeeperSaves = 7,
            HomeOffsides = 3,
            AwayOffsides = 1
        };
    }

    private sealed class NullLiveScoreClient : ILiveScoreClient
    {
        public Task<IReadOnlyList<LiveScoreFixtureRow>> GetCompetitionRowsAsync(
            Tournament tournament,
            LiveScoreListType listType,
            bool enrichScoreBreakdowns,
            IReadOnlySet<string> skipDetailEventIds,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<LiveScoreFixtureRow>>([]);
        }

        public Task<LiveScoreMatchStatisticsRow?> GetMatchStatisticsAsync(
            Tournament tournament,
            string eventId,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<LiveScoreMatchStatisticsRow?>(null);
        }

        public Task<IReadOnlyList<LiveScoreHistoricalMatchRow>> GetTeamDetailsRowsAsync(
            Tournament tournament,
            Team team,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<LiveScoreHistoricalMatchRow>>([]);
        }
    }
}
