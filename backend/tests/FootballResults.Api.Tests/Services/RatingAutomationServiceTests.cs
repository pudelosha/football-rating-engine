using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using Microsoft.Extensions.Logging.Abstractions;

namespace FootballResults.Api.Tests.Services;

public sealed class RatingAutomationServiceTests
{
    [Fact]
    public async Task RebuildTournamentRatingsIfStaleAsync_ReturnsFalseWhenNoFinishedMatchesExist()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("rating-automation-no-finished");
        var tournament = ServiceTestData.Tournament();
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var upcomingMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Upcoming, DateTimeOffset.UtcNow.AddDays(2));
        dbContext.AddRange(tournament, home, away, upcomingMatch);
        await dbContext.SaveChangesAsync();

        var baseService = new FakeBaseEloRatingService();
        var formService = new FakeFormRatingService();
        var performanceService = new FakePerformanceRatingService();
        var service = new RatingAutomationService(
            dbContext,
            baseService,
            formService,
            performanceService,
            NullLogger<RatingAutomationService>.Instance);

        var rebuilt = await service.RebuildTournamentRatingsIfStaleAsync(tournament.Id, CancellationToken.None);

        Assert.False(rebuilt);
        Assert.Equal(0, baseService.RebuildCalls);
        Assert.Equal(0, formService.RebuildCalls);
        Assert.Equal(0, performanceService.RebuildCalls);
    }

    [Fact]
    public async Task RebuildTournamentRatingsIfStaleAsync_RebuildsEnabledLayersWithConfiguredOptions()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("rating-automation-stale");
        var tournament = ServiceTestData.Tournament(applyHomeAdvantage: false);
        tournament.RatingSnapshotStartSeasonOffset = -4;
        tournament.RatingIncludeForm = true;
        tournament.RatingIncludePerformance = true;
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 1);
        dbContext.AddRange(
            tournament,
            home,
            away,
            finishedMatch,
            new RatingConfiguration
            {
                BaseRating = 1510,
                PromotedBaselineRating = 1420,
                KFactor = 24,
                HomeAdvantage = 65,
                BootstrapSeasonCount = 4,
                FormMatchCount = 8,
                FormScale = 110,
                FormMaxAdjustment = 40,
                PerformanceMatchCount = 7,
                PerformanceScale = 50,
                PerformanceMaxAdjustment = 42,
                CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-2),
                UpdatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1)
            });
        await dbContext.SaveChangesAsync();

        var baseService = new FakeBaseEloRatingService();
        var formService = new FakeFormRatingService();
        var performanceService = new FakePerformanceRatingService();
        var service = new RatingAutomationService(
            dbContext,
            baseService,
            formService,
            performanceService,
            NullLogger<RatingAutomationService>.Instance);

        var rebuilt = await service.RebuildTournamentRatingsIfStaleAsync(tournament.Id, CancellationToken.None);

        Assert.True(rebuilt);
        Assert.Equal(1, baseService.RebuildCalls);
        Assert.Equal(1510, baseService.LastRequest!.BaseRating);
        Assert.Equal(1420, baseService.LastRequest.PromotedBaselineRating);
        Assert.Equal(24, baseService.LastRequest.KFactor);
        Assert.Equal(0, baseService.LastRequest.HomeAdvantage);
        Assert.Equal(4, baseService.LastRequest.BootstrapSeasonCount);
        Assert.Equal(-4, baseService.LastRequest.SnapshotStartSeasonOffset);
        Assert.Equal(1, formService.RebuildCalls);
        Assert.Equal(8, formService.LastRequest!.MatchCount);
        Assert.Equal(110, formService.LastRequest.Scale);
        Assert.Equal(40, formService.LastRequest.MaxAdjustment);
        Assert.Equal(1, performanceService.RebuildCalls);
        Assert.Equal(7, performanceService.LastRequest!.MatchCount);
        Assert.Equal(50, performanceService.LastRequest.Scale);
        Assert.Equal(42, performanceService.LastRequest.MaxAdjustment);
    }

    [Fact]
    public async Task RebuildTournamentRatingsIfStaleAsync_SkipsWhenAnyRatingRunIsRunning()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("rating-automation-running");
        var tournament = ServiceTestData.Tournament();
        var home = ServiceTestData.Team("Arsenal", "ARS");
        var away = ServiceTestData.Team("Chelsea", "CHE");
        var finishedMatch = ServiceTestData.Match(tournament, home, away, MatchStatus.Finished, DateTimeOffset.UtcNow.AddHours(-2), 2, 1);
        dbContext.AddRange(
            tournament,
            home,
            away,
            finishedMatch,
            new EloRatingRun
            {
                Tournament = tournament,
                Name = "Base Elo",
                Scope = "Tournament",
                Status = EloRatingRunStatus.Running,
                StartedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-5)
            });
        await dbContext.SaveChangesAsync();

        var baseService = new FakeBaseEloRatingService();
        var service = new RatingAutomationService(
            dbContext,
            baseService,
            new FakeFormRatingService(),
            new FakePerformanceRatingService(),
            NullLogger<RatingAutomationService>.Instance);

        var rebuilt = await service.RebuildTournamentRatingsIfStaleAsync(tournament.Id, CancellationToken.None);

        Assert.False(rebuilt);
        Assert.Equal(0, baseService.RebuildCalls);
    }

    private sealed class FakeBaseEloRatingService : IBaseEloRatingService
    {
        public int RebuildCalls { get; private set; }
        public RebuildBaseEloRequest? LastRequest { get; private set; }

        public Task<RebuildBaseEloResponse> RebuildAsync(
            int tournamentId,
            RebuildBaseEloRequest request,
            CancellationToken cancellationToken)
        {
            RebuildCalls++;
            LastRequest = request;
            return Task.FromResult(new RebuildBaseEloResponse(101, tournamentId, EloRatingRunStatus.Succeeded, 0, 1, string.Empty));
        }

        public Task<EloRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken)
        {
            return Task.FromResult<EloRatingRunDto?>(null);
        }

        public Task<IReadOnlyList<TeamEloRatingDto>> GetLatestTeamRatingsAsync(int tournamentId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TeamEloRatingDto>>([]);
        }

        public Task<IReadOnlyList<MatchEloSnapshotDto>> GetRunSnapshotsAsync(int runId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<MatchEloSnapshotDto>>([]);
        }
    }

    private sealed class FakeFormRatingService : IFormRatingService
    {
        public int RebuildCalls { get; private set; }
        public RebuildFormRatingRequest? LastRequest { get; private set; }

        public Task<RebuildFormRatingResponse> RebuildAsync(
            int tournamentId,
            RebuildFormRatingRequest request,
            CancellationToken cancellationToken)
        {
            RebuildCalls++;
            LastRequest = request;
            return Task.FromResult(new RebuildFormRatingResponse(201, tournamentId, 101, EloRatingRunStatus.Succeeded, 2, string.Empty));
        }

        public Task<FormRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken)
        {
            return Task.FromResult<FormRatingRunDto?>(null);
        }

        public Task<IReadOnlyList<TeamFormRatingDto>> GetLatestTeamRatingsAsync(int tournamentId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TeamFormRatingDto>>([]);
        }

        public Task<IReadOnlyList<TeamFormMatchSnapshotDto>> GetRunSnapshotsAsync(int runId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TeamFormMatchSnapshotDto>>([]);
        }
    }

    private sealed class FakePerformanceRatingService : IPerformanceRatingService
    {
        public int RebuildCalls { get; private set; }
        public RebuildPerformanceRatingRequest? LastRequest { get; private set; }

        public Task<RebuildPerformanceRatingResponse> RebuildAsync(
            int tournamentId,
            RebuildPerformanceRatingRequest request,
            CancellationToken cancellationToken)
        {
            RebuildCalls++;
            LastRequest = request;
            return Task.FromResult(new RebuildPerformanceRatingResponse(301, tournamentId, 101, EloRatingRunStatus.Succeeded, 2, string.Empty));
        }

        public Task<PerformanceRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken)
        {
            return Task.FromResult<PerformanceRatingRunDto?>(null);
        }

        public Task<IReadOnlyList<TeamPerformanceRatingDto>> GetLatestTeamRatingsAsync(int tournamentId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TeamPerformanceRatingDto>>([]);
        }

        public Task<IReadOnlyList<TeamPerformanceMatchSnapshotDto>> GetRunSnapshotsAsync(int runId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<TeamPerformanceMatchSnapshotDto>>([]);
        }
    }
}
