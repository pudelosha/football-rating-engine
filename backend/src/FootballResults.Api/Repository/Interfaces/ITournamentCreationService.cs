using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ITournamentCreationService
{
    Task<TournamentDetailsDto> CreateAsync(CreateTournamentRequest request, CancellationToken cancellationToken);
}
