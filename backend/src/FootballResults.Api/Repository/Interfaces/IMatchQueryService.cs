using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IMatchQueryService
{
    Task<IReadOnlyList<MatchDto>> GetTournamentMatchesAsync(int tournamentId, CancellationToken cancellationToken);
    Task<MatchDto?> GetTournamentMatchAsync(int tournamentId, int matchId, CancellationToken cancellationToken);
    Task<IReadOnlyList<MatchDto>> GetTournamentResultsAsync(int tournamentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<MatchDto>> GetTournamentLiveMatchesAsync(int tournamentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<MatchDto>> GetTournamentUpcomingMatchesAsync(int tournamentId, CancellationToken cancellationToken);
}
