using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IPerformanceRatingService
{
    Task<RebuildPerformanceRatingResponse> RebuildAsync(
        int tournamentId,
        RebuildPerformanceRatingRequest request,
        CancellationToken cancellationToken);

    Task<PerformanceRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<TeamPerformanceRatingDto>> GetLatestTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeamPerformanceMatchSnapshotDto>> GetRunSnapshotsAsync(
        int runId,
        CancellationToken cancellationToken);
}
