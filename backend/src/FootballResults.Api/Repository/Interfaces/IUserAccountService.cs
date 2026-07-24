using FootballResults.Api.DTOs;
using System.Security.Claims;

namespace FootballResults.Api.Repository.Interfaces;

public interface IUserAccountService
{
    string? GetUserId(ClaimsPrincipal principal);
    Task<UserProfileDto?> GetProfileAsync(string userId);
    Task<bool> UpdateProfileAsync(string userId, UpdateUserProfileRequest request);
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task<bool> ChangeEmailAsync(string userId, ChangeEmailRequest request);
    Task<RotateApiKeyResponse?> RotateApiKeyAsync(string userId);
    Task<IReadOnlyList<AdminUserDto>> GetUsersAsync();
    Task<AdminUserDto?> GetUserAsync(string userId);
    Task<bool> SuspendUserAsync(string userId);
    Task<bool> UnsuspendUserAsync(string userId);
    Task<bool> DeleteUserAsync(string userId);
}
