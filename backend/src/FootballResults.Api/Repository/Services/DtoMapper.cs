using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Services;

internal static class DtoMapper
{
    public static TournamentSummaryDto ToSummaryDto(Tournament tournament)
    {
        return new TournamentSummaryDto(
            tournament.Id,
            tournament.IsActive,
            tournament.ApplyHomeAdvantage,
            tournament.Name,
            tournament.Season,
            tournament.CompetitionName,
            tournament.CompetitionCountry,
            tournament.CreatedAtUtc,
            tournament.UpdatedAtUtc,
            tournament.LastSyncedAtUtc,
            tournament.Stages.Count,
            tournament.TournamentTeams.Count,
            tournament.Matches.Count);
    }

    public static TournamentDetailsDto ToDetailsDto(Tournament tournament)
    {
        return new TournamentDetailsDto(
            tournament.Id,
            tournament.IsActive,
            tournament.ApplyHomeAdvantage,
            tournament.LiveScoreCompetitionId,
            tournament.Name,
            tournament.Season,
            tournament.CompetitionName,
            tournament.CompetitionCountry,
            tournament.CategoryCode,
            tournament.CategoryName,
            tournament.CategoryTransliteratedName,
            tournament.BaseUrl,
            tournament.FixturesUrl,
            tournament.ResultsUrl,
            tournament.Locale,
            tournament.TimezoneOffset,
            tournament.CreatedAtUtc,
            tournament.UpdatedAtUtc,
            tournament.LastSyncedAtUtc,
            tournament.Stages
                .OrderBy(stage => stage.SortOrder)
                .ThenBy(stage => stage.Name)
                .Select(ToStageDto)
                .ToList(),
            tournament.TournamentTeams
                .Select(tournamentTeam => tournamentTeam.Team)
                .OrderBy(team => team.Name)
                .Select(ToTeamDto)
                .ToList());
    }

    public static TournamentStageDto ToStageDto(TournamentStage stage)
    {
        return new TournamentStageDto(stage.Id, stage.Name, stage.Code, stage.SortOrder);
    }

    public static TeamDto ToTeamDto(Team team)
    {
        return new TeamDto(team.Id, team.Name, team.Abbreviation, team.IsEnabled);
    }

    public static MatchDto ToMatchDto(Match match)
    {
        return new MatchDto(
            match.Id,
            match.TournamentId,
            match.StageId,
            match.KickoffUtc,
            match.HomeTeam is null ? null : ToTeamDto(match.HomeTeam),
            match.AwayTeam is null ? null : ToTeamDto(match.AwayTeam),
            match.HomeTeamNameSnapshot,
            match.AwayTeamNameSnapshot,
            match.HomeScore,
            match.AwayScore,
            match.RegularTimeHomeScore,
            match.RegularTimeAwayScore,
            match.AfterExtraTimeHomeScore,
            match.AfterExtraTimeAwayScore,
            match.ExtraTimeHomeGoals,
            match.ExtraTimeAwayGoals,
            match.PenaltyHomeScore,
            match.PenaltyAwayScore,
            match.Status,
            match.RawStatus,
            match.SyncState,
            match.RoundInfo,
            match.LastSyncedAtUtc,
            match.PredictionSnapshot is not null);
    }

    public static MatchPredictionSnapshotDto ToMatchPredictionSnapshotDto(MatchPredictionSnapshot snapshot)
    {
        return new MatchPredictionSnapshotDto(
            snapshot.Id,
            snapshot.MatchId,
            snapshot.TournamentId,
            snapshot.CapturedAtUtc,
            snapshot.Source,
            snapshot.BaseEloRunId,
            snapshot.FormRatingRunId,
            snapshot.PerformanceRatingRunId,
            snapshot.SnapshotStartSeasonOffset,
            snapshot.RatingCalculatedAtUtc,
            snapshot.HomeTeamId,
            snapshot.AwayTeamId,
            snapshot.HomeTeamName,
            snapshot.AwayTeamName,
            snapshot.HomeBaseElo,
            snapshot.AwayBaseElo,
            snapshot.HomeFormAdjustment,
            snapshot.AwayFormAdjustment,
            snapshot.HomePerformanceAdjustment,
            snapshot.AwayPerformanceAdjustment,
            snapshot.HomeSquadQualityAdjustment,
            snapshot.AwaySquadQualityAdjustment,
            snapshot.HomeFinalRating,
            snapshot.AwayFinalRating,
            snapshot.HomeRatingConfidence,
            snapshot.AwayRatingConfidence,
            snapshot.ApplyHomeAdvantage,
            snapshot.HomeAdvantage,
            snapshot.RatingGap,
            snapshot.HomeWinProbability,
            snapshot.DrawProbability,
            snapshot.AwayWinProbability,
            snapshot.HomeFairOdds,
            snapshot.DrawFairOdds,
            snapshot.AwayFairOdds,
            snapshot.FavoriteOutcome,
            snapshot.FavoriteProbability);
    }

    public static TournamentSyncRunDto ToSyncRunDto(TournamentSyncRun syncRun)
    {
        return new TournamentSyncRunDto(
            syncRun.Id,
            syncRun.TournamentId,
            syncRun.Mode,
            syncRun.Status,
            syncRun.StartedAtUtc,
            syncRun.FinishedAtUtc,
            syncRun.InsertedMatches,
            syncRun.UpdatedMatches,
            syncRun.UnchangedMatches,
            syncRun.ErrorMessage);
    }
}
