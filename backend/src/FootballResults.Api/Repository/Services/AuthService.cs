using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace FootballResults.Api.Repository.Services;

public sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IApiKeyService apiKeyService,
    IEmailService emailService,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            return new RegisterResponse(false, "User with this email already exists.");
        }

        var apiKey = apiKeyService.GenerateApiKey();
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            ApiKeyHash = apiKeyService.HashApiKey(apiKey),
            ApiKeyCreatedAtUtc = DateTimeOffset.UtcNow,
            MemberSinceUtc = DateTimeOffset.UtcNow
        };

        var created = await userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return new RegisterResponse(false, FormatIdentityErrors(created));
        }

        await userManager.AddToRoleAsync(user, "User");
        await TrySendConfirmationEmailAsync(user);

        return new RegisterResponse(true, "Registered successfully. Store this API key now because it will not be shown again.", apiKey);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new LoginResponse(false, "Invalid email or password.");
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            return new LoginResponse(false, "Invalid email or password.");
        }

        return new LoginResponse(true, "Logged in successfully.", await CreateJwtAsync(user));
    }

    public async Task<AuthActionResponse> ConfirmEmailAsync(string userId, string token)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new AuthActionResponse(false, "User was not found.");
        }

        string decodedToken;
        try
        {
            decodedToken = IdentityTokenUrlDecoder.Decode(token);
        }
        catch (FormatException exception)
        {
            logger.LogWarning(exception, "Invalid email confirmation token for user {UserId}.", userId);
            return new AuthActionResponse(false, "Invalid confirmation token. Request a new confirmation email.");
        }

        var result = await userManager.ConfirmEmailAsync(user, decodedToken);
        return result.Succeeded
            ? new AuthActionResponse(true, "Email confirmed.")
            : new AuthActionResponse(false, FormatIdentityErrors(result));
    }

    public async Task<AuthActionResponse> ResendConfirmationEmailAsync(ResendConfirmationEmailRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new AuthActionResponse(true, "If the account exists and is not confirmed, a confirmation email will be sent.");
        }

        if (await userManager.IsEmailConfirmedAsync(user))
        {
            return new AuthActionResponse(true, "If the account exists and is not confirmed, a confirmation email will be sent.");
        }

        await TrySendConfirmationEmailAsync(user);
        return new AuthActionResponse(true, "If the account exists and is not confirmed, a confirmation email will be sent.");
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new ForgotPasswordResponse(true, "If the account exists, a reset token will be sent.");
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = IdentityTokenUrlDecoder.Encode(token);
        await TrySendPasswordResetEmailAsync(user, encodedToken);

        return environment.IsDevelopment()
            ? new ForgotPasswordResponse(true, "Development reset token generated.", user.Id, encodedToken)
            : new ForgotPasswordResponse(true, "If the account exists, a reset token will be sent.");
    }

    public async Task<AuthActionResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user is null)
        {
            return new AuthActionResponse(false, "User was not found.");
        }

        string decodedToken;
        try
        {
            decodedToken = IdentityTokenUrlDecoder.Decode(request.Token);
        }
        catch (FormatException exception)
        {
            logger.LogWarning(exception, "Invalid password reset token for user {UserId}.", request.UserId);
            return new AuthActionResponse(false, "Invalid password reset token. Request a new password reset email.");
        }

        var result = await userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
        return result.Succeeded
            ? new AuthActionResponse(true, "Password reset successfully.")
            : new AuthActionResponse(false, FormatIdentityErrors(result));
    }

    private async Task<string> CreateJwtAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var key = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Missing Jwt:Key.");
        var issuer = configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Missing Jwt:Issuer.");
        var audience = configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Missing Jwt:Audience.");

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string FormatIdentityErrors(IdentityResult result)
    {
        return string.Join(" ", result.Errors.Select(error => error.Description));
    }

    private async Task TrySendConfirmationEmailAsync(ApplicationUser user)
    {
        try
        {
            await emailService.SendConfirmationEmailAsync(user);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Confirmation email could not be sent to {Email}.", user.Email);
        }
    }

    private async Task TrySendPasswordResetEmailAsync(ApplicationUser user, string encodedToken)
    {
        try
        {
            await emailService.SendPasswordResetEmailAsync(user, encodedToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Password reset email could not be sent to {Email}.", user.Email);
        }
    }
}
