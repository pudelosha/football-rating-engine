using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ISocialBettingService
{
    Task<IReadOnlyList<SocialBettingTournamentSummaryDto>> GetTournamentsAsync(string userId, CancellationToken cancellationToken);
    Task<SocialBettingTournamentDto?> GetTournamentAsync(int id, string userId, CancellationToken cancellationToken);
    Task<SocialBettingTournamentDto> CreateTournamentAsync(string userId, CreateSocialBettingTournamentRequest request, CancellationToken cancellationToken);
    Task<SocialBettingTournamentDto?> UpdateTournamentAsync(int id, string userId, UpdateSocialBettingTournamentRequest request, CancellationToken cancellationToken);
    Task<SocialBettingParticipantDto?> AddParticipantAsync(int tournamentId, string userId, AddSocialBettingParticipantRequest request, CancellationToken cancellationToken);
    Task<SocialBettingParticipantDto?> ResendInvitationAsync(int tournamentId, int participantId, string userId, string? language, CancellationToken cancellationToken);
    Task<bool> AcceptInvitationAsync(AcceptSocialBettingInvitationRequest request, CancellationToken cancellationToken);
}
