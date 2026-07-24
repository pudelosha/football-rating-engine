using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Interfaces;

public interface IEmailService
{
    Task SendConfirmationEmailAsync(ApplicationUser user);
    Task SendPasswordResetEmailAsync(ApplicationUser user, string encodedToken);
}
