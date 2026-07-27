using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Controllers;

[ApiController]
[Route("api/admin/data-quality")]
[Authorize(Policy = AuthExtensions.AdminPolicy)]
public sealed class DataQualityController(AppDbContext dbContext) : ControllerBase
{
    private const int SquadSnapshotFreshnessDays = 30;
    private const int SyncFreshnessHours = 2;
    private const int IssueListLimit = 100;

    [HttpGet("tournament-checks")]
    [ProducesResponseType(typeof(IReadOnlyList<DataQualityTournamentCheckDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DataQualityTournamentCheckDto>>> GetTournamentChecks(
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var staleSquadSnapshotCutoff = now.AddDays(-SquadSnapshotFreshnessDays);
        var staleSyncCutoff = now.AddHours(-SyncFreshnessHours);
        var pastMatchCutoff = now.AddHours(-3);

        var activeTournamentIds = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament => tournament.IsActive)
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);

        var activeTournamentCount = activeTournamentIds.Count;
        var structureIssueCount = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament =>
                tournament.IsActive
                && (tournament.LiveScoreCompetitionId == string.Empty
                    || tournament.Name == string.Empty
                    || tournament.Season == string.Empty
                    || tournament.BaseUrl == string.Empty
                    || !tournament.TournamentTeams.Any()
                    || !tournament.Stages.Any()))
            .CountAsync(cancellationToken);

        var structureLastSample = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament => tournament.IsActive)
            .MaxAsync(tournament => (DateTimeOffset?)tournament.UpdatedAtUtc, cancellationToken);

        var matchCompletenessCheckedCount = await dbContext.Matches
            .AsNoTracking()
            .Where(match => activeTournamentIds.Contains(match.TournamentId))
            .CountAsync(cancellationToken);

