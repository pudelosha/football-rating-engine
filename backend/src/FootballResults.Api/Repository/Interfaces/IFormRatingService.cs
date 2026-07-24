using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IFormRatingService
{
    Task<RebuildFormRatingResponse> RebuildAsync(
        int tournamentId,
        RebuildFormRatingRequest request,
        CancellationToken cancellationToken);

    Task<FormRatingRunDto?> GetLatestRunAsync(int tournamentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<TeamFormRatingDto>> GetLatestTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeamFormMatchSnapshotDto>> GetRunSnapshotsAsync(
        int runId,
        CancellationToken cancellationToken);
}
