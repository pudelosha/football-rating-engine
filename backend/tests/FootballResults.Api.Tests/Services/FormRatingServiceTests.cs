using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class FormRatingServiceTests
{
    [Fact]
    public async Task RebuildAsync_CalculatesPositiveAndNegativeAdjustmentsFromRecentEloSnapshots()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("form-rating");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var chelsea = ServiceTestData.Team("Chelsea", "CHE");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var newestMatch = ServiceTestData.HistoricalMatch(arsenal, chelsea, DateTimeOffset.UtcNow.AddDays(-1), 2, 0);
        var olderMatch = ServiceTestData.HistoricalMatch(chelsea, arsenal, DateTimeOffset.UtcNow.AddDays(-8), 1, 1);

        dbContext.AddRange(
            tournament,
            arsenal,
            chelsea,
            new TournamentTeam { Tournament = tournament, Team = arsenal },
            new TournamentTeam { Tournament = tournament, Team = chelsea },
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1510, 2),
            ServiceTestData.TeamElo(eloRun, chelsea, 1490, 2),
            newestMatch,
            olderMatch,
            ServiceTestData.MatchEloSnapshot(eloRun, newestMatch, arsenal, chelsea, 1, 0, 0.6m, 0.4m),
            ServiceTestData.MatchEloSnapshot(eloRun, olderMatch, chelsea, arsenal, 0.5m, 0.5m, 0.45m, 0.55m));
        await dbContext.SaveChangesAsync();

        var service = new FormRatingService(dbContext);
        var result = await service.RebuildAsync(
            tournament.Id,
            new RebuildFormRatingRequest(MatchCount: 2, Scale: 100, MaxAdjustment: 35),
            CancellationToken.None);

        Assert.Equal(EloRatingRunStatus.Succeeded, result.Status);
        Assert.Equal(2, result.ProcessedTeams);

        var ratings = await dbContext.TeamFormRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.FormRatingRunId == result.RunId)
            .ToDictionaryAsync(rating => rating.Team.Name);

        Assert.True(ratings["Arsenal"].FormAdjustment > 0);
        Assert.True(ratings["Chelsea"].FormAdjustment < 0);
        Assert.Equal(2, ratings["Arsenal"].MatchCount);
        Assert.Equal(4, await dbContext.TeamFormMatchSnapshots.CountAsync());
    }

    [Fact]
    public async Task GetLatestTeamRatingsAsync_ReturnsBaseEloPlusFormAdjustment()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("form-latest");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var formRun = new FormRatingRun
        {
            Tournament = tournament,
            EloRatingRun = eloRun,
            MatchCount = 5,
            Scale = 100,
            MaxAdjustment = 35,
            Status = EloRatingRunStatus.Succeeded,
            StartedAtUtc = DateTimeOffset.UtcNow,
            FinishedAtUtc = DateTimeOffset.UtcNow,
            ProcessedTeams = 1
        };

        dbContext.AddRange(
            tournament,
            arsenal,
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1500),
            formRun,
            new TeamFormRating
            {
                FormRatingRun = formRun,
                Team = arsenal,
                MatchCount = 5,
                WeightedActual = 3,
                WeightedExpected = 2,
                WeightedDelta = 1,
                AverageDelta = 0.2m,
                FormAdjustment = 17.34m,
                LastMatchUtc = DateTimeOffset.UtcNow.AddDays(-1),
                UpdatedAtUtc = DateTimeOffset.UtcNow
            });
        await dbContext.SaveChangesAsync();

        var service = new FormRatingService(dbContext);
        var ratings = await service.GetLatestTeamRatingsAsync(tournament.Id, CancellationToken.None);

        var rating = Assert.Single(ratings);
        Assert.Equal(1500, rating.BaseElo);
        Assert.Equal(17.34m, rating.FormAdjustment);
        Assert.Equal(1517.34m, rating.FormRating);
    }
}
