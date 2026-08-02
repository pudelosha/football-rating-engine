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
            return new RegisterResponse(false, AuthText.Message("RegisterDuplicate", request.Language));
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
            return new RegisterResponse(false, AuthText.IdentityErrors(created, request.Language));
        }

        await userManager.AddToRoleAsync(user, "User");
        await TrySendConfirmationEmailAsync(user, request.Language);

        return new RegisterResponse(true, AuthText.Message("RegisterSuccess", request.Language), apiKey);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new LoginResponse(false, AuthText.Message("LoginInvalid", request.Language));
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (result.IsNotAllowed)
        {
            return new LoginResponse(false, AuthText.Message("LoginUnconfirmed", request.Language));
        }

        if (!result.Succeeded)
        {
            return new LoginResponse(false, AuthText.Message("LoginInvalid", request.Language));
        }

        return new LoginResponse(true, AuthText.Message("LoginSuccess", request.Language), await CreateJwtAsync(user));
    }

    public async Task<AuthActionResponse> ConfirmEmailAsync(string userId, string token, string? language = null)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return new AuthActionResponse(false, AuthText.Message("UserNotFound", language));
        }

        string decodedToken;
        try
        {
            decodedToken = IdentityTokenUrlDecoder.Decode(token);
        }
        catch (FormatException exception)
        {
            logger.LogWarning(exception, "Invalid email confirmation token for user {UserId}.", userId);
            return new AuthActionResponse(false, AuthText.Message("InvalidConfirmationToken", language));
        }

        var result = await userManager.ConfirmEmailAsync(user, decodedToken);
        return result.Succeeded
            ? new AuthActionResponse(true, AuthText.Message("EmailConfirmed", language))
            : new AuthActionResponse(false, AuthText.IdentityErrors(result, language));
    }

    public async Task<AuthActionResponse> ResendConfirmationEmailAsync(ResendConfirmationEmailRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new AuthActionResponse(true, AuthText.Message("ResendConfirmationSafe", request.Language));
        }

        if (await userManager.IsEmailConfirmedAsync(user))
        {
            return new AuthActionResponse(true, AuthText.Message("ResendConfirmationSafe", request.Language));
        }

        await TrySendConfirmationEmailAsync(user, request.Language);
        return new AuthActionResponse(true, AuthText.Message("ResendConfirmationSafe", request.Language));
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return new ForgotPasswordResponse(true, AuthText.Message("ForgotPasswordSafe", request.Language));
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = IdentityTokenUrlDecoder.Encode(token);
        await TrySendPasswordResetEmailAsync(user, encodedToken, request.Language);

        return environment.IsDevelopment()
            ? new ForgotPasswordResponse(true, AuthText.Message("DevelopmentResetToken", request.Language), user.Id, encodedToken)
            : new ForgotPasswordResponse(true, AuthText.Message("ForgotPasswordSafe", request.Language));
    }

    public async Task<AuthActionResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user is null)
        {
            return new AuthActionResponse(false, AuthText.Message("UserNotFound", request.Language));
        }

        string decodedToken;
        try
        {
            decodedToken = IdentityTokenUrlDecoder.Decode(request.Token);
        }
        catch (FormatException exception)
        {
            logger.LogWarning(exception, "Invalid password reset token for user {UserId}.", request.UserId);
            return new AuthActionResponse(false, AuthText.Message("InvalidPasswordResetToken", request.Language));
        }

        var result = await userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
        return result.Succeeded
            ? new AuthActionResponse(true, AuthText.Message("PasswordResetSuccess", request.Language))
            : new AuthActionResponse(false, AuthText.IdentityErrors(result, request.Language));
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
        var lifetimeDays = GetJwtLifetimeDays();

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddDays(lifetimeDays),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private double GetJwtLifetimeDays()
    {
        var configuredLifetimeDays = configuration.GetValue<double?>("Jwt:LifetimeDays");
        return configuredLifetimeDays is > 0 ? configuredLifetimeDays.Value : 365;
    }

    private async Task TrySendConfirmationEmailAsync(ApplicationUser user, string? language)
    {
        try
        {
            await emailService.SendConfirmationEmailAsync(user, language);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Confirmation email could not be sent to {Email}.", user.Email);
        }
    }

    private async Task TrySendPasswordResetEmailAsync(ApplicationUser user, string encodedToken, string? language)
    {
        try
        {
            await emailService.SendPasswordResetEmailAsync(user, encodedToken, language);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Password reset email could not be sent to {Email}.", user.Email);
        }
    }
}
