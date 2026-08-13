using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IMatchPredictionSnapshotService
{
    Task<int> CaptureMissingFinishedMatchSnapshotsAsync(CancellationToken cancellationToken);

    Task<int> CaptureMissingFinishedMatchSnapshotsAsync(
        int tournamentId,
        CancellationToken cancellationToken);

    Task<MatchPredictionSnapshotDto?> GetMatchPredictionSnapshotAsync(
        int tournamentId,
        int matchId,
        CancellationToken cancellationToken);

    Task<MatchPredictionSnapshotDto?> PreviewMatchPredictionAsync(
        int tournamentId,
        int matchId,
        CancellationToken cancellationToken);
}
