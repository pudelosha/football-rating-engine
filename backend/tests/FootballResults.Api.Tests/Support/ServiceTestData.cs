using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Support;

internal static class ServiceTestData
{
    public static AppDbContext CreateDbContext(string namePrefix)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"{namePrefix}-{Guid.NewGuid():N}")
            .Options;

        return new AppDbContext(options);
    }

    public static Tournament Tournament(string name = "Premier League 2026/2027", bool applyHomeAdvantage = true)
    {
        var now = DateTimeOffset.UtcNow;
        return new Tournament
        {
            LiveScoreCompetitionId = Guid.NewGuid().ToString("N"),
            Name = name,
            Season = "2026/2027",
            CompetitionName = name.Replace(" 2026/2027", string.Empty, StringComparison.Ordinal),
            CompetitionCountry = "England",
            CompetitionUrlName = "premier-league",
            CategoryCode = "england",
            CategoryName = "England",
            CategoryTransliteratedName = "england",
            BaseUrl = "https://www.livescore.com/en/football/england/premier-league/",
            FixturesUrl = "https://www.livescore.com/en/football/england/premier-league/fixtures/",
            ResultsUrl = "https://www.livescore.com/en/football/england/premier-league/results/",
            ApiBaseUrl = "https://prod-cdn-public-api.livescore.com/v1/api/app",
            Locale = "en",
            TimezoneOffset = "0",
            ApplyHomeAdvantage = applyHomeAdvantage,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public static Team Team(string name, string abbreviation)
    {
        var now = DateTimeOffset.UtcNow;
        return new Team
        {
            LiveScoreTeamId = Guid.NewGuid().ToString("N"),
            Name = name,
            Abbreviation = abbreviation,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public static EloRatingRun SucceededEloRun(Tournament tournament, DateTimeOffset? startedAtUtc = null)
    {
        var now = startedAtUtc ?? DateTimeOffset.UtcNow;
        return new EloRatingRun
        {
            Tournament = tournament,
            Name = "Base Elo",
            Scope = "Tournament",
            BaseRating = 1500,
            PromotedBaselineRating = 1400,
            KFactor = 20,
            HomeAdvantage = 50,
            BootstrapSeasonCount = 3,
            SnapshotStartSeasonOffset = 0,
            Status = EloRatingRunStatus.Succeeded,
            StartedAtUtc = now,
            FinishedAtUtc = now.AddSeconds(1)
        };
    }

    public static TeamEloRating TeamElo(EloRatingRun run, Team team, decimal rating, int matchesPlayed = 1)
    {
        return new TeamEloRating
        {
            EloRatingRun = run,
            Team = team,
            Rating = rating,
            MatchesPlayed = matchesPlayed,
            LastMatchUtc = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
    }

    public static HistoricalMatch HistoricalMatch(
        Team home,
        Team away,
        DateTimeOffset kickoffUtc,
        int homeScore,
        int awayScore,
        string roundInfo = "1")
    {
        var now = DateTimeOffset.UtcNow;
        return new HistoricalMatch
        {
            LiveScoreEventId = Guid.NewGuid().ToString("N"),
            LiveScoreCompetitionId = "test-competition",
            CompetitionName = "Test League",
            CompetitionCountry = "Test Country",
            SeasonName = "2026/2027",
            StageName = "Regular Season",
            StageCode = "regular-season",
            KickoffUtc = kickoffUtc,
            HomeTeam = home,
            AwayTeam = away,
            HomeTeamLiveScoreId = home.LiveScoreTeamId ?? string.Empty,
            AwayTeamLiveScoreId = away.LiveScoreTeamId ?? string.Empty,
            HomeTeamNameSnapshot = home.Name,
            AwayTeamNameSnapshot = away.Name,
            HomeTeamAbbrSnapshot = home.Abbreviation,
            AwayTeamAbbrSnapshot = away.Abbreviation,
            HomeScore = homeScore,
            AwayScore = awayScore,
            RegularTimeHomeScore = homeScore,
            RegularTimeAwayScore = awayScore,
            Status = MatchStatus.Finished,
            RawStatus = "FT",
            RoundInfo = roundInfo,
            SourceEndpoint = "test",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public static MatchEloSnapshot MatchEloSnapshot(
        EloRatingRun run,
        HistoricalMatch match,
        Team home,
        Team away,
        decimal homeActual,
        decimal awayActual,
        decimal homeExpected,
        decimal awayExpected)
    {
        return new MatchEloSnapshot
        {
            EloRatingRun = run,
            HistoricalMatch = match,
            LiveScoreEventId = match.LiveScoreEventId,
            KickoffUtc = match.KickoffUtc ?? DateTimeOffset.UtcNow,
            HomeTeam = home,
            AwayTeam = away,
            HomeEloBefore = 1500,
            AwayEloBefore = 1500,
            HomeEloAfter = 1510,
            AwayEloAfter = 1490,
            HomeExpected = homeExpected,
            AwayExpected = awayExpected,
            HomeActual = homeActual,
            AwayActual = awayActual,
            HomeEloChange = 10,
            AwayEloChange = -10,
            KFactor = 20,
            HomeAdvantageApplied = 50,
            GoalDifferenceMultiplier = 1
        };
    }

    public static Match Match(
        Tournament tournament,
        Team home,
        Team away,
        MatchStatus status,
        DateTimeOffset kickoffUtc,
        int? homeScore = null,
        int? awayScore = null)
    {
        var now = DateTimeOffset.UtcNow;
        return new Match
        {
            Tournament = tournament,
            HomeTeam = home,
            AwayTeam = away,
            LiveScoreEventId = Guid.NewGuid().ToString("N"),
            HomeTeamNameSnapshot = home.Name,
            AwayTeamNameSnapshot = away.Name,
            HomeTeamAbbrSnapshot = home.Abbreviation,
            AwayTeamAbbrSnapshot = away.Abbreviation,
            KickoffUtc = kickoffUtc,
            HomeScore = homeScore,
            AwayScore = awayScore,
            RegularTimeHomeScore = homeScore,
            RegularTimeAwayScore = awayScore,
            Status = status,
            RawStatus = status == MatchStatus.Finished ? "FT" : "NS",
            SyncState = status == MatchStatus.Finished ? MatchSyncState.Finalized : MatchSyncState.Scheduled,
            RoundInfo = "1",
            MatchUrl = "https://example.test/match",
            LastSeenInListType = status == MatchStatus.Finished ? LiveScoreListType.Results : LiveScoreListType.Fixtures,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            LastSyncedAtUtc = now
        };
    }
}
