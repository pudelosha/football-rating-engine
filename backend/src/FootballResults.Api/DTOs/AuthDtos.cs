namespace FootballResults.Api.DTOs;

public sealed record RegisterRequest(string Email, string Password, string? DisplayName = null, string? Language = null);
public sealed record RegisterResponse(bool Success, string Message, string? ApiKey = null);
public sealed record LoginRequest(string Email, string Password, string? Language = null);
public sealed record LoginResponse(bool Success, string Message, string? Token = null);
public sealed record ForgotPasswordRequest(string Email, string? Language = null);
public sealed record ForgotPasswordResponse(bool Success, string Message, string? UserId = null, string? ResetToken = null);
public sealed record ResendConfirmationEmailRequest(string Email, string? Language = null);
public sealed record ResetPasswordRequest(string UserId, string Token, string NewPassword, string? Language = null);
public sealed record AuthActionResponse(bool Success, string Message);
public sealed record UserProfileDto(string Email, string? DisplayName, DateTimeOffset MemberSinceUtc, DateTimeOffset ApiKeyCreatedAtUtc);
public sealed record UpdateUserProfileRequest(string? DisplayName, string? Language = null);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword, string? Language = null);
public sealed record ChangeEmailRequest(string NewEmail, string Password, string? Language = null);
public sealed record RotateApiKeyResponse(string ApiKey, string? Message = null);
public sealed record ChangeUserRoleRequest(string Role, string? Language = null);
public sealed record AdminResendConfirmationEmailRequest(string? Language = null);
public sealed record AdminUserDto(
    string Id,
    string Email,
    string? DisplayName,
    DateTimeOffset MemberSinceUtc,
    bool EmailConfirmed,
    bool IsLockedOut,
    IReadOnlyList<string> Roles);
