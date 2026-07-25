using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.UserPolicy)]
[Route("api/users")]
public sealed class UsersController(IUserAccountService userAccountService) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = userAccountService.GetUserId(User);
        var profile = userId is null ? null : await userAccountService.GetProfileAsync(userId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("me")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AuthActionResponse>> UpdateProfile(UpdateUserProfileRequest request)
    {
        var userId = userAccountService.GetUserId(User);
        if (userId is null)
        {
            return NotFound(new AuthActionResponse(false, AuthText.Message("UserNotFound", request.Language)));
        }

        return await userAccountService.UpdateProfileAsync(userId, request)
            ? Ok(new AuthActionResponse(true, AuthText.Message("ProfileUpdated", request.Language)))
            : BadRequest(new AuthActionResponse(false, AuthText.Message("ProfileUpdateFailed", request.Language)));
    }

    [HttpPost("me/change-password")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthActionResponse>> ChangePassword(ChangePasswordRequest request)
    {
        var userId = userAccountService.GetUserId(User);
        return userId is not null && await userAccountService.ChangePasswordAsync(userId, request)
            ? Ok(new AuthActionResponse(true, AuthText.Message("PasswordChanged", request.Language)))
            : BadRequest(new AuthActionResponse(false, AuthText.Message("PasswordChangeFailed", request.Language)));
    }

    [HttpPost("me/change-email")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthActionResponse>> ChangeEmail(ChangeEmailRequest request)
    {
        var userId = userAccountService.GetUserId(User);
        return userId is not null && await userAccountService.ChangeEmailAsync(userId, request)
            ? Ok(new AuthActionResponse(true, AuthText.Message("EmailChanged", request.Language)))
            : BadRequest(new AuthActionResponse(false, AuthText.Message("EmailChangeFailed", request.Language)));
    }

    [HttpPost("me/rotate-api-key")]
    [ProducesResponseType(typeof(RotateApiKeyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RotateApiKeyResponse>> RotateApiKey(string? language = null)
    {
        var userId = userAccountService.GetUserId(User);
        var response = userId is null ? null : await userAccountService.RotateApiKeyAsync(userId);
        return response is null
            ? NotFound(new AuthActionResponse(false, AuthText.Message("ApiKeyRotateFailed", language)))
            : Ok(response with { Message = AuthText.Message("ApiKeyRotated", language) });
    }
}
