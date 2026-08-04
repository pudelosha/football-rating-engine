using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class MatchPredictionSnapshotServiceTests
{
    [Fact]
    public async Task CaptureMissingFinishedMatchSnapshotsAsync_CreatesSnapshotForFinishedRatedMatch()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("prediction-snapshot");
        var tournament = ServiceTestData.Tournament(applyHomeAdvantage: true);
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 1);
        var upcomingMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Upcoming, DateTimeOffset.UtcNow.AddDays(2));

        dbContext.AddRange(tournament, home, away, finishedMatch, upcomingMatch);
        await dbContext.SaveChangesAsync();

        var combinedRatings = Ratings(
            tournament.Id,
            Rating(home, 1600, 1620),
            Rating(away, 1550, 1540));
        var service = new MatchPredictionSnapshotService(dbContext, new FakeCombinedRatingService(combinedRatings));

        var created = await service.CaptureMissingFinishedMatchSnapshotsAsync(tournament.Id, CancellationToken.None);

        Assert.Equal(1, created);
        var snapshot = await dbContext.MatchPredictionSnapshots.SingleAsync();
        Assert.Equal(finishedMatch.Id, snapshot.MatchId);
        Assert.Equal(home.Id, snapshot.HomeTeamId);
        Assert.Equal(away.Id, snapshot.AwayTeamId);
        Assert.True(snapshot.ApplyHomeAdvantage);
        Assert.Equal(50, snapshot.HomeAdvantage);
        Assert.Equal("HomeWin", snapshot.FavoriteOutcome);
        Assert.Equal(1m, snapshot.HomeWinProbability + snapshot.DrawProbability + snapshot.AwayWinProbability);
        Assert.True(snapshot.HomeFairOdds > 1);
        Assert.True(snapshot.DrawFairOdds > 1);
        Assert.True(snapshot.AwayFairOdds > 1);
    }

    [Fact]
    public async Task CaptureMissingFinishedMatchSnapshotsAsync_SkipsMatchWhenRatingIsMissing()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("prediction-missing-rating");
        var tournament = ServiceTestData.Tournament();
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 1);

        dbContext.AddRange(tournament, home, away, finishedMatch);
        await dbContext.SaveChangesAsync();

        var service = new MatchPredictionSnapshotService(
            dbContext,
            new FakeCombinedRatingService(Ratings(tournament.Id, Rating(home, 1600, 1620))));

        var created = await service.CaptureMissingFinishedMatchSnapshotsAsync(tournament.Id, CancellationToken.None);

        Assert.Equal(0, created);
        Assert.Empty(dbContext.MatchPredictionSnapshots);
    }

    [Fact]
    public async Task CaptureMissingFinishedMatchSnapshotsAsync_DoesNotDuplicateExistingSnapshot()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("prediction-no-duplicate");
        var tournament = ServiceTestData.Tournament();
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 1);
        var existingSnapshot = new MatchPredictionSnapshot
        {
            Match = finishedMatch,
            Tournament = tournament,
            CapturedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10),
            Source = "test",
            RatingCalculatedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10),
            HomeTeam = home,
            AwayTeam = away,
            HomeTeamName = home.Name,
            AwayTeamName = away.Name,
            HomeBaseElo = 1500,
            AwayBaseElo = 1500,
            HomeFinalRating = 1500,
            AwayFinalRating = 1500,
            HomeWinProbability = 0.4m,
            DrawProbability = 0.3m,
            AwayWinProbability = 0.3m,
            HomeFairOdds = 2.5m,
            DrawFairOdds = 3.33m,
            AwayFairOdds = 3.33m,
            FavoriteOutcome = "HomeWin",
            FavoriteProbability = 0.4m
        };

        dbContext.AddRange(tournament, home, away, finishedMatch, existingSnapshot);
        await dbContext.SaveChangesAsync();

        var service = new MatchPredictionSnapshotService(
            dbContext,
            new FakeCombinedRatingService(Ratings(tournament.Id, Rating(home, 1600, 1620), Rating(away, 1550, 1540))));

        var created = await service.CaptureMissingFinishedMatchSnapshotsAsync(tournament.Id, CancellationToken.None);

        Assert.Equal(0, created);
        Assert.Equal(1, await dbContext.MatchPredictionSnapshots.CountAsync());
    }

    [Fact]
    public async Task CaptureMissingFinishedMatchSnapshotsAsync_CanFavorDrawForNeutralEqualRatings()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("prediction-neutral-draw");
        var tournament = ServiceTestData.Tournament(applyHomeAdvantage: false);
        var home = ServiceTestData.Team("Team A", "TMA");
        var away = ServiceTestData.Team("Team B", "TMB");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 1, 1);

        dbContext.AddRange(tournament, home, away, finishedMatch);
        await dbContext.SaveChangesAsync();

        var service = new MatchPredictionSnapshotService(
            dbContext,
            new FakeCombinedRatingService(Ratings(tournament.Id, Rating(home, 1500, 1500), Rating(away, 1500, 1500))));

        var created = await service.CaptureMissingFinishedMatchSnapshotsAsync(tournament.Id, CancellationToken.None);

        Assert.Equal(1, created);
        var snapshot = await dbContext.MatchPredictionSnapshots.SingleAsync();
        Assert.False(snapshot.ApplyHomeAdvantage);
        Assert.Equal(0, snapshot.HomeAdvantage);
        Assert.Equal("Draw", snapshot.FavoriteOutcome);
        Assert.True(snapshot.DrawProbability > snapshot.HomeWinProbability);
        Assert.True(snapshot.DrawProbability > snapshot.AwayWinProbability);
    }

    [Fact]
    public async Task CaptureMissingFinishedMatchSnapshotsAsync_AppliesTournamentHomeAdvantageToBalancedRatings()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("prediction-home-advantage");
        var tournament = ServiceTestData.Tournament(applyHomeAdvantage: true);
        var home = ServiceTestData.Team("Home Team", "HOM");
        var away = ServiceTestData.Team("Away Team", "AWY");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 1);

        dbContext.AddRange(tournament, home, away, finishedMatch);
        await dbContext.SaveChangesAsync();

        var service = new MatchPredictionSnapshotService(
            dbContext,
            new FakeCombinedRatingService(Ratings(tournament.Id, Rating(home, 1500, 1500), Rating(away, 1500, 1500))));

        var created = await service.CaptureMissingFinishedMatchSnapshotsAsync(tournament.Id, CancellationToken.None);

        Assert.Equal(1, created);
        var snapshot = await dbContext.MatchPredictionSnapshots.SingleAsync();
        Assert.True(snapshot.ApplyHomeAdvantage);
        Assert.Equal(50, snapshot.HomeAdvantage);
        Assert.Equal("HomeWin", snapshot.FavoriteOutcome);
        Assert.True(snapshot.HomeWinProbability > snapshot.AwayWinProbability);
    }

    private static CombinedTeamRatingsDto Ratings(int tournamentId, params TeamCombinedRatingDto[] teams)
    {
        return new CombinedTeamRatingsDto(
            tournamentId,
            new CombinedRatingRunContextDto(1, 2, 3, 0, "2", "1", DateTimeOffset.UtcNow),
            teams);
    }

    private static TeamCombinedRatingDto Rating(Team team, decimal baseElo, decimal finalRating)
    {
        return new TeamCombinedRatingDto(
            team.Id,
            team.Name,
            team.Abbreviation,
            baseElo,
            5,
            5,
            finalRating - baseElo - 10,
            finalRating - baseElo,
            finalRating,
            null,
            null,
            0.9m,
            true,
            true,
            true,
            10,
            5,
            5,
            25,
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow.AddDays(-1));
    }

    private sealed class FakeCombinedRatingService(CombinedTeamRatingsDto ratings) : ICombinedRatingService
    {
        public Task<CombinedTeamRatingsDto> GetTournamentTeamRatingsAsync(
            int tournamentId,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(ratings);
        }
    }
}
