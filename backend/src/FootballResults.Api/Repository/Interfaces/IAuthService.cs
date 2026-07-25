using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface IAuthService
{
    Task<RegisterResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<AuthActionResponse> ConfirmEmailAsync(string userId, string token, string? language = null);
    Task<AuthActionResponse> ResendConfirmationEmailAsync(ResendConfirmationEmailRequest request);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<AuthActionResponse> ResetPasswordAsync(ResetPasswordRequest request);
}
