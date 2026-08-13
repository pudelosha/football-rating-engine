using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ICombinedRatingService
{
    Task<CombinedTeamRatingsDto> GetTournamentTeamRatingsAsync(
        int tournamentId,
        string? currentRoundInfo,
        string? compareRoundInfo,
        CancellationToken cancellationToken);
}
