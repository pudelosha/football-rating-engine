using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ITournamentQueryService
{
    Task<IReadOnlyList<TournamentSummaryDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<TournamentDetailsDto?> GetByIdAsync(int tournamentId, CancellationToken cancellationToken);
    Task<TournamentDetailsDto?> UpdateAsync(int tournamentId, UpdateTournamentRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(int tournamentId, CancellationToken cancellationToken);
}
