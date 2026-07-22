using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ISquadQualityService
{
    Task<ImportTransfermarktSquadResponse> ImportTransfermarktSquadAsync(
        int teamId,
        ImportTransfermarktSquadRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ExternalTeamMappingDto>> GetTeamMappingsAsync(
        int teamId,
        CancellationToken cancellationToken);

    Task<SquadQualitySnapshotDto?> GetLatestSnapshotAsync(
        int teamId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<SquadPlayerSnapshotDto>> GetSnapshotPlayersAsync(
        int snapshotId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeamSquadQualityRatingDto>> GetTournamentTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken);
}
