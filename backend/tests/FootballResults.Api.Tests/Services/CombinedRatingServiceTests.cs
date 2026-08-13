using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using FootballResults.Api.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class CombinedRatingServiceTests
{
    [Fact]
    public async Task GetTournamentTeamRatingsAsync_AddsEnabledLayersAndSortsByFinalRating()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("combined-layers");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var chelsea = ServiceTestData.Team("Chelsea", "CHE");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var formRun = FormRun(tournament, eloRun);
        var performanceRun = PerformanceRun(tournament, eloRun);
        var formSnapshots = FormSnapshots(formRun, arsenal, chelsea, 0.60m, 0.50m)
            .Concat(FormSnapshots(formRun, chelsea, arsenal, 0.45m, 0.50m))
            .ToArray();
        var performanceSnapshots = PerformanceSnapshots(performanceRun, arsenal, chelsea, 0.044444m)
            .Concat(PerformanceSnapshots(performanceRun, chelsea, arsenal, -0.066667m))
            .ToArray();

        dbContext.AddRange(
            tournament,
            arsenal,
            chelsea,
            new TournamentTeam { Tournament = tournament, Team = arsenal },
            new TournamentTeam { Tournament = tournament, Team = chelsea },
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1500),
            ServiceTestData.TeamElo(eloRun, chelsea, 1510),
            formRun,
            FormRating(formRun, arsenal, 10),
            FormRating(formRun, chelsea, -5),
            performanceRun,
            PerformanceRating(performanceRun, arsenal, 2),
            PerformanceRating(performanceRun, chelsea, -3));
        dbContext.AddRange(formSnapshots);
        dbContext.AddRange(performanceSnapshots);
        await dbContext.SaveChangesAsync();

        var squadService = new FakeSquadQualityService([
            SquadRating(arsenal.Id, arsenal.Name, arsenal.Abbreviation, 20),
            SquadRating(chelsea.Id, chelsea.Name, chelsea.Abbreviation, -4)
        ]);
        var service = new CombinedRatingService(dbContext, squadService);

        var result = await service.GetTournamentTeamRatingsAsync(tournament.Id, null, null, CancellationToken.None);

        Assert.Equal(eloRun.Id, result.RunContext.BaseEloRunId);
        Assert.Equal(formRun.Id, result.RunContext.FormRatingRunId);
        Assert.Equal(performanceRun.Id, result.RunContext.PerformanceRatingRunId);
        Assert.Collection(
            result.Teams,
            first =>
            {
                Assert.Equal("Arsenal", first.TeamName);
                Assert.Equal(1532, first.FinalRating);
                Assert.Equal(32, first.TotalAdjustment);
                Assert.Equal(1.0000m, first.RatingConfidence);
            },
            second =>
            {
                Assert.Equal("Chelsea", second.TeamName);
                Assert.Equal(1498, second.FinalRating);
                Assert.Equal(-12, second.TotalAdjustment);
            });
    }

    [Fact]
    public async Task GetTournamentTeamRatingsAsync_RespectsDisabledTournamentLayers()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("combined-disabled");
        var tournament = ServiceTestData.Tournament();
        tournament.RatingIncludeForm = false;
        tournament.RatingIncludePerformance = false;
        tournament.RatingIncludeSquad = false;

        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var formRun = FormRun(tournament, eloRun);
        var performanceRun = PerformanceRun(tournament, eloRun);

        dbContext.AddRange(
            tournament,
            arsenal,
            new TournamentTeam { Tournament = tournament, Team = arsenal },
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1500),
            formRun,
            FormRating(formRun, arsenal, 35),
            performanceRun,
            PerformanceRating(performanceRun, arsenal, 20));
        await dbContext.SaveChangesAsync();

        var service = new CombinedRatingService(
            dbContext,
            new FakeSquadQualityService([SquadRating(arsenal.Id, arsenal.Name, arsenal.Abbreviation, 30)]));

        var result = await service.GetTournamentTeamRatingsAsync(tournament.Id, null, null, CancellationToken.None);
        var rating = Assert.Single(result.Teams);

        Assert.Equal(1500, rating.FinalRating);
        Assert.Equal(0, rating.FormAdjustment);
        Assert.Equal(0, rating.PerformanceAdjustment);
        Assert.Equal(0, rating.SquadQualityAdjustment);
        Assert.False(rating.HasFormRating);
        Assert.False(rating.HasPerformanceRating);
        Assert.False(rating.HasSquadQualityRating);
    }

    [Fact]
    public async Task GetTournamentTeamRatingsAsync_ReportsFinalRatingChangeFromFirstEloRoundByDefault()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("combined-round-change");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var chelsea = ServiceTestData.Team("Chelsea", "CHE");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var formRun = FormRun(tournament, eloRun);
        var performanceRun = PerformanceRun(tournament, eloRun);
        var olderMatch = ServiceTestData.Match(tournament, chelsea, arsenal, MatchStatus.Finished, DateTimeOffset.UtcNow.AddDays(-7), 1, 1);
        olderMatch.RoundInfo = "1";
        var latestMatch = ServiceTestData.Match(tournament, arsenal, chelsea, MatchStatus.Finished, DateTimeOffset.UtcNow.AddDays(-1), 2, 0);
        latestMatch.RoundInfo = "2";
        var olderHistorical = ServiceTestData.HistoricalMatch(chelsea, arsenal, olderMatch.KickoffUtc!.Value, 1, 1, "1");
        var historical = ServiceTestData.HistoricalMatch(arsenal, chelsea, latestMatch.KickoffUtc!.Value, 2, 0, "2");
        var olderSnapshot = ServiceTestData.MatchEloSnapshot(eloRun, olderHistorical, chelsea, arsenal, 0.5m, 0.5m, 0.5m, 0.5m);
        olderSnapshot.LiveScoreEventId = olderMatch.LiveScoreEventId;
        olderSnapshot.HomeEloAfter = 1488.89m;
        olderSnapshot.AwayEloAfter = 1511.11m;
        olderSnapshot.HomeEloChange = 0;
        olderSnapshot.AwayEloChange = 0;
        var snapshot = ServiceTestData.MatchEloSnapshot(eloRun, historical, arsenal, chelsea, 1, 0, 0.6m, 0.4m);
        snapshot.LiveScoreEventId = latestMatch.LiveScoreEventId;
        snapshot.HomeEloAfter = 1520m;
        snapshot.AwayEloAfter = 1480m;
        snapshot.HomeEloChange = 8.89m;
        snapshot.AwayEloChange = -8.89m;

        dbContext.AddRange(
            tournament,
            arsenal,
            chelsea,
            new TournamentTeam { Tournament = tournament, Team = arsenal },
            new TournamentTeam { Tournament = tournament, Team = chelsea },
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1520),
            ServiceTestData.TeamElo(eloRun, chelsea, 1480),
            formRun,
            performanceRun,
            olderMatch,
            latestMatch,
            olderHistorical,
            historical,
            olderSnapshot,
            snapshot);
        dbContext.AddRange(
            new TeamFormMatchSnapshot
            {
                FormRatingRun = formRun,
                Team = arsenal,
                OpponentTeam = chelsea,
                LiveScoreEventId = olderMatch.LiveScoreEventId,
                KickoffUtc = olderMatch.KickoffUtc!.Value,
                Actual = 0.5m,
                Expected = 0.5m,
                Delta = 0,
                Weight = 1,
                WeightedDelta = 0
            },
            new TeamFormMatchSnapshot
            {
                FormRatingRun = formRun,
                Team = arsenal,
                OpponentTeam = chelsea,
                LiveScoreEventId = latestMatch.LiveScoreEventId,
                KickoffUtc = latestMatch.KickoffUtc!.Value,
                Actual = 1,
                Expected = 0.6m,
                Delta = 0.4m,
                Weight = 1,
                WeightedDelta = 0.4m
            },
            new TeamPerformanceMatchSnapshot
            {
                PerformanceRatingRun = performanceRun,
                Team = arsenal,
                OpponentTeam = chelsea,
                LiveScoreEventId = olderMatch.LiveScoreEventId,
                KickoffUtc = olderMatch.KickoffUtc!.Value,
                DataCoverage = 1,
                RawPerformanceScore = 0,
                Weight = 1,
                WeightedPerformanceScore = 0
            },
            new TeamPerformanceMatchSnapshot
            {
                PerformanceRatingRun = performanceRun,
                Team = arsenal,
                OpponentTeam = chelsea,
                LiveScoreEventId = latestMatch.LiveScoreEventId,
                KickoffUtc = latestMatch.KickoffUtc!.Value,
                DataCoverage = 1,
                RawPerformanceScore = 0.2m,
                Weight = 1,
                WeightedPerformanceScore = 0.2m
            });
        await dbContext.SaveChangesAsync();

        var service = new CombinedRatingService(dbContext, new FakeSquadQualityService([]));
        var result = await service.GetTournamentTeamRatingsAsync(tournament.Id, null, null, CancellationToken.None);

        Assert.Equal("2", result.RunContext.CurrentRoundInfo);
        Assert.Equal("2", result.RunContext.SelectedCurrentRoundInfo);
        Assert.Equal("1", result.RunContext.PreviousRoundInfo);
        Assert.Equal("1", result.RunContext.CompareRoundInfo);
        Assert.Equal(["1", "2"], result.RunContext.AvailableRoundInfos);
        var arsenalRating = result.Teams.Single(team => team.TeamName == "Arsenal");

        Assert.Equal(22.89m, arsenalRating.FinalRatingChange);
        Assert.Equal(1534.00m, arsenalRating.FinalRating);
        Assert.Equal(1511.11m, arsenalRating.PreviousFinalRating);
        Assert.Equal(-8.89m, result.Teams.Single(team => team.TeamName == "Chelsea").FinalRatingChange);
    }

    [Fact]
    public async Task GetTournamentTeamRatingsAsync_ListsFinishedMatchRoundsAndMarksUncoveredRatingRound()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("combined-elo-rounds-only");
        var tournament = ServiceTestData.Tournament();
        var arsenal = ServiceTestData.Team("Arsenal", "ARS");
        var chelsea = ServiceTestData.Team("Chelsea", "CHE");
        var eloRun = ServiceTestData.SucceededEloRun(tournament);
        var roundOneMatch = ServiceTestData.Match(tournament, arsenal, chelsea, MatchStatus.Finished, DateTimeOffset.UtcNow.AddDays(-7), 1, 0);
        roundOneMatch.RoundInfo = "1";
        var roundTwoMatch = ServiceTestData.Match(tournament, chelsea, arsenal, MatchStatus.Finished, DateTimeOffset.UtcNow.AddDays(-3), 0, 0);
        roundTwoMatch.RoundInfo = "2";
        var roundThreeMatch = ServiceTestData.Match(tournament, arsenal, chelsea, MatchStatus.Finished, DateTimeOffset.UtcNow.AddDays(-1), 2, 0);
        roundThreeMatch.RoundInfo = "3";
        var historical = ServiceTestData.HistoricalMatch(arsenal, chelsea, roundOneMatch.KickoffUtc!.Value, 1, 0, "1");
        var snapshot = ServiceTestData.MatchEloSnapshot(eloRun, historical, arsenal, chelsea, 1, 0, 0.5m, 0.5m);

        dbContext.AddRange(
            tournament,
            arsenal,
            chelsea,
            new TournamentTeam { Tournament = tournament, Team = arsenal },
            new TournamentTeam { Tournament = tournament, Team = chelsea },
            eloRun,
            ServiceTestData.TeamElo(eloRun, arsenal, 1510),
            ServiceTestData.TeamElo(eloRun, chelsea, 1490),
            roundOneMatch,
            roundTwoMatch,
            roundThreeMatch,
            historical,
            snapshot);
        await dbContext.SaveChangesAsync();

        var service = new CombinedRatingService(dbContext, new FakeSquadQualityService([]));
        var result = await service.GetTournamentTeamRatingsAsync(tournament.Id, "3", "2", CancellationToken.None);

        Assert.Equal(["1", "2", "3"], result.RunContext.AvailableRoundInfos);
        Assert.Equal("3", result.RunContext.SelectedCurrentRoundInfo);
        Assert.Equal("2", result.RunContext.CompareRoundInfo);
        Assert.False(result.RunContext.IsSelectedCurrentRoundCoveredByRatings);
        Assert.False(result.RunContext.IsCompareRoundCoveredByRatings);
        Assert.All(result.Teams, team => Assert.Null(team.FinalRatingChange));
    }

    private static FormRatingRun FormRun(Tournament tournament, EloRatingRun eloRun)
    {
        var now = DateTimeOffset.UtcNow;
        return new FormRatingRun
        {
            Tournament = tournament,
            EloRatingRun = eloRun,
            MatchCount = 5,
            Scale = 100,
            MaxAdjustment = 35,
            Status = EloRatingRunStatus.Succeeded,
            StartedAtUtc = now,
            FinishedAtUtc = now.AddSeconds(1),
            ProcessedTeams = 2
        };
    }

    private static TeamFormRating FormRating(FormRatingRun run, Team team, decimal adjustment)
    {
        return new TeamFormRating
        {
            FormRatingRun = run,
            Team = team,
            MatchCount = 5,
            WeightedActual = 3,
            WeightedExpected = 2,
            WeightedDelta = 1,
            AverageDelta = 0.2m,
            FormAdjustment = adjustment,
            LastMatchUtc = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
    }

    private static TeamFormMatchSnapshot[] FormSnapshots(
        FormRatingRun run,
        Team team,
        Team opponent,
        decimal actual,
        decimal expected)
    {
        return Enumerable.Range(0, 5)
            .Select(index => new TeamFormMatchSnapshot
            {
                FormRatingRun = run,
                Team = team,
                OpponentTeam = opponent,
                LiveScoreEventId = $"{team.Abbreviation}-form-{index}",
                KickoffUtc = DateTimeOffset.UtcNow.AddDays(-index - 1),
                IsHome = true,
                Actual = actual,
                Expected = expected,
                Delta = actual - expected,
                Weight = 1,
                WeightedDelta = actual - expected
            })
            .ToArray();
    }

    private static PerformanceRatingRun PerformanceRun(Tournament tournament, EloRatingRun eloRun)
    {
        var now = DateTimeOffset.UtcNow;
        return new PerformanceRatingRun
        {
            Tournament = tournament,
            EloRatingRun = eloRun,
            MatchCount = 5,
            Scale = 45,
            MaxAdjustment = 45,
            Status = EloRatingRunStatus.Succeeded,
            StartedAtUtc = now,
            FinishedAtUtc = now.AddSeconds(1),
            ProcessedTeams = 2
        };
    }

    private static TeamPerformanceRating PerformanceRating(PerformanceRatingRun run, Team team, decimal adjustment)
    {
        return new TeamPerformanceRating
        {
            PerformanceRatingRun = run,
            Team = team,
            MatchCount = 5,
            DataCoverage = 1,
            RawPerformanceScore = 0.1m,
            PerformanceAdjustment = adjustment,
            LastMatchUtc = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
    }

    private static TeamPerformanceMatchSnapshot[] PerformanceSnapshots(
        PerformanceRatingRun run,
        Team team,
        Team opponent,
        decimal rawPerformanceScore)
    {
        return Enumerable.Range(0, 5)
            .Select(index => new TeamPerformanceMatchSnapshot
            {
                PerformanceRatingRun = run,
                Team = team,
                OpponentTeam = opponent,
                LiveScoreEventId = $"{team.Abbreviation}-performance-{index}",
                KickoffUtc = DateTimeOffset.UtcNow.AddDays(-index - 1),
                IsHome = true,
                DataCoverage = 1,
                RawPerformanceScore = rawPerformanceScore,
                WeightedPerformanceScore = rawPerformanceScore,
                Weight = 1
            })
            .ToArray();
    }

    private static TeamSquadQualityRatingDto SquadRating(
        int teamId,
        string teamName,
        string abbreviation,
        decimal adjustment)
    {
        return new TeamSquadQualityRatingDto(
            teamId,
            teamName,
            abbreviation,
            10,
            DateTimeOffset.UtcNow,
            100_000_000,
            80_000_000,
            90_000_000,
            5_000_000,
            20_000_000,
            26,
            19,
            35,
            26,
            3,
            5,
            25,
            0.5m,
            0.5m,
            0.5m,
            0.5m,
            0.5m,
            0.5m,
            0.5m,
            0.5m,
            adjustment);
    }

    private sealed class FakeSquadQualityService(IReadOnlyList<TeamSquadQualityRatingDto> ratings) : ISquadQualityService
    {
        public Task<ImportTransfermarktSquadResponse> ImportTransfermarktSquadAsync(
            int teamId,
            ImportTransfermarktSquadRequest request,
            CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task<IReadOnlyList<ExternalTeamMappingDto>> GetTeamMappingsAsync(
            int teamId,
            CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task<SquadQualitySnapshotDto?> GetLatestSnapshotAsync(
            int teamId,
            CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task<IReadOnlyList<SquadPlayerSnapshotDto>> GetSnapshotPlayersAsync(
            int snapshotId,
            CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task<IReadOnlyList<TournamentSquadCoverageDto>> GetTournamentCoverageAsync(CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task<IReadOnlyList<TeamSquadQualityRatingDto>> GetTournamentTeamRatingsAsync(
            int tournamentId,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(ratings);
        }
    }
}
