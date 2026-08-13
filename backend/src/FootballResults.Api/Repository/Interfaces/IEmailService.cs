using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Interfaces;

public interface IEmailService
{
    Task SendConfirmationEmailAsync(ApplicationUser user, string? language);
    Task SendPasswordResetEmailAsync(ApplicationUser user, string encodedToken, string? language);
    Task SendSocialBettingInvitationEmailAsync(
        ApplicationUser user,
        string tournamentName,
        int participantId,
        string token,
        bool requiresPasswordSetup,
        string? language);
}
