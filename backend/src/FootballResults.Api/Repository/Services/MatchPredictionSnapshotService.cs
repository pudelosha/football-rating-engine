using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Repository.Services;

public sealed class MatchPredictionSnapshotService(
    AppDbContext dbContext,
    ICombinedRatingService combinedRatingService) : IMatchPredictionSnapshotService
{
    private const decimal DefaultHomeAdvantage = 50m;

    public Task<int> CaptureMissingFinishedMatchSnapshotsAsync(CancellationToken cancellationToken)
    {
        return CaptureMissingFinishedMatchSnapshotsCoreAsync(null, cancellationToken);
    }

    public Task<int> CaptureMissingFinishedMatchSnapshotsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        return CaptureMissingFinishedMatchSnapshotsCoreAsync(tournamentId, cancellationToken);
    }

    public async Task<MatchPredictionSnapshotDto?> GetMatchPredictionSnapshotAsync(
        int tournamentId,
        int matchId,
        CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.MatchPredictionSnapshots
            .AsNoTracking()
            .FirstOrDefaultAsync(
                snapshot => snapshot.TournamentId == tournamentId && snapshot.MatchId == matchId,
                cancellationToken);

        return snapshot is null ? null : DtoMapper.ToMatchPredictionSnapshotDto(snapshot);
    }

    private async Task<int> CaptureMissingFinishedMatchSnapshotsCoreAsync(
        int? tournamentId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Matches
            .Include(match => match.Tournament)
            .Include(match => match.HomeTeam)
            .Include(match => match.AwayTeam)
            .Where(match =>
                match.Status == MatchStatus.Finished &&
                match.HomeTeamId.HasValue &&
                match.AwayTeamId.HasValue &&
                match.PredictionSnapshot == null);

        if (tournamentId.HasValue)
        {
            query = query.Where(match => match.TournamentId == tournamentId.Value);
        }

        var matches = await query
            .OrderBy(match => match.KickoffUtc)
            .ThenBy(match => match.Id)
            .ToListAsync(cancellationToken);

        var createdCount = 0;
        foreach (var group in matches.GroupBy(match => match.TournamentId))
        {
            var ratings = await combinedRatingService.GetTournamentTeamRatingsAsync(group.Key, cancellationToken);
            var ratingsByTeamId = ratings.Teams.ToDictionary(rating => rating.TeamId);

            foreach (var match in group)
            {
                if (!match.HomeTeamId.HasValue ||
                    !match.AwayTeamId.HasValue ||
                    !ratingsByTeamId.TryGetValue(match.HomeTeamId.Value, out var homeRating) ||
                    !ratingsByTeamId.TryGetValue(match.AwayTeamId.Value, out var awayRating))
                {
                    continue;
                }

                var prediction = CalculatePrediction(homeRating, awayRating, match.Tournament.ApplyHomeAdvantage);
                var snapshot = BuildSnapshot(match, ratings.RunContext, homeRating, awayRating, prediction);
                dbContext.MatchPredictionSnapshots.Add(snapshot);

                try
                {
                    await dbContext.SaveChangesAsync(cancellationToken);
                    createdCount++;
                }
                catch (DbUpdateException)
                {
                    dbContext.Entry(snapshot).State = EntityState.Detached;
                }
            }
        }

        return createdCount;
    }

    private static MatchPredictionSnapshot BuildSnapshot(
        Match match,
        CombinedRatingRunContextDto runContext,
        TeamCombinedRatingDto homeRating,
        TeamCombinedRatingDto awayRating,
        PredictionValues prediction)
    {
        return new MatchPredictionSnapshot
        {
            MatchId = match.Id,
            TournamentId = match.TournamentId,
            CapturedAtUtc = DateTimeOffset.UtcNow,
            Source = SyncServiceKeys.PredictionSnapshot,
            BaseEloRunId = runContext.BaseEloRunId,
            FormRatingRunId = runContext.FormRatingRunId,
            PerformanceRatingRunId = runContext.PerformanceRatingRunId,
            SnapshotStartSeasonOffset = runContext.SnapshotStartSeasonOffset,
            RatingCalculatedAtUtc = runContext.CalculatedAtUtc,
            HomeTeamId = homeRating.TeamId,
            AwayTeamId = awayRating.TeamId,
            HomeTeamName = homeRating.TeamName,
            AwayTeamName = awayRating.TeamName,
            HomeBaseElo = homeRating.BaseElo,
            AwayBaseElo = awayRating.BaseElo,
            HomeFormAdjustment = homeRating.FormAdjustment,
            AwayFormAdjustment = awayRating.FormAdjustment,
            HomePerformanceAdjustment = homeRating.PerformanceAdjustment,
            AwayPerformanceAdjustment = awayRating.PerformanceAdjustment,
            HomeSquadQualityAdjustment = homeRating.SquadQualityAdjustment,
            AwaySquadQualityAdjustment = awayRating.SquadQualityAdjustment,
            HomeFinalRating = homeRating.FinalRating,
            AwayFinalRating = awayRating.FinalRating,
            HomeRatingConfidence = homeRating.RatingConfidence,
            AwayRatingConfidence = awayRating.RatingConfidence,
            ApplyHomeAdvantage = match.Tournament.ApplyHomeAdvantage,
            HomeAdvantage = prediction.HomeAdvantage,
            RatingGap = prediction.RatingGap,
            HomeWinProbability = prediction.HomeWin,
            DrawProbability = prediction.Draw,
            AwayWinProbability = prediction.AwayWin,
            HomeFairOdds = prediction.HomeFairOdds,
            DrawFairOdds = prediction.DrawFairOdds,
            AwayFairOdds = prediction.AwayFairOdds,
            FavoriteOutcome = prediction.FavoriteOutcome,
            FavoriteProbability = prediction.FavoriteProbability
        };
    }

    private static PredictionValues CalculatePrediction(
        TeamCombinedRatingDto homeTeam,
        TeamCombinedRatingDto awayTeam,
        bool applyHomeAdvantage)
    {
        var homeAdvantage = applyHomeAdvantage ? DefaultHomeAdvantage : 0m;
        var ratingGap = homeTeam.FinalRating + homeAdvantage - awayTeam.FinalRating;
        var absoluteGap = Math.Abs(ratingGap);
        var draw = Clamp(0.255m * Exp(-absoluteGap / 560m) + 0.085m, 0.13m, 0.34m);
        var homeNoDraw = 1m / (1m + Pow(10m, -ratingGap / 480m));
        var homeWin = (1m - draw) * homeNoDraw;
        var awayWin = 1m - draw - homeWin;
        var homeUpsetFloor = applyHomeAdvantage ? 0.075m : 0.065m;
        var awayUpsetFloor = applyHomeAdvantage ? 0.055m : 0.065m;

        if (ratingGap > 0m && awayWin < awayUpsetFloor)
        {
            homeWin = Math.Max(0.01m, homeWin - (awayUpsetFloor - awayWin));
            awayWin = awayUpsetFloor;
        }
        else if (ratingGap < 0m && homeWin < homeUpsetFloor)
        {
            awayWin = Math.Max(0.01m, awayWin - (homeUpsetFloor - homeWin));
            homeWin = homeUpsetFloor;
        }

        if (ratingGap < -40m)
        {
            var awayFavoriteDrawBoost = Clamp((absoluteGap - 40m) / 260m * 0.045m, 0m, 0.045m);
            var transferredFromAway = Math.Min(awayFavoriteDrawBoost, Math.Max(0m, awayWin - awayUpsetFloor));
            awayWin -= transferredFromAway;
            draw += transferredFromAway;
        }

        var total = homeWin + draw + awayWin;
        homeWin /= total;
        draw /= total;
        awayWin /= total;

        var favoriteOutcome = "Draw";
        var favoriteProbability = draw;
        if (homeWin >= draw && homeWin >= awayWin)
        {
            favoriteOutcome = "HomeWin";
            favoriteProbability = homeWin;
        }
        else if (awayWin >= homeWin && awayWin >= draw)
        {
            favoriteOutcome = "AwayWin";
            favoriteProbability = awayWin;
        }

        return new PredictionValues(
            RoundMetric(homeWin),
            RoundMetric(draw),
            RoundMetric(awayWin),
            RoundOdds(1m / homeWin),
            RoundOdds(1m / draw),
            RoundOdds(1m / awayWin),
            RoundRating(ratingGap),
            homeAdvantage,
            favoriteOutcome,
            RoundMetric(favoriteProbability));
    }

    private static decimal Clamp(decimal value, decimal min, decimal max)
    {
        return Math.Min(max, Math.Max(min, value));
    }

    private static decimal Exp(decimal value)
    {
        return (decimal)Math.Exp((double)value);
    }

    private static decimal Pow(decimal value, decimal power)
    {
        return (decimal)Math.Pow((double)value, (double)power);
    }

    private static decimal RoundMetric(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundOdds(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundRating(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private sealed record PredictionValues(
        decimal HomeWin,
        decimal Draw,
        decimal AwayWin,
        decimal HomeFairOdds,
        decimal DrawFairOdds,
        decimal AwayFairOdds,
        decimal RatingGap,
        decimal HomeAdvantage,
        string FavoriteOutcome,
        decimal FavoriteProbability);
}
