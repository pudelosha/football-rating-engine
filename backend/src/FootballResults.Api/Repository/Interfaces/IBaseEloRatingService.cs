using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IBaseEloRatingService
{
    Task<RebuildBaseEloResponse> RebuildAsync(
        int tournamentId,
        RebuildBaseEloRequest request,
        CancellationToken cancellationToken);

    Task<EloRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<TeamEloRatingDto>> GetLatestTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<MatchEloSnapshotDto>> GetRunSnapshotsAsync(
        int runId,
        CancellationToken cancellationToken);
}
