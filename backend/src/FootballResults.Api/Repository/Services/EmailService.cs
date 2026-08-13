using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Identity;
using System.Net;
using System.Net.Mail;

namespace FootballResults.Api.Repository.Services;

public sealed class EmailService(
    IConfiguration configuration,
    ILogger<EmailService> logger,
    UserManager<ApplicationUser> userManager) : IEmailService
{
    public async Task SendConfirmationEmailAsync(ApplicationUser user, string? language)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        var lang = AuthText.Language(language);
        var copy = ConfirmationCopy(lang);
        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = IdentityTokenUrlDecoder.Encode(token);
        var confirmationLink = BuildFrontendUrl(
            $"/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(encodedToken)}&language={lang}");

        await SendEmailAsync(
            user.Email,
            copy.Subject,
            BuildEmailBody(
                copy.Title,
                copy.Body,
                copy.ActionText,
                confirmationLink,
                copy.SecondaryText,
                copy.FallbackText,
                lang));
    }

    public async Task SendPasswordResetEmailAsync(ApplicationUser user, string encodedToken, string? language)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        var lang = AuthText.Language(language);
        var copy = PasswordResetCopy(lang);
        var resetLink = BuildFrontendUrl(
            $"/reset-password?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(encodedToken)}&language={lang}");

        await SendEmailAsync(
            user.Email,
            copy.Subject,
            BuildEmailBody(
                copy.Title,
                copy.Body,
                copy.ActionText,
                resetLink,
                copy.SecondaryText,
                copy.FallbackText,
                lang));
    }

    public async Task SendSocialBettingInvitationEmailAsync(
        ApplicationUser user,
        string tournamentName,
        int participantId,
        string token,
        bool requiresPasswordSetup,
        string? language)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        var lang = AuthText.Language(language);
        var copy = SocialBettingInvitationCopy(lang, tournamentName, requiresPasswordSetup);
        var encodedToken = IdentityTokenUrlDecoder.Encode(token);
        var inviteLink = BuildFrontendUrl(
            $"/betting/invite?participantId={participantId}&token={Uri.EscapeDataString(encodedToken)}&language={lang}");

        await SendEmailAsync(
            user.Email,
            copy.Subject,
            BuildEmailBody(
                copy.Title,
                copy.Body,
                copy.ActionText,
                inviteLink,
                copy.SecondaryText,
                copy.FallbackText,
                lang));
    }

    private async Task SendEmailAsync(string to, string subject, string body)
    {
        if (!configuration.GetValue<bool>("EmailSettings:EnableSending"))
        {
            logger.LogInformation("Email sending is disabled. Skipping {Subject} email to {Recipient}.", subject, to);
            return;
        }

        var smtpServer = configuration["EmailSettings:SmtpServer"];
        var smtpPortValue = configuration["EmailSettings:SmtpPort"];
        var smtpUsername = configuration["EmailSettings:SmtpUsername"];
        var smtpPassword = configuration["EmailSettings:SmtpPassword"];
        var fromEmail = configuration["EmailSettings:FromEmail"];

        if (string.IsNullOrWhiteSpace(smtpServer) ||
            string.IsNullOrWhiteSpace(smtpPortValue) ||
            string.IsNullOrWhiteSpace(smtpUsername) ||
            string.IsNullOrWhiteSpace(smtpPassword) ||
            string.IsNullOrWhiteSpace(fromEmail))
        {
            throw new InvalidOperationException("SMTP email sending is enabled, but EmailSettings are incomplete.");
        }

        if (!int.TryParse(smtpPortValue, out var smtpPort))
        {
            throw new InvalidOperationException("EmailSettings:SmtpPort is invalid.");
        }

        using var client = new SmtpClient(smtpServer, smtpPort)
        {
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(smtpUsername, smtpPassword),
            EnableSsl = configuration.GetValue("EmailSettings:EnableSsl", false)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(to);

        await client.SendMailAsync(message);
    }

    private string BuildFrontendUrl(string route)
    {
        var frontendBaseUrl = configuration["App:ClientBaseUrl"];
        if (string.IsNullOrWhiteSpace(frontendBaseUrl))
        {
            frontendBaseUrl = configuration["ASPNETCORE_ENVIRONMENT"] == "Development"
                ? configuration["App:ClientBaseUrlDev"]
                : configuration["App:ClientBaseUrlProd"];
        }

        if (string.IsNullOrWhiteSpace(frontendBaseUrl))
        {
            frontendBaseUrl = "https://football-rating-engine.com";
        }

        return $"{frontendBaseUrl.TrimEnd('/')}/{route.TrimStart('/')}";
    }

    private static string BuildEmailBody(
        string title,
        string body,
        string actionText,
        string actionLink,
        string secondaryText,
        string fallbackText,
        string language)
    {
        var encodedTitle = WebUtility.HtmlEncode(title);
        var encodedBody = WebUtility.HtmlEncode(body);
        var encodedActionText = WebUtility.HtmlEncode(actionText);
        var encodedActionLink = WebUtility.HtmlEncode(actionLink);
        var encodedSecondaryText = WebUtility.HtmlEncode(secondaryText);
        var encodedFallbackText = WebUtility.HtmlEncode(fallbackText);
        var encodedLanguage = WebUtility.HtmlEncode(language);

        return $$"""
            <!doctype html>
            <html lang="{{encodedLanguage}}">
            <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#172033;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e7ef;border-radius:8px;padding:28px;">
                      <tr><td>
                        <h1 style="font-size:22px;line-height:1.3;margin:0 0 14px;">{{encodedTitle}}</h1>
                        <p style="font-size:15px;line-height:1.55;margin:0 0 24px;">{{encodedBody}}</p>
                        <p style="margin:0 0 24px;">
                          <a href="{{encodedActionLink}}" style="display:inline-block;background:#172033;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:bold;">{{encodedActionText}}</a>
                        </p>
                        <p style="font-size:13px;line-height:1.55;color:#5d6678;margin:0 0 12px;">{{encodedSecondaryText}}</p>
                        <p style="font-size:12px;line-height:1.55;color:#6f7788;margin:0;">{{encodedFallbackText}}<br><a href="{{encodedActionLink}}" style="color:#335cff;">{{encodedActionLink}}</a></p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static EmailCopy ConfirmationCopy(string language)
    {
        return language == "pl"
            ? new EmailCopy(
                "Potwierdź konto",
                "Potwierdź konto",
                "Dziękujemy za rejestrację. Potwierdź adres email, aby aktywować konto.",
                "Potwierdź konto",
                "Jeśli to nie Ty zakładałeś konto, możesz zignorować tę wiadomość.",
                "Jeśli przycisk nie działa, otwórz ten link:")
            : new EmailCopy(
                "Confirm your account",
                "Confirm your account",
                "Thanks for registering. Confirm your email address to activate your account.",
                "Confirm Account",
                "If you did not register, you can ignore this email.",
                "If the button does not work, open this link:");
    }

    private static EmailCopy PasswordResetCopy(string language)
    {
        return language == "pl"
            ? new EmailCopy(
                "Zresetuj hasło",
                "Zresetuj hasło",
                "Użyj przycisku poniżej, aby ustawić nowe hasło do konta.",
                "Resetuj hasło",
                "Jeśli nie prosiłeś o reset hasła, możesz zignorować tę wiadomość.",
                "Jeśli przycisk nie działa, otwórz ten link:")
            : new EmailCopy(
                "Reset your password",
                "Reset your password",
                "Use the button below to set a new password for your account.",
                "Reset Password",
                "If you did not request a password reset, you can ignore this email.",
                "If the button does not work, open this link:");
    }

    private static EmailCopy SocialBettingInvitationCopy(string language, string tournamentName, bool requiresPasswordSetup)
    {
        if (language == "pl")
        {
            var body = requiresPasswordSetup
                ? $"Zaproszono Cię do typowania w turnieju {tournamentName}. Ustaw hasło, aby aktywować konto i dołączyć do zabawy."
                : $"Zaproszono Cię do typowania w turnieju {tournamentName}. Otwórz link, aby zaakceptować zaproszenie.";

            return new EmailCopy(
                "Zaproszenie do typowania",
                "Zaproszenie do typowania",
                body,
                requiresPasswordSetup ? "Ustaw hasło i dołącz" : "Akceptuj zaproszenie",
                "Jeśli nie spodziewasz się zaproszenia, możesz zignorować tę wiadomość.",
                "Jeśli przycisk nie działa, otwórz ten link:");
        }

        var englishBody = requiresPasswordSetup
            ? $"You have been invited to the {tournamentName} prediction tournament. Set your password to activate your account and join."
            : $"You have been invited to the {tournamentName} prediction tournament. Open the link to accept the invitation.";

        return new EmailCopy(
            "Prediction tournament invitation",
            "Prediction tournament invitation",
            englishBody,
            requiresPasswordSetup ? "Set password and join" : "Accept invitation",
            "If you did not expect this invitation, you can ignore this email.",
            "If the button does not work, open this link:");
    }

    private sealed record EmailCopy(
        string Subject,
        string Title,
        string Body,
        string ActionText,
        string SecondaryText,
        string FallbackText);
}
