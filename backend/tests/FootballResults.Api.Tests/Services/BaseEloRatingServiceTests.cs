using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class BaseEloRatingServiceTests
{
    [Fact]
    public async Task RebuildAsync_UsesTournamentCompetitionHistory_NotPremierLeagueOnly()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"base-elo-{Guid.NewGuid()}")
            .Options;

        await using var dbContext = new AppDbContext(options);
        var tournament = new Tournament
        {
            LiveScoreCompetitionId = "92",
            Name = "Ekstraklasa 2026/2027",
            Season = "2026/2027",
            CompetitionName = "Ekstraklasa",
            CompetitionCountry = "Poland",
            BaseUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/",
            FixturesUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/fixtures/",
            ResultsUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/results/",
            ApiBaseUrl = "https://prod-cdn-public-api.livescore.com",
            Locale = "en",
            TimezoneOffset = "0",
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
        var lech = Team("4888", "Lech Poznan", "LEC");
        var widzew = Team("8246", "Widzew Lodz", "WID");
        var promoted = Team("6080", "Wisla Plock", "WIS");

        dbContext.Tournaments.Add(tournament);
        dbContext.Teams.AddRange(lech, widzew, promoted);
        dbContext.TournamentTeams.AddRange(
            new TournamentTeam { Tournament = tournament, Team = lech },
            new TournamentTeam { Tournament = tournament, Team = widzew },
            new TournamentTeam { Tournament = tournament, Team = promoted });
        await dbContext.SaveChangesAsync();

        var service = new BaseEloRatingService(dbContext, new FakeLiveScoreClient());

        var result = await service.RebuildAsync(
            tournament.Id,
            new RebuildBaseEloRequest(
                BaseRating: 1500,
                PromotedBaselineRating: 1400,
                KFactor: 20,
                HomeAdvantage: 0,
                BootstrapSeasonCount: 3,
                Scope: "Ekstraklasa"),
            CancellationToken.None);

        Assert.True(result.Status == EloRatingRunStatus.Succeeded, result.ErrorMessage);
        Assert.Equal(3, result.ProcessedMatches);
        Assert.Equal(3, await dbContext.HistoricalMatches.CountAsync());
        Assert.All(dbContext.HistoricalMatches, match => Assert.StartsWith("Ekstraklasa", match.CompetitionName));

        var ratings = await dbContext.TeamEloRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.EloRatingRunId == result.RunId)
            .ToDictionaryAsync(rating => rating.Team.Name);

        Assert.NotEqual(1400, ratings["Lech Poznan"].Rating);
        Assert.NotEqual(1400, ratings["Widzew Lodz"].Rating);
        Assert.Equal(1400, ratings["Wisla Plock"].Rating);
        Assert.Equal(0, ratings["Wisla Plock"].MatchesPlayed);
    }

    [Fact]
    public async Task RebuildAsync_WithCurrentSeasonOnly_ExcludesHistoricalSeasons()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"base-elo-current-{Guid.NewGuid()}")
            .Options;

        await using var dbContext = new AppDbContext(options);
        var tournament = new Tournament
        {
            LiveScoreCompetitionId = "92",
            Name = "Ekstraklasa 2026/2027",
            Season = "2026/2027",
            CompetitionName = "Ekstraklasa",
            CompetitionCountry = "Poland",
            BaseUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/",
            FixturesUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/fixtures/",
            ResultsUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/results/",
            ApiBaseUrl = "https://prod-cdn-public-api.livescore.com",
            Locale = "en",
            TimezoneOffset = "0",
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
        var lech = Team("4888", "Lech Poznan", "LEC");
        var widzew = Team("8246", "Widzew Lodz", "WID");
        var promoted = Team("6080", "Wisla Plock", "WIS");

        dbContext.Tournaments.Add(tournament);
        dbContext.Teams.AddRange(lech, widzew, promoted);
        dbContext.TournamentTeams.AddRange(
            new TournamentTeam { Tournament = tournament, Team = lech },
            new TournamentTeam { Tournament = tournament, Team = widzew },
            new TournamentTeam { Tournament = tournament, Team = promoted });
        await dbContext.SaveChangesAsync();

        var service = new BaseEloRatingService(dbContext, new FakeLiveScoreClient());

        var result = await service.RebuildAsync(
            tournament.Id,
            new RebuildBaseEloRequest(
                BaseRating: 1500,
                PromotedBaselineRating: 1400,
                KFactor: 20,
                HomeAdvantage: 0,
                BootstrapSeasonCount: 3,
                Scope: "Ekstraklasa",
                SnapshotStartSeasonOffset: 0),
            CancellationToken.None);

        Assert.True(result.Status == EloRatingRunStatus.Succeeded, result.ErrorMessage);
        Assert.Equal(1, result.ProcessedMatches);

        var run = await dbContext.EloRatingRuns.SingleAsync(run => run.Id == result.RunId);
        Assert.Equal(0, run.SnapshotStartSeasonOffset);

        var ratings = await dbContext.TeamEloRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.EloRatingRunId == result.RunId)
            .ToDictionaryAsync(rating => rating.Team.Name);

        Assert.Equal(1, ratings["Lech Poznan"].MatchesPlayed);
        Assert.Equal(1, ratings["Widzew Lodz"].MatchesPlayed);
        Assert.Equal(0, ratings["Wisla Plock"].MatchesPlayed);
        Assert.Equal(1400, ratings["Wisla Plock"].Rating);
    }

    [Fact]
    public async Task RebuildAsync_IncludesCurrentTournamentMatches_WhenHistoricalImportLags()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"base-elo-current-match-{Guid.NewGuid()}")
            .Options;

        await using var dbContext = new AppDbContext(options);
        var tournament = new Tournament
        {
            LiveScoreCompetitionId = "92",
            Name = "Ekstraklasa 2026/2027",
            Season = "2026/2027",
            CompetitionName = "Ekstraklasa",
            CompetitionCountry = "Poland",
            CompetitionUrlName = "ekstraklasa",
            BaseUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/",
            FixturesUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/fixtures/",
            ResultsUrl = "https://www.livescore.com/en/football/poland/ekstraklasa/results/",
            ApiBaseUrl = "https://prod-cdn-public-api.livescore.com",
            Locale = "en",
            TimezoneOffset = "0",
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
        var lech = Team("4888", "Lech Poznan", "LEC");
        var piast = Team("9408", "Piast Gliwice", "PIA");
        var match = new Match
        {
            Tournament = tournament,
            LiveScoreEventId = "current-only-1",
            HomeTeam = lech,
            AwayTeam = piast,
            HomeTeamNameSnapshot = lech.Name,
            AwayTeamNameSnapshot = piast.Name,
            HomeTeamAbbrSnapshot = lech.Abbreviation,
            AwayTeamAbbrSnapshot = piast.Abbreviation,
            KickoffUtc = new DateTimeOffset(2026, 8, 9, 15, 30, 0, TimeSpan.Zero),
            HomeScore = 3,
            AwayScore = 0,
            RegularTimeHomeScore = 3,
            RegularTimeAwayScore = 0,
            Status = MatchStatus.Finished,
            RawStatus = "FT",
            SyncState = MatchSyncState.Finalized,
            RoundInfo = "3",
            LastSourceEndpoint = "fixtures",
            LastSeenInListType = LiveScoreListType.Results,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        dbContext.Tournaments.Add(tournament);
        dbContext.Teams.AddRange(lech, piast);
        dbContext.TournamentTeams.AddRange(
            new TournamentTeam { Tournament = tournament, Team = lech },
            new TournamentTeam { Tournament = tournament, Team = piast });
        dbContext.Matches.Add(match);
        await dbContext.SaveChangesAsync();

        var service = new BaseEloRatingService(dbContext, new EmptyLiveScoreClient());

        var result = await service.RebuildAsync(
            tournament.Id,
            new RebuildBaseEloRequest(
                BaseRating: 1500,
                PromotedBaselineRating: 1400,
                KFactor: 20,
                HomeAdvantage: 0,
                BootstrapSeasonCount: 3,
                Scope: "Ekstraklasa",
                SnapshotStartSeasonOffset: 0),
            CancellationToken.None);

        Assert.True(result.Status == EloRatingRunStatus.Succeeded, result.ErrorMessage);
        Assert.Equal(1, result.ImportedHistoricalMatches);
        Assert.Equal(1, result.ProcessedMatches);

        var snapshot = await dbContext.MatchEloSnapshots
            .Include(item => item.HistoricalMatch)
            .SingleAsync(item => item.EloRatingRunId == result.RunId);

        Assert.Equal("current-only-1", snapshot.LiveScoreEventId);
        Assert.Equal("3", snapshot.HistoricalMatch.RoundInfo);
        Assert.Equal(3, snapshot.HistoricalMatch.RegularTimeHomeScore);
        Assert.Equal(0, snapshot.HistoricalMatch.RegularTimeAwayScore);
    }

    private static Team Team(string liveScoreTeamId, string name, string abbreviation)
    {
        return new Team
        {
            LiveScoreTeamId = liveScoreTeamId,
            Name = name,
            Abbreviation = abbreviation,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
    }

    private sealed class FakeLiveScoreClient : ILiveScoreClient
    {
        private static readonly IReadOnlyList<LiveScoreHistoricalMatchRow> Rows =
        [
            Row("ek-1", "341", "Ekstraklasa 25/26", "Poland", new DateTimeOffset(2025, 8, 1, 18, 0, 0, TimeSpan.Zero), "Lech Poznan", "Widzew Lodz", "4888", "8246", 2, 0),
            Row("ek-2", "341", "Ekstraklasa 25/26", "Poland", new DateTimeOffset(2026, 3, 1, 18, 0, 0, TimeSpan.Zero), "Widzew Lodz", "Lech Poznan", "8246", "4888", 1, 1),
            Row("ek-3", "92", "Ekstraklasa", "Poland", new DateTimeOffset(2026, 7, 24, 18, 0, 0, TimeSpan.Zero), "Lech Poznan", "Widzew Lodz", "4888", "8246", 0, 1),
            Row("pl-1", "65", "Premier League", "England", new DateTimeOffset(2026, 7, 24, 18, 0, 0, TimeSpan.Zero), "Arsenal", "Chelsea", "2773", "8455", 3, 0)
        ];

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
            return Task.FromResult(Rows);
        }

        private static LiveScoreHistoricalMatchRow Row(
            string eventId,
            string competitionId,
            string competitionName,
            string competitionCountry,
            DateTimeOffset kickoff,
            string homeTeam,
            string awayTeam,
            string homeTeamId,
            string awayTeamId,
            int homeScore,
            int awayScore)
        {
            return new LiveScoreHistoricalMatchRow(
                eventId,
                competitionId,
                competitionName,
                competitionCountry,
                competitionName,
                competitionName,
                string.Empty,
                kickoff,
                homeTeam,
                awayTeam,
                homeTeam[..Math.Min(3, homeTeam.Length)].ToUpperInvariant(),
                awayTeam[..Math.Min(3, awayTeam.Length)].ToUpperInvariant(),
                homeTeamId,
                awayTeamId,
                homeScore,
                awayScore,
                homeScore,
                awayScore,
                MatchStatus.Finished,
                "FT",
                string.Empty,
                "test");
        }
    }

    private sealed class EmptyLiveScoreClient : ILiveScoreClient
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
