using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ISocialBettingService
{
    Task<IReadOnlyList<SocialBettingTournamentSummaryDto>> GetTournamentsAsync(string userId, CancellationToken cancellationToken);
    Task<SocialBettingTournamentDto?> GetTournamentAsync(int id, string userId, CancellationToken cancellationToken);
    Task<SocialBettingResultsDto?> GetResultsAsync(int id, string userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<SocialBettingOutstandingBetDto>?> GetOutstandingBetsAsync(int id, string userId, int limit, CancellationToken cancellationToken);
    Task<SocialBettingMatchSummaryDto?> GetMatchSummaryAsync(int id, int matchId, string userId, CancellationToken cancellationToken);
    Task<SocialBettingPickDto?> UpsertPickAsync(int id, int matchId, string userId, UpsertSocialBettingPickRequest request, CancellationToken cancellationToken);
    Task<SocialBettingTournamentDto> CreateTournamentAsync(string userId, CreateSocialBettingTournamentRequest request, CancellationToken cancellationToken);
    Task<SocialBettingTournamentDto?> UpdateTournamentAsync(int id, string userId, UpdateSocialBettingTournamentRequest request, CancellationToken cancellationToken);
    Task<SocialBettingParticipantDto?> AddParticipantAsync(int tournamentId, string userId, AddSocialBettingParticipantRequest request, CancellationToken cancellationToken);
    Task<SocialBettingParticipantDto?> ResendInvitationAsync(int tournamentId, int participantId, string userId, string? language, CancellationToken cancellationToken);
    Task<SocialBettingTournamentSummaryDto?> ConfirmParticipationAsync(int tournamentId, string userId, CancellationToken cancellationToken);
    Task<bool> AcceptInvitationAsync(AcceptSocialBettingInvitationRequest request, CancellationToken cancellationToken);
}
