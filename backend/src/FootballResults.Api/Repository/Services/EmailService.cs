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
    public async Task SendConfirmationEmailAsync(ApplicationUser user)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = IdentityTokenUrlDecoder.Encode(token);
        var confirmationLink = BuildBackendUrl($"/api/auth/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(encodedToken)}");

        await SendEmailAsync(
            user.Email,
            "Confirm your account",
            BuildEmailBody(
                "Confirm your account",
                "Thanks for registering. Confirm your email address to activate your account.",
                "Confirm Account",
                confirmationLink,
                "If you did not register, you can ignore this email."));
    }

    public async Task SendPasswordResetEmailAsync(ApplicationUser user, string encodedToken)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return;
        }

        var resetLink = BuildFrontendUrl($"/reset-password?userId={Uri.EscapeDataString(user.Id)}&token={Uri.EscapeDataString(encodedToken)}");

        await SendEmailAsync(
            user.Email,
            "Reset your password",
            BuildEmailBody(
                "Reset your password",
                "Use the button below to set a new password for your account.",
                "Reset Password",
                resetLink,
                "If you did not request a password reset, you can ignore this email."));
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
            frontendBaseUrl = "https://app.betsoffriends.com";
        }

        return $"{frontendBaseUrl.TrimEnd('/')}/{route.TrimStart('/')}";
    }

    private string BuildBackendUrl(string route)
    {
        var backendBaseUrl = configuration["App:BackendBaseUrl"];
        if (string.IsNullOrWhiteSpace(backendBaseUrl))
        {
            backendBaseUrl = configuration["ASPNETCORE_ENVIRONMENT"] == "Development"
                ? configuration["App:BackendBaseUrlDev"]
                : configuration["App:BackendBaseUrlProd"];
        }

        if (string.IsNullOrWhiteSpace(backendBaseUrl))
        {
            backendBaseUrl = "https://api.betsoffriends.com";
        }

        return $"{backendBaseUrl.TrimEnd('/')}/{route.TrimStart('/')}";
    }

    private static string BuildEmailBody(
        string title,
        string body,
        string actionText,
        string actionLink,
        string secondaryText)
    {
        var encodedTitle = WebUtility.HtmlEncode(title);
        var encodedBody = WebUtility.HtmlEncode(body);
        var encodedActionText = WebUtility.HtmlEncode(actionText);
        var encodedActionLink = WebUtility.HtmlEncode(actionLink);
        var encodedSecondaryText = WebUtility.HtmlEncode(secondaryText);

        return $$"""
            <!doctype html>
            <html lang="en">
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
                        <p style="font-size:12px;line-height:1.55;color:#6f7788;margin:0;">If the button does not work, open this link:<br><a href="{{encodedActionLink}}" style="color:#335cff;">{{encodedActionLink}}</a></p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }
}
