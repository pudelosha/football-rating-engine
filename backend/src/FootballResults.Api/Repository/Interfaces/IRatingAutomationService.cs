namespace FootballResults.Api.Repository.Interfaces;

public interface IRatingAutomationService
{
    Task<int> RebuildStaleTournamentRatingsAsync(CancellationToken cancellationToken);

    Task<bool> RebuildTournamentRatingsIfStaleAsync(
        int tournamentId,
        CancellationToken cancellationToken);
}
