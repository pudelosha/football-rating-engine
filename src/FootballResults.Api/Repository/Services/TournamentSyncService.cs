using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Repository.Services;

public sealed class TournamentSyncService(
    AppDbContext dbContext,
    ILiveScoreClient liveScoreClient,
    IOptions<TournamentSyncOptions> options) : ITournamentSyncService
{
    public async Task<SyncTournamentResponse> SyncAsync(
        int tournamentId,
        TournamentSyncMode mode,
        CancellationToken cancellationToken)
    {
        var tournament = await dbContext.Tournaments
            .Include(tournament => tournament.Stages)
            .Include(tournament => tournament.Matches)
            .ThenInclude(match => match.Statistics)
            .FirstOrDefaultAsync(tournament => tournament.Id == tournamentId, cancellationToken);

        if (tournament is null)
        {
            throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");
        }

        var syncRun = new TournamentSyncRun
        {
            TournamentId = tournamentId,
            Mode = mode,
            Status = TournamentSyncRunStatus.Running,
            StartedAtUtc = DateTimeOffset.UtcNow
        };

        dbContext.TournamentSyncRuns.Add(syncRun);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var rows = await FetchRowsForModeAsync(tournament, mode, cancellationToken);
            var result = await UpsertRowsAsync(tournament, rows, cancellationToken);
            if (mode is TournamentSyncMode.Finalize or TournamentSyncMode.Results)
            {
                await EnrichFinishedMatchStatisticsAsync(tournament, cancellationToken);
            }

            syncRun.InsertedMatches = result.Inserted;
            syncRun.UpdatedMatches = result.Updated;
            syncRun.UnchangedMatches = result.Unchanged;
            syncRun.Status = TournamentSyncRunStatus.Succeeded;
            syncRun.FinishedAtUtc = DateTimeOffset.UtcNow;

            tournament.LastSyncedAtUtc = syncRun.FinishedAtUtc;
            tournament.UpdatedAtUtc = syncRun.FinishedAtUtc.Value;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            syncRun.Status = TournamentSyncRunStatus.Failed;
            syncRun.FinishedAtUtc = DateTimeOffset.UtcNow;
            syncRun.ErrorMessage = ex.Message;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return new SyncTournamentResponse(
            syncRun.Id,
            syncRun.TournamentId,
            syncRun.Mode,
            syncRun.Status,
            syncRun.InsertedMatches,
            syncRun.UpdatedMatches,
            syncRun.UnchangedMatches,
            syncRun.ErrorMessage);
    }

    public async Task<IReadOnlyList<TournamentSyncRunDto>> GetTournamentSyncRunsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var syncRuns = await dbContext.TournamentSyncRuns
            .Where(syncRun => syncRun.TournamentId == tournamentId)
            .OrderByDescending(syncRun => syncRun.StartedAtUtc)
            .ToListAsync(cancellationToken);

        return syncRuns.Select(DtoMapper.ToSyncRunDto).ToList();
    }

    public async Task<TournamentSyncRunDto?> GetSyncRunAsync(int syncRunId, CancellationToken cancellationToken)
    {
        var syncRun = await dbContext.TournamentSyncRuns.FindAsync([syncRunId], cancellationToken);
        return syncRun is null ? null : DtoMapper.ToSyncRunDto(syncRun);
    }

    private async Task<IReadOnlyList<LiveScoreFixtureRow>> FetchRowsForModeAsync(
        Tournament tournament,
        TournamentSyncMode mode,
        CancellationToken cancellationToken)
    {
        var skipDetailEventIds = tournament.Matches
            .Where(match =>
                match.Status == MatchStatus.Finished &&
                match.RegularTimeHomeScore.HasValue &&
                match.RegularTimeAwayScore.HasValue)
            .Select(match => match.LiveScoreEventId)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var rows = new List<LiveScoreFixtureRow>();
        foreach (var request in GetLiveScoreRequests(mode))
        {
            rows.AddRange(await liveScoreClient.GetCompetitionRowsAsync(
                tournament,
                request.ListType,
                request.EnrichScoreBreakdowns,
                skipDetailEventIds,
                cancellationToken));
        }

        return rows
            .Where(row => !string.IsNullOrWhiteSpace(row.EventId))
            .GroupBy(row => row.EventId, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.OrderByDescending(PreferredListTypeSortKey).First())
            .OrderBy(row => row.KickoffUtc)
            .ThenBy(row => row.EventId)
            .ToList();
    }

    private async Task<UpsertResult> UpsertRowsAsync(
        Tournament tournament,
        IReadOnlyList<LiveScoreFixtureRow> rows,
        CancellationToken cancellationToken)
    {
        var inserted = 0;
        var updated = 0;
        var unchanged = 0;
        var now = DateTimeOffset.UtcNow;

        UpdateTournamentMetadata(tournament, rows, now);

        var stagesByLiveScoreId = tournament.Stages
            .Where(stage => !string.IsNullOrWhiteSpace(stage.LiveScoreStageId))
            .ToDictionary(stage => stage.LiveScoreStageId, StringComparer.OrdinalIgnoreCase);

        var matchesByEventId = tournament.Matches
            .ToDictionary(match => match.LiveScoreEventId, StringComparer.OrdinalIgnoreCase);

        var teamIds = rows
            .SelectMany(row => new[] { row.HomeTeamId, row.AwayTeamId })
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var teamNamesWithoutIds = rows
            .SelectMany(row => new[] { (row.HomeTeamId, row.HomeTeam), (row.AwayTeamId, row.AwayTeam) })
            .Where(team => string.IsNullOrWhiteSpace(team.Item1) && !string.IsNullOrWhiteSpace(team.Item2))
            .Select(team => team.Item2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existingTeams = await dbContext.Teams
            .Where(team =>
                (team.LiveScoreTeamId != null && teamIds.Contains(team.LiveScoreTeamId)) ||
                (team.LiveScoreTeamId == null && teamNamesWithoutIds.Contains(team.Name)))
            .ToListAsync(cancellationToken);

        var teamsByKey = existingTeams.ToDictionary(TeamLookupKey, StringComparer.OrdinalIgnoreCase);
        var tournamentTeams = await dbContext.TournamentTeams
            .Where(tournamentTeam => tournamentTeam.TournamentId == tournament.Id)
            .ToListAsync(cancellationToken);
        var tournamentTeamIds = tournamentTeams
            .Select(tournamentTeam => tournamentTeam.TeamId)
            .ToHashSet();

        foreach (var row in rows)
        {
            var stage = UpsertStage(tournament, row, stagesByLiveScoreId, now);
            var homeTeam = UpsertTeam(row.HomeTeamId, row.HomeTeam, row.HomeAbbr, row.HomeTeamImage, teamsByKey, now);
            var awayTeam = UpsertTeam(row.AwayTeamId, row.AwayTeam, row.AwayAbbr, row.AwayTeamImage, teamsByKey, now);

            await dbContext.SaveChangesAsync(cancellationToken);

            AddTournamentTeam(tournament, homeTeam, tournamentTeamIds, now);
            AddTournamentTeam(tournament, awayTeam, tournamentTeamIds, now);

            if (!matchesByEventId.TryGetValue(row.EventId, out var match))
            {
                match = CreateMatch(tournament, stage, homeTeam, awayTeam, row, now);
                dbContext.Matches.Add(match);
                matchesByEventId[row.EventId] = match;
                inserted++;
                continue;
            }

            if (UpdateMatch(match, stage, homeTeam, awayTeam, row, now))
            {
                updated++;
            }
            else
            {
                unchanged++;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new UpsertResult(inserted, updated, unchanged);
    }

    private static IEnumerable<LiveScoreRequest> GetLiveScoreRequests(TournamentSyncMode mode)
    {
        return mode switch
        {
            TournamentSyncMode.Live => [new LiveScoreRequest(LiveScoreListType.Fixtures, false)],
            TournamentSyncMode.Results => [new LiveScoreRequest(LiveScoreListType.Results, true)],
            TournamentSyncMode.Finalize =>
            [
                new LiveScoreRequest(LiveScoreListType.Fixtures, false),
                new LiveScoreRequest(LiveScoreListType.Results, true)
            ],
            TournamentSyncMode.Schedule =>
            [
                new LiveScoreRequest(LiveScoreListType.Fixtures, false),
                new LiveScoreRequest(LiveScoreListType.Results, false)
            ],
            _ =>
            [
                new LiveScoreRequest(LiveScoreListType.Fixtures, true),
                new LiveScoreRequest(LiveScoreListType.Results, true)
            ]
        };
    }

    private static int PreferredListTypeSortKey(LiveScoreFixtureRow row)
    {
        return row.ListType == LiveScoreListType.Fixtures ? 1 : 0;
    }

    private static void UpdateTournamentMetadata(
        Tournament tournament,
        IReadOnlyList<LiveScoreFixtureRow> rows,
        DateTimeOffset now)
    {
        var preferred = rows.FirstOrDefault(row => row.ListType == LiveScoreListType.Fixtures) ?? rows.FirstOrDefault();
        if (preferred is null)
        {
            return;
        }

        AssignIfNotEmpty(value => tournament.LiveScoreCompetitionId = value, preferred.CompetitionId);
        AssignIfNotEmpty(value => tournament.CompetitionName = value, preferred.CompetitionName);
        AssignIfNotEmpty(value => tournament.CompetitionCountry = value, preferred.CompetitionCountry);
        AssignIfNotEmpty(value => tournament.CompetitionUrlName = value, preferred.CompetitionUrlName);
        AssignIfNotEmpty(value => tournament.CategoryCode = value, preferred.CategoryCode);
        AssignIfNotEmpty(value => tournament.CategoryName = value, preferred.CategoryName);
        AssignIfNotEmpty(value => tournament.CategoryTransliteratedName = value, preferred.CategoryTransliteratedName);

        if (!string.IsNullOrWhiteSpace(preferred.CategoryName) && tournament.Name == tournament.CompetitionName)
        {
            tournament.Name = preferred.CategoryName;
        }

        tournament.UpdatedAtUtc = now;
    }

    private TournamentStage? UpsertStage(
        Tournament tournament,
        LiveScoreFixtureRow row,
        Dictionary<string, TournamentStage> stagesByLiveScoreId,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(row.StageId))
        {
            return null;
        }

        if (!stagesByLiveScoreId.TryGetValue(row.StageId, out var stage))
        {
            stage = new TournamentStage
            {
                TournamentId = tournament.Id,
                LiveScoreStageId = row.StageId,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            tournament.Stages.Add(stage);
            dbContext.TournamentStages.Add(stage);
            stagesByLiveScoreId[row.StageId] = stage;
        }

        stage.Name = row.StageName;
        stage.Code = row.StageCode;
        stage.UpdatedAtUtc = now;
        return stage;
    }

    private Team? UpsertTeam(
        string liveScoreTeamId,
        string name,
        string abbreviation,
        string imageUrl,
        Dictionary<string, Team> teamsByKey,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(liveScoreTeamId) && string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        var key = TeamLookupKey(liveScoreTeamId, name);
        if (!teamsByKey.TryGetValue(key, out var team))
        {
            team = new Team
            {
                LiveScoreTeamId = string.IsNullOrWhiteSpace(liveScoreTeamId) ? null : liveScoreTeamId,
                Name = name,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            dbContext.Teams.Add(team);
            teamsByKey[key] = team;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            team.Name = name;
        }

        team.Abbreviation = abbreviation;
        team.ImageUrl = imageUrl;
        team.UpdatedAtUtc = now;
        return team;
    }

    private void AddTournamentTeam(
        Tournament tournament,
        Team? team,
        HashSet<int> tournamentTeamIds,
        DateTimeOffset now)
    {
        if (team is null || tournamentTeamIds.Contains(team.Id))
        {
            return;
        }

        dbContext.TournamentTeams.Add(new TournamentTeam
        {
            TournamentId = tournament.Id,
            TeamId = team.Id,
            FirstSeenAtUtc = now,
            LastSeenAtUtc = now
        });
        tournamentTeamIds.Add(team.Id);
    }

    private static Match CreateMatch(
        Tournament tournament,
        TournamentStage? stage,
        Team? homeTeam,
        Team? awayTeam,
        LiveScoreFixtureRow row,
        DateTimeOffset now)
    {
        var match = new Match
        {
            TournamentId = tournament.Id,
            LiveScoreEventId = row.EventId,
            CreatedAtUtc = now
        };

        UpdateMatch(match, stage, homeTeam, awayTeam, row, now);
        return match;
    }

    private static bool UpdateMatch(
        Match match,
        TournamentStage? stage,
        Team? homeTeam,
        Team? awayTeam,
        LiveScoreFixtureRow row,
        DateTimeOffset now)
    {
        var changed = false;

        changed |= SetIfChanged(value => match.StageId = value, match.StageId, stage?.Id);
        changed |= SetIfChanged(value => match.KickoffUtc = value, match.KickoffUtc, row.KickoffUtc);
        changed |= SetIfChanged(value => match.HomeTeamId = value, match.HomeTeamId, homeTeam?.Id);
        changed |= SetIfChanged(value => match.AwayTeamId = value, match.AwayTeamId, awayTeam?.Id);
        changed |= SetIfChanged(value => match.HomeTeamNameSnapshot = value, match.HomeTeamNameSnapshot, row.HomeTeam);
        changed |= SetIfChanged(value => match.AwayTeamNameSnapshot = value, match.AwayTeamNameSnapshot, row.AwayTeam);
        changed |= SetIfChanged(value => match.HomeTeamAbbrSnapshot = value, match.HomeTeamAbbrSnapshot, row.HomeAbbr);
        changed |= SetIfChanged(value => match.AwayTeamAbbrSnapshot = value, match.AwayTeamAbbrSnapshot, row.AwayAbbr);
        changed |= SetIfChanged(value => match.HomeTeamImageSnapshot = value, match.HomeTeamImageSnapshot, row.HomeTeamImage);
        changed |= SetIfChanged(value => match.AwayTeamImageSnapshot = value, match.AwayTeamImageSnapshot, row.AwayTeamImage);
        changed |= SetIfChanged(value => match.HomeScore = value, match.HomeScore, row.HomeScore);
        changed |= SetIfChanged(value => match.AwayScore = value, match.AwayScore, row.AwayScore);
        changed |= SetIfChanged(value => match.RegularTimeHomeScore = value, match.RegularTimeHomeScore, row.RegularHomeScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.RegularTimeAwayScore = value, match.RegularTimeAwayScore, row.RegularAwayScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.AfterExtraTimeHomeScore = value, match.AfterExtraTimeHomeScore, row.AfterExtraTimeHomeScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.AfterExtraTimeAwayScore = value, match.AfterExtraTimeAwayScore, row.AfterExtraTimeAwayScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.ExtraTimeHomeGoals = value, match.ExtraTimeHomeGoals, row.ExtraTimeHomeGoals, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.ExtraTimeAwayGoals = value, match.ExtraTimeAwayGoals, row.ExtraTimeAwayGoals, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.PenaltyHomeScore = value, match.PenaltyHomeScore, row.PenaltyHomeScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.PenaltyAwayScore = value, match.PenaltyAwayScore, row.PenaltyAwayScore, preserveExistingWhenIncomingNull: true);
        changed |= SetIfChanged(value => match.Status = value, match.Status, row.Status);
        changed |= SetIfChanged(value => match.RawStatus = value, match.RawStatus, row.StatusRaw);
        changed |= SetIfChanged(value => match.SyncState = value, match.SyncState, row.SyncState);
        changed |= SetIfChanged(value => match.RoundInfo = value, match.RoundInfo, row.RoundInfo);
        changed |= SetIfChanged(value => match.MatchUrl = value, match.MatchUrl, row.MatchUrl);
        changed |= SetIfChanged(value => match.LastSourceEndpoint = value, match.LastSourceEndpoint, row.SourceEndpoint);
        changed |= SetIfChanged(value => match.LastSeenInListType = value, match.LastSeenInListType, row.ListType);

        if (match.FinishedAtUtc is null &&
            (row.Status == MatchStatus.Finished || row.SyncState == MatchSyncState.Finalized))
        {
            match.FinishedAtUtc = now;
            changed = true;
        }

        match.LastSyncedAtUtc = now;
        if (changed)
        {
            match.UpdatedAtUtc = now;
        }

        return changed;
    }

    private async Task EnrichFinishedMatchStatisticsAsync(Tournament tournament, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var statisticsDelay = TimeSpan.FromMinutes(Math.Max(0, options.Value.StatisticsDelayAfterFinishedMinutes));
        var eligibleMatches = tournament.Matches
            .Where(match =>
                match.Statistics is null &&
                match.FinishedAtUtc.HasValue &&
                now - match.FinishedAtUtc.Value >= statisticsDelay &&
                match.Status == MatchStatus.Finished &&
                !string.IsNullOrWhiteSpace(match.LiveScoreEventId))
            .ToList();

        foreach (var match in eligibleMatches)
        {
            var statisticsRow = await liveScoreClient.GetMatchStatisticsAsync(
                tournament,
                match.LiveScoreEventId,
                cancellationToken);

            if (statisticsRow is null)
            {
                continue;
            }

            dbContext.MatchStatistics.Add(CreateMatchStatistics(match, statisticsRow, now));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static MatchStatistics CreateMatchStatistics(
        Match match,
        LiveScoreMatchStatisticsRow row,
        DateTimeOffset now)
    {
        return new MatchStatistics
        {
            MatchId = match.Id,
            LiveScoreEventId = string.IsNullOrWhiteSpace(row.EventId) ? match.LiveScoreEventId : row.EventId,
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

    private static bool SetIfChanged<T>(
        Action<T> assign,
        T current,
        T incoming,
        bool preserveExistingWhenIncomingNull = false)
    {
        if (preserveExistingWhenIncomingNull && incoming is null)
        {
            return false;
        }

        if (EqualityComparer<T>.Default.Equals(current, incoming))
        {
            return false;
        }

        assign(incoming);
        return true;
    }

    private static void AssignIfNotEmpty(Action<string> assign, string value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            assign(value);
        }
    }

    private static string TeamLookupKey(Team team)
    {
        return TeamLookupKey(team.LiveScoreTeamId ?? string.Empty, team.Name);
    }

    private static string TeamLookupKey(string liveScoreTeamId, string name)
    {
        return string.IsNullOrWhiteSpace(liveScoreTeamId)
            ? $"name:{name.Trim().ToUpperInvariant()}"
            : $"id:{liveScoreTeamId.Trim().ToUpperInvariant()}";
    }

    private sealed record LiveScoreRequest(LiveScoreListType ListType, bool EnrichScoreBreakdowns);

    private sealed record UpsertResult(int Inserted, int Updated, int Unchanged);
}
