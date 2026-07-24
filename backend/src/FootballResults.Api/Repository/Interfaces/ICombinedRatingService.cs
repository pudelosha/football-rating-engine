using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ICombinedRatingService
{
    Task<CombinedTeamRatingsDto> GetTournamentTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken);
}
