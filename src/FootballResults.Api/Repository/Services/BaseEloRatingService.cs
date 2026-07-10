using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class BaseEloRatingService(
    AppDbContext dbContext,
    ILiveScoreClient liveScoreClient) : IBaseEloRatingService
{
    private const string PremierLeagueName = "Premier League";

    public async Task<RebuildBaseEloResponse> RebuildAsync(
        int tournamentId,
        RebuildBaseEloRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await dbContext.Tournaments
            .Include(tournament => tournament.TournamentTeams)
            .ThenInclude(tournamentTeam => tournamentTeam.Team)
            .FirstOrDefaultAsync(tournament => tournament.Id == tournamentId, cancellationToken);

        if (tournament is null)
        {
            throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");
        }

        var now = DateTimeOffset.UtcNow;
        var run = new EloRatingRun
        {
            TournamentId = tournamentId,
            Name = $"{tournament.Name} Base Elo {now:yyyy-MM-dd HH:mm:ss} UTC",
            Scope = string.IsNullOrWhiteSpace(request.Scope) ? "PremierLeague" : request.Scope,
            BaseRating = request.BaseRating,
            PromotedBaselineRating = request.PromotedBaselineRating,
            KFactor = request.KFactor,
            HomeAdvantage = request.HomeAdvantage,
            BootstrapSeasonCount = Math.Max(1, request.BootstrapSeasonCount),
            Status = EloRatingRunStatus.Running,
            StartedAtUtc = now
        };

        dbContext.EloRatingRuns.Add(run);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var imported = await ImportHistoricalMatchesAsync(tournament, cancellationToken);
            var processed = await CalculateBaseEloAsync(tournament, run, cancellationToken);

            run.ImportedHistoricalMatches = imported;
            run.ProcessedMatches = processed;
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

        return new RebuildBaseEloResponse(
            run.Id,
            run.TournamentId,
            run.Status,
            run.ImportedHistoricalMatches,
            run.ProcessedMatches,
            run.ErrorMessage);
    }

    public async Task<EloRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken)
    {
        var run = await dbContext.EloRatingRuns
            .Where(run => run.TournamentId == tournamentId)
            .OrderByDescending(run => run.StartedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return run is null ? null : ToDto(run);
    }

    public async Task<IReadOnlyList<TeamEloRatingDto>> GetLatestTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var latestRunId = await dbContext.EloRatingRuns
            .Where(run => run.TournamentId == tournamentId && run.Status == EloRatingRunStatus.Succeeded)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => (int?)run.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!latestRunId.HasValue)
        {
            return [];
        }

        return await dbContext.TeamEloRatings
            .Include(rating => rating.Team)
            .Where(rating => rating.EloRatingRunId == latestRunId.Value)
            .OrderByDescending(rating => rating.Rating)
            .Select(rating => new TeamEloRatingDto(
                rating.TeamId,
                rating.Team.Name,
                rating.Team.Abbreviation,
                rating.Rating,
                rating.MatchesPlayed,
                rating.LastMatchUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MatchEloSnapshotDto>> GetRunSnapshotsAsync(
        int runId,
        CancellationToken cancellationToken)
    {
        return await dbContext.MatchEloSnapshots
            .Include(snapshot => snapshot.HomeTeam)
            .Include(snapshot => snapshot.AwayTeam)
            .Where(snapshot => snapshot.EloRatingRunId == runId)
            .OrderBy(snapshot => snapshot.KickoffUtc)
            .ThenBy(snapshot => snapshot.LiveScoreEventId)
            .Select(snapshot => new MatchEloSnapshotDto(
                snapshot.Id,
                snapshot.EloRatingRunId,
                snapshot.LiveScoreEventId,
                snapshot.KickoffUtc,
                snapshot.HomeTeamId,
                snapshot.HomeTeam.Name,
                snapshot.AwayTeamId,
                snapshot.AwayTeam.Name,
                snapshot.HomeEloBefore,
                snapshot.AwayEloBefore,
                snapshot.HomeEloAfter,
                snapshot.AwayEloAfter,
                snapshot.HomeExpected,
                snapshot.AwayExpected,
                snapshot.HomeActual,
                snapshot.AwayActual,
                snapshot.HomeEloChange,
                snapshot.AwayEloChange,
                snapshot.GoalDifferenceMultiplier))
            .ToListAsync(cancellationToken);
    }

    private async Task<int> ImportHistoricalMatchesAsync(Tournament tournament, CancellationToken cancellationToken)
    {
        var imported = 0;
        var teams = await dbContext.Teams
            .Where(team => team.LiveScoreTeamId != null)
            .ToListAsync(cancellationToken);
        var teamsByLiveScoreId = teams.ToDictionary(
            team => team.LiveScoreTeamId!,
            StringComparer.OrdinalIgnoreCase);

        var historicalMatches = await dbContext.HistoricalMatches.ToListAsync(cancellationToken);
        var existingMatches = historicalMatches.ToDictionary(
            match => match.LiveScoreEventId,
            StringComparer.OrdinalIgnoreCase);

        foreach (var team in tournament.TournamentTeams.Select(tournamentTeam => tournamentTeam.Team))
        {
            if (string.IsNullOrWhiteSpace(team.LiveScoreTeamId))
            {
                continue;
            }

            var rows = await liveScoreClient.GetTeamDetailsRowsAsync(tournament, team, cancellationToken);
            foreach (var row in rows.Where(IsPremierLeagueRow))
            {
                if (string.IsNullOrWhiteSpace(row.EventId))
                {
                    continue;
                }

                var homeTeam = UpsertTeam(row.HomeTeamId, row.HomeTeam, row.HomeAbbr, teamsByLiveScoreId);
                var awayTeam = UpsertTeam(row.AwayTeamId, row.AwayTeam, row.AwayAbbr, teamsByLiveScoreId);

                if (!existingMatches.TryGetValue(row.EventId, out var historicalMatch))
                {
                    historicalMatch = new HistoricalMatch
                    {
                        LiveScoreEventId = row.EventId,
                        CreatedAtUtc = DateTimeOffset.UtcNow
                    };
                    dbContext.HistoricalMatches.Add(historicalMatch);
                    existingMatches[row.EventId] = historicalMatch;
                    imported++;
                }

                UpdateHistoricalMatch(historicalMatch, row, homeTeam, awayTeam);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return imported;
    }

    private async Task<int> CalculateBaseEloAsync(
        Tournament tournament,
        EloRatingRun run,
        CancellationToken cancellationToken)
    {
        var targetTeamIds = tournament.TournamentTeams
            .Select(tournamentTeam => tournamentTeam.TeamId)
            .ToHashSet();

        var matches = await dbContext.HistoricalMatches
            .Where(match =>
                match.Status == MatchStatus.Finished &&
                match.KickoffUtc.HasValue &&
                match.HomeTeamId.HasValue &&
                match.AwayTeamId.HasValue &&
                match.RegularTimeHomeScore.HasValue &&
                match.RegularTimeAwayScore.HasValue &&
                match.CompetitionName.StartsWith(PremierLeagueName))
            .OrderBy(match => match.KickoffUtc)
            .ThenBy(match => match.LiveScoreEventId)
            .ToListAsync(cancellationToken);

        matches = KeepBootstrapWindow(matches, run.BootstrapSeasonCount);
        if (matches.Count == 0)
        {
            return 0;
        }

        var promotedTargetTeamIds = GetPromotedTargetTeamIds(matches, targetTeamIds);
        var firstKickoff = matches[0].KickoffUtc!.Value;
        var ratings = new Dictionary<int, decimal>();
        var matchesPlayed = new Dictionary<int, int>();
        var lastMatchUtc = new Dictionary<int, DateTimeOffset>();
        var promotedRatingsResetForCurrentSeason = false;

        foreach (var match in matches)
        {
            if (!promotedRatingsResetForCurrentSeason && IsCurrentTournamentSeason(match, tournament))
            {
                foreach (var promotedTeamId in promotedTargetTeamIds)
                {
                    ratings[promotedTeamId] = run.PromotedBaselineRating;
                }

                promotedRatingsResetForCurrentSeason = true;
            }

            var homeTeamId = match.HomeTeamId!.Value;
            var awayTeamId = match.AwayTeamId!.Value;
            var kickoff = match.KickoffUtc!.Value;
            var homeBefore = GetOrCreateRating(homeTeamId, kickoff, firstKickoff, ratings, run);
            var awayBefore = GetOrCreateRating(awayTeamId, kickoff, firstKickoff, ratings, run);
            var homeExpected = ExpectedScore(homeBefore + run.HomeAdvantage, awayBefore);
            var awayExpected = 1 - homeExpected;
            var homeActual = ActualScore(match.RegularTimeHomeScore!.Value, match.RegularTimeAwayScore!.Value);
            var awayActual = 1 - homeActual;
            var goalMultiplier = GoalDifferenceMultiplier(
                match.RegularTimeHomeScore.Value,
                match.RegularTimeAwayScore.Value);
            var homeChange = run.KFactor * goalMultiplier * (homeActual - homeExpected);
            var awayChange = run.KFactor * goalMultiplier * (awayActual - awayExpected);
            var homeAfter = homeBefore + homeChange;
            var awayAfter = awayBefore + awayChange;

            ratings[homeTeamId] = homeAfter;
            ratings[awayTeamId] = awayAfter;
            matchesPlayed[homeTeamId] = matchesPlayed.GetValueOrDefault(homeTeamId) + 1;
            matchesPlayed[awayTeamId] = matchesPlayed.GetValueOrDefault(awayTeamId) + 1;
            lastMatchUtc[homeTeamId] = kickoff;
            lastMatchUtc[awayTeamId] = kickoff;

            dbContext.MatchEloSnapshots.Add(new MatchEloSnapshot
            {
                EloRatingRunId = run.Id,
                HistoricalMatchId = match.Id,
                LiveScoreEventId = match.LiveScoreEventId,
                KickoffUtc = kickoff,
                HomeTeamId = homeTeamId,
                AwayTeamId = awayTeamId,
                HomeEloBefore = RoundRating(homeBefore),
                AwayEloBefore = RoundRating(awayBefore),
                HomeEloAfter = RoundRating(homeAfter),
                AwayEloAfter = RoundRating(awayAfter),
                HomeExpected = RoundProbability(homeExpected),
                AwayExpected = RoundProbability(awayExpected),
                HomeActual = homeActual,
                AwayActual = awayActual,
                HomeEloChange = RoundRating(homeChange),
                AwayEloChange = RoundRating(awayChange),
                KFactor = run.KFactor,
                HomeAdvantageApplied = run.HomeAdvantage,
                GoalDifferenceMultiplier = goalMultiplier
            });
        }

        foreach (var teamId in targetTeamIds)
        {
            var rating = GetFinalTeamRating(
                teamId,
                ratings,
                promotedTargetTeamIds,
                promotedRatingsResetForCurrentSeason,
                run);
            dbContext.TeamEloRatings.Add(new TeamEloRating
            {
                EloRatingRunId = run.Id,
                TeamId = teamId,
                Rating = RoundRating(rating),
                MatchesPlayed = matchesPlayed.GetValueOrDefault(teamId),
                LastMatchUtc = lastMatchUtc.TryGetValue(teamId, out var playedAt) ? playedAt : null,
                UpdatedAtUtc = DateTimeOffset.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return matches.Count;
    }

    private static decimal GetFinalTeamRating(
        int teamId,
        Dictionary<int, decimal> ratings,
        HashSet<int> promotedTargetTeamIds,
        bool promotedRatingsResetForCurrentSeason,
        EloRatingRun run)
    {
        if (promotedTargetTeamIds.Contains(teamId) && !promotedRatingsResetForCurrentSeason)
        {
            return run.PromotedBaselineRating;
        }

        if (ratings.TryGetValue(teamId, out var rating))
        {
            return rating;
        }

        return promotedTargetTeamIds.Contains(teamId)
            ? run.PromotedBaselineRating
            : run.BaseRating;
    }

    private static HashSet<int> GetPromotedTargetTeamIds(
        IReadOnlyList<HistoricalMatch> matches,
        HashSet<int> targetTeamIds)
    {
        var latestCompletedSeason = matches
            .Select(match => match.SeasonName)
            .Where(season => SeasonSortKey(season) != int.MaxValue)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(SeasonSortKey)
            .FirstOrDefault();

        if (string.IsNullOrWhiteSpace(latestCompletedSeason))
        {
            return [];
        }

        var previousSeasonTeamIds = matches
            .Where(match => match.SeasonName.Equals(latestCompletedSeason, StringComparison.OrdinalIgnoreCase))
            .SelectMany(match => new[] { match.HomeTeamId!.Value, match.AwayTeamId!.Value })
            .ToHashSet();

        return targetTeamIds
            .Where(teamId => !previousSeasonTeamIds.Contains(teamId))
            .ToHashSet();
    }

    private static List<HistoricalMatch> KeepBootstrapWindow(
        List<HistoricalMatch> matches,
        int bootstrapSeasonCount)
    {
        var seasonNames = matches
            .Select(match => match.SeasonName)
            .Where(season => !string.IsNullOrWhiteSpace(season))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(SeasonSortKey)
            .Take(Math.Max(1, bootstrapSeasonCount + 1))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return seasonNames.Count == 0
            ? matches
            : matches.Where(match => seasonNames.Contains(match.SeasonName)).ToList();
    }

    private static int SeasonSortKey(string seasonName)
    {
        var digits = new string(seasonName.Where(char.IsDigit).ToArray());
        if (digits.Length >= 4 && int.TryParse(digits[..4], out var year))
        {
            return year;
        }

        return int.MaxValue;
    }

    private static bool IsCurrentTournamentSeason(HistoricalMatch match, Tournament tournament)
    {
        return match.LiveScoreCompetitionId.Equals(tournament.LiveScoreCompetitionId, StringComparison.OrdinalIgnoreCase) ||
            match.SeasonName.Equals(tournament.CompetitionName, StringComparison.OrdinalIgnoreCase);
    }

    private Team? UpsertTeam(
        string liveScoreTeamId,
        string name,
        string abbreviation,
        Dictionary<string, Team> teamsByLiveScoreId)
    {
        if (string.IsNullOrWhiteSpace(liveScoreTeamId))
        {
            return null;
        }

        if (!teamsByLiveScoreId.TryGetValue(liveScoreTeamId, out var team))
        {
            team = new Team
            {
                LiveScoreTeamId = liveScoreTeamId,
                Name = name,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };
            dbContext.Teams.Add(team);
            teamsByLiveScoreId[liveScoreTeamId] = team;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            team.Name = name;
        }

        if (!string.IsNullOrWhiteSpace(abbreviation))
        {
            team.Abbreviation = abbreviation;
        }

        team.UpdatedAtUtc = DateTimeOffset.UtcNow;
        return team;
    }

    private static void UpdateHistoricalMatch(
        HistoricalMatch match,
        LiveScoreHistoricalMatchRow row,
        Team? homeTeam,
        Team? awayTeam)
    {
        match.LiveScoreCompetitionId = row.CompetitionId;
        match.CompetitionName = row.CompetitionName;
        match.CompetitionCountry = row.CompetitionCountry;
        match.SeasonName = row.SeasonName;
        match.StageName = row.StageName;
        match.StageCode = row.StageCode;
        match.KickoffUtc = row.KickoffUtc;
        match.HomeTeam = homeTeam;
        match.AwayTeam = awayTeam;
        match.HomeTeamLiveScoreId = row.HomeTeamId;
        match.AwayTeamLiveScoreId = row.AwayTeamId;
        match.HomeTeamNameSnapshot = row.HomeTeam;
        match.AwayTeamNameSnapshot = row.AwayTeam;
        match.HomeTeamAbbrSnapshot = row.HomeAbbr;
        match.AwayTeamAbbrSnapshot = row.AwayAbbr;
        match.HomeScore = row.HomeScore;
        match.AwayScore = row.AwayScore;
        match.RegularTimeHomeScore = row.RegularHomeScore;
        match.RegularTimeAwayScore = row.RegularAwayScore;
        match.Status = row.Status;
        match.RawStatus = row.StatusRaw;
        match.RoundInfo = row.RoundInfo;
        match.SourceEndpoint = row.SourceEndpoint;
        match.UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    private static bool IsPremierLeagueRow(LiveScoreHistoricalMatchRow row)
    {
        return row.CompetitionName.StartsWith(PremierLeagueName, StringComparison.OrdinalIgnoreCase) &&
            row.CompetitionCountry.Equals("England", StringComparison.OrdinalIgnoreCase);
    }

    private static decimal GetOrCreateRating(
        int teamId,
        DateTimeOffset kickoff,
        DateTimeOffset firstKickoff,
        Dictionary<int, decimal> ratings,
        EloRatingRun run)
    {
        if (ratings.TryGetValue(teamId, out var rating))
        {
            return rating;
        }

        var isLateEntry = kickoff - firstKickoff > TimeSpan.FromDays(250);
        rating = isLateEntry ? run.PromotedBaselineRating : run.BaseRating;
        ratings[teamId] = rating;
        return rating;
    }

    private static decimal ExpectedScore(decimal ratingA, decimal ratingB)
    {
        var exponent = (double)((ratingB - ratingA) / 400);
        return (decimal)(1 / (1 + Math.Pow(10, exponent)));
    }

    private static decimal ActualScore(int homeScore, int awayScore)
    {
        if (homeScore > awayScore)
        {
            return 1;
        }

        return homeScore == awayScore ? 0.5m : 0;
    }

    private static decimal GoalDifferenceMultiplier(int homeScore, int awayScore)
    {
        var goalDifference = Math.Abs(homeScore - awayScore);
        return goalDifference switch
        {
            0 or 1 => 1.00m,
            2 => 1.35m,
            3 => 1.60m,
            _ => 1.75m
        };
    }

    private static decimal RoundRating(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundProbability(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static EloRatingRunDto ToDto(EloRatingRun run)
    {
        return new EloRatingRunDto(
            run.Id,
            run.TournamentId,
            run.Name,
            run.Scope,
            run.BaseRating,
            run.PromotedBaselineRating,
            run.KFactor,
            run.HomeAdvantage,
            run.BootstrapSeasonCount,
            run.Status,
            run.StartedAtUtc,
            run.FinishedAtUtc,
            run.ImportedHistoricalMatches,
            run.ProcessedMatches,
            run.ErrorMessage);
    }
}