        var matchCompletenessIssueCount = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && (match.LiveScoreEventId == string.Empty
                    || match.KickoffUtc == null
                    || match.HomeTeamId == null
                    || match.AwayTeamId == null
                    || match.RoundInfo == string.Empty
                    || (match.KickoffUtc < pastMatchCutoff
                        && match.Status != MatchStatus.Finished
                        && match.Status != MatchStatus.Cancelled
                        && match.Status != MatchStatus.Postponed)
                    || (match.Status == MatchStatus.Finished
                        && (match.HomeScore == null || match.AwayScore == null))))
            .CountAsync(cancellationToken);

        var matchCompletenessLastSample = await dbContext.Matches
            .AsNoTracking()
            .Where(match => activeTournamentIds.Contains(match.TournamentId))
            .MaxAsync(match => (DateTimeOffset?)match.UpdatedAtUtc, cancellationToken);

        var resultEnrichmentCheckedCount = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && match.Status == MatchStatus.Finished
                && (match.RawStatus == "AET" || match.RawStatus == "AP"))
            .CountAsync(cancellationToken);

        var resultEnrichmentIssueCount = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && match.Status == MatchStatus.Finished
                && ((match.RawStatus == "AET"
                        && (match.RegularTimeHomeScore == null
                            || match.RegularTimeAwayScore == null
                            || match.AfterExtraTimeHomeScore == null
                            || match.AfterExtraTimeAwayScore == null))
                    || (match.RawStatus == "AP"
                        && (match.RegularTimeHomeScore == null
                            || match.RegularTimeAwayScore == null
                            || match.PenaltyHomeScore == null
                            || match.PenaltyAwayScore == null))))
            .CountAsync(cancellationToken);

        var resultEnrichmentLastSample = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && match.Status == MatchStatus.Finished
                && (match.RawStatus == "AET" || match.RawStatus == "AP"))
            .MaxAsync(match => (DateTimeOffset?)match.UpdatedAtUtc, cancellationToken);

        var statisticsCheckedCount = await dbContext.Matches
            .AsNoTracking()
            .Where(match => activeTournamentIds.Contains(match.TournamentId) && match.Status == MatchStatus.Finished)
            .CountAsync(cancellationToken);

        var statisticsIssueCount = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && match.Status == MatchStatus.Finished
                && (match.Statistics == null
                    || match.Statistics.HomeExpectedGoals == null
                    || match.Statistics.AwayExpectedGoals == null))
            .CountAsync(cancellationToken);

        var statisticsLastSample = await dbContext.MatchStatistics
            .AsNoTracking()
            .Where(statistics => activeTournamentIds.Contains(statistics.Match.TournamentId))
            .MaxAsync(statistics => (DateTimeOffset?)statistics.UpdatedAtUtc, cancellationToken);

        var tournamentTeamRows = await dbContext.TournamentTeams
            .AsNoTracking()
            .Where(tournamentTeam => activeTournamentIds.Contains(tournamentTeam.TournamentId))
            .Select(tournamentTeam => new
            {
                tournamentTeam.TeamId,
                HasTransfermarktMapping = dbContext.ExternalTeamMappings.Any(mapping =>
                    mapping.TeamId == tournamentTeam.TeamId && mapping.Provider == "Transfermarkt"),
                LatestSnapshotUtc = dbContext.SquadQualitySnapshots
                    .Where(snapshot => snapshot.TeamId == tournamentTeam.TeamId && snapshot.Provider == "Transfermarkt")
                    .Max(snapshot => (DateTimeOffset?)snapshot.FetchedAtUtc)
            })
            .ToListAsync(cancellationToken);

        var squadIssueCount = tournamentTeamRows.Count(row =>
            !row.HasTransfermarktMapping
            || row.LatestSnapshotUtc is null
            || row.LatestSnapshotUtc < staleSquadSnapshotCutoff);

        var squadLastSample = tournamentTeamRows
            .Select(row => row.LatestSnapshotUtc)
            .Where(value => value is not null)
            .DefaultIfEmpty()
            .Max();

        var syncFailedLast24Hours = await dbContext.TournamentSyncRuns
            .AsNoTracking()
            .Where(run =>
                activeTournamentIds.Contains(run.TournamentId)
                && run.StartedAtUtc >= now.AddHours(-24)
                && run.Status == TournamentSyncRunStatus.Failed)
            .CountAsync(cancellationToken);

        var staleSyncTournamentCount = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament =>
                tournament.IsActive
                && (tournament.LastSyncedAtUtc == null || tournament.LastSyncedAtUtc < staleSyncCutoff))
            .CountAsync(cancellationToken);

        var syncLastSample = await dbContext.TournamentSyncRuns
            .AsNoTracking()
            .Where(run => activeTournamentIds.Contains(run.TournamentId))
            .MaxAsync(run => (DateTimeOffset?)run.StartedAtUtc, cancellationToken);

        var syncIssueCount = staleSyncTournamentCount + syncFailedLast24Hours;

        var checks = new[]
        {
            CreateCheck(
                "tournament-structure",
                "Tournament structure",
                structureIssueCount,
                activeTournamentCount,
                structureLastSample,
                structureIssueCount == 0
                    ? "All active tournaments have core identity, teams, and stages."
                    : $"{structureIssueCount} active tournament records need identity, team, or stage review."),
            CreateCheck(
                "match-completeness",
                "Match completeness",
                matchCompletenessIssueCount,
                matchCompletenessCheckedCount,
                matchCompletenessLastSample,
                matchCompletenessIssueCount == 0
                    ? "Tracked matches have required teams, dates, scores, and status data."
                    : $"{matchCompletenessIssueCount} match records are missing required fields or final state."),
            CreateCheck(
                "result-enrichment",
                "Result enrichment",
                resultEnrichmentIssueCount,
                resultEnrichmentCheckedCount,
                resultEnrichmentLastSample,
                resultEnrichmentIssueCount == 0
                    ? "Extra-time and penalty results are enriched where detected."
                    : $"{resultEnrichmentIssueCount} AET/AP matches need regular-time, extra-time, or penalty details."),
            CreateCheck(
                "match-statistics",
                "Match statistics",
                statisticsIssueCount,
                statisticsCheckedCount,
                statisticsLastSample,
                statisticsIssueCount == 0
                    ? "Finished matches have statistics coverage for performance signals."
                    : $"{statisticsIssueCount} finished matches have missing or incomplete statistics."),
            CreateCheck(
                "squad-snapshots",
                "Squad snapshots",
                squadIssueCount,
                tournamentTeamRows.Count,
                squadLastSample,
                squadIssueCount == 0
                    ? "Tournament teams have Transfermarkt mappings and fresh snapshots."
                    : $"{squadIssueCount} tournament-team rows need mapping or a fresh squad snapshot."),
            CreateCheck(
                "sync-freshness",
                "Sync freshness",
                syncIssueCount,
                activeTournamentCount,
                syncLastSample,
                syncIssueCount == 0
                    ? "Active tournaments have fresh sync samples and no recent failures."
                    : $"{staleSyncTournamentCount} tournaments are stale and {syncFailedLast24Hours} sync runs failed in the last 24 hours.")
        };

        return Ok(checks);
    }

    [HttpGet("tournament-checks/{key}/issues")]
    [ProducesResponseType(typeof(IReadOnlyList<DataQualityIssueDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<DataQualityIssueDto>>> GetTournamentCheckIssues(
        string key,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var activeTournamentIds = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament => tournament.IsActive)
            .Select(tournament => tournament.Id)
            .ToListAsync(cancellationToken);

        var issues = key switch
        {
            "tournament-structure" => await GetTournamentStructureIssuesAsync(cancellationToken),
            "match-completeness" => await GetMatchCompletenessIssuesAsync(activeTournamentIds, now, cancellationToken),
            "result-enrichment" => await GetResultEnrichmentIssuesAsync(activeTournamentIds, cancellationToken),
            "match-statistics" => await GetMatchStatisticsIssuesAsync(activeTournamentIds, cancellationToken),
            "squad-snapshots" => await GetSquadSnapshotIssuesAsync(activeTournamentIds, now, cancellationToken),
            "sync-freshness" => await GetSyncFreshnessIssuesAsync(now, cancellationToken),
            _ => null
        };

        return issues is null ? NotFound() : Ok(issues);
    }

    private static DataQualityTournamentCheckDto CreateCheck(
        string key,
        string title,
        int issueCount,
        int checkedCount,
        DateTimeOffset? lastSampleUtc,
        string summary)
    {
        var status = issueCount == 0
            ? "Healthy"
            : issueCount >= Math.Max(3, checkedCount / 10)
                ? "Critical"
                : "Needs review";

        return new DataQualityTournamentCheckDto(
            key,
            title,
            status,
            issueCount,
            checkedCount,
            lastSampleUtc,
            summary);
    }

    private async Task<IReadOnlyList<DataQualityIssueDto>> GetTournamentStructureIssuesAsync(
        CancellationToken cancellationToken)
    {
        var rows = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament =>
                tournament.IsActive
                && (tournament.LiveScoreCompetitionId == string.Empty
                    || tournament.Name == string.Empty
                    || tournament.Season == string.Empty
                    || tournament.BaseUrl == string.Empty
                    || !tournament.TournamentTeams.Any()
                    || !tournament.Stages.Any()))
            .OrderBy(tournament => tournament.Name)
            .Select(tournament => new
            {
                tournament.Id,
                tournament.Name,
                tournament.Season,
                tournament.UpdatedAtUtc,
                tournament.LiveScoreCompetitionId,
                tournament.BaseUrl,
                TeamCount = tournament.TournamentTeams.Count,
                StageCount = tournament.Stages.Count
            })
            .Take(IssueListLimit)
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new DataQualityIssueDto(
                "tournament-structure",
                "High",
                DisplayTournamentName(row.Name, row.Season),
                "Tournament",
                DisplayTournamentName(row.Name, row.Season),
                row.Id,
                row.UpdatedAtUtc,
                string.Join(", ", new[]
                {
                    row.LiveScoreCompetitionId == string.Empty ? "missing LiveScore competition ID" : null,
                    row.Name == string.Empty ? "missing name" : null,
                    row.Season == string.Empty ? "missing season" : null,
                    row.BaseUrl == string.Empty ? "missing base URL" : null,
                    row.TeamCount == 0 ? "missing teams" : null,
                    row.StageCount == 0 ? "missing stages" : null
                }.Where(value => value is not null)!)))
            .ToList();
    }

    private async Task<IReadOnlyList<DataQualityIssueDto>> GetMatchCompletenessIssuesAsync(
        IReadOnlyCollection<int> activeTournamentIds,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var pastMatchCutoff = now.AddHours(-3);
        var rows = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && (match.LiveScoreEventId == string.Empty
                    || match.KickoffUtc == null
                    || match.HomeTeamId == null
                    || match.AwayTeamId == null
                    || match.RoundInfo == string.Empty
                    || (match.KickoffUtc < pastMatchCutoff
                        && match.Status != MatchStatus.Finished
                        && match.Status != MatchStatus.Cancelled
                        && match.Status != MatchStatus.Postponed)
                    || (match.Status == MatchStatus.Finished
                        && (match.HomeScore == null || match.AwayScore == null))))
            .OrderBy(match => match.KickoffUtc)
            .Select(match => new
            {
                match.Id,
                TournamentName = match.Tournament.Name,
                match.Tournament.Season,
                match.UpdatedAtUtc,
                match.KickoffUtc,
                match.LiveScoreEventId,
                match.HomeTeamId,
                match.AwayTeamId,
                match.HomeTeamNameSnapshot,
                match.AwayTeamNameSnapshot,
                match.RoundInfo,
                match.Status,
                match.HomeScore,
                match.AwayScore
            })
            .Take(IssueListLimit)
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new DataQualityIssueDto(
                "match-completeness",
                "High",
                DisplayTournamentName(row.TournamentName, row.Season),
                "Match",
                DisplayMatchName(row.HomeTeamNameSnapshot, row.AwayTeamNameSnapshot, row.KickoffUtc),
                row.Id,
                row.UpdatedAtUtc,
                string.Join(", ", new[]
                {
                    row.LiveScoreEventId == string.Empty ? "missing LiveScore event ID" : null,
                    row.KickoffUtc is null ? "missing kickoff" : null,
                    row.HomeTeamId is null ? "missing home team" : null,
                    row.AwayTeamId is null ? "missing away team" : null,
                    row.RoundInfo == string.Empty ? "missing round" : null,
                    row.KickoffUtc < pastMatchCutoff && row.Status != MatchStatus.Finished && row.Status != MatchStatus.Cancelled && row.Status != MatchStatus.Postponed ? "past match not closed" : null,
                    row.Status == MatchStatus.Finished && (row.HomeScore is null || row.AwayScore is null) ? "finished match missing final score" : null
                }.Where(value => value is not null)!)))
            .ToList();
    }

    private async Task<IReadOnlyList<DataQualityIssueDto>> GetResultEnrichmentIssuesAsync(
        IReadOnlyCollection<int> activeTournamentIds,
        CancellationToken cancellationToken)
    {
        var rows = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && match.Status == MatchStatus.Finished
                && ((match.RawStatus == "AET"
                        && (match.RegularTimeHomeScore == null
                            || match.RegularTimeAwayScore == null
                            || match.AfterExtraTimeHomeScore == null
                            || match.AfterExtraTimeAwayScore == null))
                    || (match.RawStatus == "AP"
                        && (match.RegularTimeHomeScore == null
                            || match.RegularTimeAwayScore == null
                            || match.PenaltyHomeScore == null
                            || match.PenaltyAwayScore == null))))
            .OrderByDescending(match => match.KickoffUtc)
            .Select(match => new
            {
                match.Id,
                TournamentName = match.Tournament.Name,
                match.Tournament.Season,
                match.UpdatedAtUtc,
                match.KickoffUtc,
                match.HomeTeamNameSnapshot,
                match.AwayTeamNameSnapshot,
                match.RawStatus,
                match.RegularTimeHomeScore,
                match.RegularTimeAwayScore,
                match.AfterExtraTimeHomeScore,
                match.AfterExtraTimeAwayScore,
                match.PenaltyHomeScore,
                match.PenaltyAwayScore
            })
            .Take(IssueListLimit)
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new DataQualityIssueDto(
                "result-enrichment",
                "High",
                DisplayTournamentName(row.TournamentName, row.Season),
                "Match",
                DisplayMatchName(row.HomeTeamNameSnapshot, row.AwayTeamNameSnapshot, row.KickoffUtc),
                row.Id,
                row.UpdatedAtUtc,
                string.Join(", ", new[]
                {
                    row.RegularTimeHomeScore is null || row.RegularTimeAwayScore is null ? "missing regular-time score" : null,
                    row.RawStatus == "AET" && (row.AfterExtraTimeHomeScore is null || row.AfterExtraTimeAwayScore is null) ? "missing after-extra-time score" : null,
                    row.RawStatus == "AP" && (row.PenaltyHomeScore is null || row.PenaltyAwayScore is null) ? "missing penalty score" : null
                }.Where(value => value is not null)!)))
            .ToList();
    }

    private async Task<IReadOnlyList<DataQualityIssueDto>> GetMatchStatisticsIssuesAsync(
        IReadOnlyCollection<int> activeTournamentIds,
        CancellationToken cancellationToken)
    {
        var rows = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                activeTournamentIds.Contains(match.TournamentId)
                && match.Status == MatchStatus.Finished
                && (match.Statistics == null
                    || match.Statistics.HomeExpectedGoals == null
                    || match.Statistics.AwayExpectedGoals == null))
            .OrderByDescending(match => match.KickoffUtc)
            .Select(match => new
            {
                match.Id,
                TournamentName = match.Tournament.Name,
                match.Tournament.Season,
                match.UpdatedAtUtc,
                match.KickoffUtc,
                match.HomeTeamNameSnapshot,
                match.AwayTeamNameSnapshot,
                HasStatistics = match.Statistics != null,
                HomeExpectedGoals = match.Statistics == null ? null : match.Statistics.HomeExpectedGoals,
                AwayExpectedGoals = match.Statistics == null ? null : match.Statistics.AwayExpectedGoals
            })
            .Take(IssueListLimit)
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new DataQualityIssueDto(
                "match-statistics",
                "High",
                DisplayTournamentName(row.TournamentName, row.Season),
                "Match",
                DisplayMatchName(row.HomeTeamNameSnapshot, row.AwayTeamNameSnapshot, row.KickoffUtc),
                row.Id,
                row.UpdatedAtUtc,
                !row.HasStatistics
                    ? "missing MatchStatistics record"
                    : string.Join(", ", new[]
                    {
                        row.HomeExpectedGoals is null ? "missing home xG" : null,
                        row.AwayExpectedGoals is null ? "missing away xG" : null
                    }.Where(value => value is not null)!)))
            .ToList();
    }

    private async Task<IReadOnlyList<DataQualityIssueDto>> GetSquadSnapshotIssuesAsync(
        IReadOnlyCollection<int> activeTournamentIds,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var staleSquadSnapshotCutoff = now.AddDays(-SquadSnapshotFreshnessDays);
        var rows = await dbContext.TournamentTeams
            .AsNoTracking()
            .Where(tournamentTeam => activeTournamentIds.Contains(tournamentTeam.TournamentId))
            .Select(tournamentTeam => new
            {
                tournamentTeam.TeamId,
                TeamName = tournamentTeam.Team.Name,
                TournamentName = tournamentTeam.Tournament.Name,
                tournamentTeam.Tournament.Season,
                tournamentTeam.LastSeenAtUtc,
                HasTransfermarktMapping = dbContext.ExternalTeamMappings.Any(mapping =>
                    mapping.TeamId == tournamentTeam.TeamId && mapping.Provider == "Transfermarkt"),
                LatestSnapshotUtc = dbContext.SquadQualitySnapshots
                    .Where(snapshot => snapshot.TeamId == tournamentTeam.TeamId && snapshot.Provider == "Transfermarkt")
                    .Max(snapshot => (DateTimeOffset?)snapshot.FetchedAtUtc)
            })
            .ToListAsync(cancellationToken);

        return rows
            .Where(row =>
                !row.HasTransfermarktMapping
                || row.LatestSnapshotUtc is null
                || row.LatestSnapshotUtc < staleSquadSnapshotCutoff)
            .OrderBy(row => row.TournamentName)
            .ThenBy(row => row.TeamName)
            .Take(IssueListLimit)
            .Select(row => new DataQualityIssueDto(
                "squad-snapshots",
                "Medium",
                DisplayTournamentName(row.TournamentName, row.Season),
                "Team",
                row.TeamName,
                row.TeamId,
                row.LatestSnapshotUtc ?? row.LastSeenAtUtc,
                !row.HasTransfermarktMapping
                    ? "missing Transfermarkt mapping"
                    : row.LatestSnapshotUtc is null
                        ? "missing squad snapshot"
                        : $"stale squad snapshot older than {SquadSnapshotFreshnessDays} days"))
            .ToList();
    }

    private async Task<IReadOnlyList<DataQualityIssueDto>> GetSyncFreshnessIssuesAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var staleSyncCutoff = now.AddHours(-SyncFreshnessHours);
        var staleTournamentRows = await dbContext.Tournaments
            .AsNoTracking()
            .Where(tournament =>
                tournament.IsActive
                && (tournament.LastSyncedAtUtc == null || tournament.LastSyncedAtUtc < staleSyncCutoff))
            .OrderBy(tournament => tournament.LastSyncedAtUtc)
            .Select(tournament => new
            {
                tournament.Id,
                tournament.Name,
                tournament.Season,
                tournament.LastSyncedAtUtc
            })
            .Take(IssueListLimit)
            .ToListAsync(cancellationToken);

        var staleTournaments = staleTournamentRows
            .Select(tournament => new DataQualityIssueDto(
                "sync-freshness",
                "Medium",
                DisplayTournamentName(tournament.Name, tournament.Season),
                "Tournament",
                DisplayTournamentName(tournament.Name, tournament.Season),
                tournament.Id,
                tournament.LastSyncedAtUtc,
                $"last tournament sync older than {SyncFreshnessHours} hours"))
            .ToList();

        if (staleTournaments.Count >= IssueListLimit)
        {
            return staleTournaments;
        }

        var failedRunRows = await dbContext.TournamentSyncRuns
            .AsNoTracking()
            .Where(run =>
                run.Tournament.IsActive
                && run.StartedAtUtc >= now.AddHours(-24)
                && run.Status == TournamentSyncRunStatus.Failed)
            .OrderByDescending(run => run.StartedAtUtc)
            .Select(run => new
            {
                run.Id,
                TournamentName = run.Tournament.Name,
                run.Tournament.Season,
                run.Mode,
                run.StartedAtUtc,
                run.ErrorMessage
            })
            .Take(IssueListLimit - staleTournaments.Count)
            .ToListAsync(cancellationToken);

        var failedRuns = failedRunRows
            .Select(run => new DataQualityIssueDto(
                "sync-freshness",
                "High",
                DisplayTournamentName(run.TournamentName, run.Season),
                "Sync run",
                run.Mode.ToString(),
                run.Id,
                run.StartedAtUtc,
                run.ErrorMessage == string.Empty ? "sync run failed" : run.ErrorMessage))
            .ToList();

        return staleTournaments.Concat(failedRuns).ToList();
    }

    private static string DisplayTournamentName(string name, string season)
    {
        return season == string.Empty ? name : $"{name} {season}";
    }

    private static string DisplayMatchName(string homeTeam, string awayTeam, DateTimeOffset? kickoffUtc)
    {
        var teams = $"{Fallback(homeTeam, "Unknown home")} vs {Fallback(awayTeam, "Unknown away")}";
        return kickoffUtc is null ? teams : $"{teams} - {kickoffUtc:dd.MM.yyyy HH:mm}";
    }

    private static string Fallback(string value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }
}
