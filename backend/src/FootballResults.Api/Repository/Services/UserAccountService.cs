using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace FootballResults.Api.Repository.Services;

public sealed class UserAccountService(
    UserManager<ApplicationUser> userManager,
    IApiKeyService apiKeyService) : IUserAccountService
{
    public string? GetUserId(ClaimsPrincipal principal)
    {
        return principal.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    public async Task<UserProfileDto?> GetProfileAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        return user is null ? null : ToProfileDto(user);
    }

    public async Task<bool> UpdateProfileAsync(string userId, UpdateUserProfileRequest request)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return false;
        }

        user.DisplayName = request.DisplayName;
        return (await userManager.UpdateAsync(user)).Succeeded;
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return false;
        }

        return (await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword)).Succeeded;
    }

    public async Task<bool> ChangeEmailAsync(string userId, ChangeEmailRequest request)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return false;
        }

        var token = await userManager.GenerateChangeEmailTokenAsync(user, request.NewEmail);
        var result = await userManager.ChangeEmailAsync(user, request.NewEmail, token);
        if (!result.Succeeded)
        {
            return false;
        }

        user.UserName = request.NewEmail;
        return (await userManager.UpdateAsync(user)).Succeeded;
    }

    public async Task<RotateApiKeyResponse?> RotateApiKeyAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        var apiKey = apiKeyService.GenerateApiKey();
        user.ApiKeyHash = apiKeyService.HashApiKey(apiKey);
        user.ApiKeyCreatedAtUtc = DateTimeOffset.UtcNow;

        return (await userManager.UpdateAsync(user)).Succeeded ? new RotateApiKeyResponse(apiKey) : null;
    }

    public async Task<IReadOnlyList<AdminUserDto>> GetUsersAsync()
    {
        var users = userManager.Users.OrderBy(user => user.Email).ToList();
        var dtos = new List<AdminUserDto>(users.Count);

        foreach (var user in users)
        {
            dtos.Add(await ToAdminDtoAsync(user));
        }

        return dtos;
    }

    public async Task<AdminUserDto?> GetUserAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        return user is null ? null : await ToAdminDtoAsync(user);
    }

    public async Task<bool> SuspendUserAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return false;
        }

        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
        return (await userManager.UpdateAsync(user)).Succeeded;
    }

    public async Task<bool> UnsuspendUserAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return false;
        }

        user.LockoutEnd = null;
        return (await userManager.UpdateAsync(user)).Succeeded;
    }

    public async Task<bool> DeleteUserAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        return user is not null && (await userManager.DeleteAsync(user)).Succeeded;
    }

    private static UserProfileDto ToProfileDto(ApplicationUser user)
    {
        return new UserProfileDto(user.Email ?? string.Empty, user.DisplayName, user.MemberSinceUtc);
    }

    private async Task<AdminUserDto> ToAdminDtoAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new AdminUserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            user.MemberSinceUtc,
            user.EmailConfirmed,
            user.LockoutEnd is not null && user.LockoutEnd > DateTimeOffset.UtcNow,
            roles.ToList());
    }
}
