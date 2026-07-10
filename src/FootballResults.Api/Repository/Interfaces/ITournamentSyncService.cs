using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Interfaces;

public interface ITournamentSyncService
{
    Task<SyncTournamentResponse> SyncAsync(
        int tournamentId,
        TournamentSyncMode mode,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TournamentSyncRunDto>> GetTournamentSyncRunsAsync(
        int tournamentId,
        CancellationToken cancellationToken);

    Task<TournamentSyncRunDto?> GetSyncRunAsync(int syncRunId, CancellationToken cancellationToken);
}
