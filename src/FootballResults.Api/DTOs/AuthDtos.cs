namespace FootballResults.Api.DTOs;

public sealed record RegisterRequest(string Email, string Password, string? DisplayName = null);
public sealed record RegisterResponse(bool Success, string Message, string? ApiKey = null);
public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(bool Success, string Message, string? Token = null);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ForgotPasswordResponse(bool Success, string Message, string? UserId = null, string? ResetToken = null);
public sealed record ResendConfirmationEmailRequest(string Email);
public sealed record ResetPasswordRequest(string UserId, string Token, string NewPassword);
public sealed record AuthActionResponse(bool Success, string Message);
public sealed record UserProfileDto(string Email, string? DisplayName, DateTimeOffset MemberSinceUtc);
public sealed record UpdateUserProfileRequest(string? DisplayName);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record ChangeEmailRequest(string NewEmail, string Password);
public sealed record RotateApiKeyResponse(string ApiKey);
public sealed record AdminUserDto(
    string Id,
    string Email,
    string? DisplayName,
    DateTimeOffset MemberSinceUtc,
    bool EmailConfirmed,
    bool IsLockedOut,
    IReadOnlyList<string> Roles);
