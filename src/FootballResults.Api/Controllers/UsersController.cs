using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
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
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(UpdateUserProfileRequest request)
    {
        var userId = userAccountService.GetUserId(User);
        return userId is not null && await userAccountService.UpdateProfileAsync(userId, request)
            ? NoContent()
            : NotFound();
    }

    [HttpPost("me/change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userId = userAccountService.GetUserId(User);
        return userId is not null && await userAccountService.ChangePasswordAsync(userId, request)
            ? NoContent()
            : BadRequest();
    }

    [HttpPost("me/change-email")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangeEmail(ChangeEmailRequest request)
    {
        var userId = userAccountService.GetUserId(User);
        return userId is not null && await userAccountService.ChangeEmailAsync(userId, request)
            ? NoContent()
            : BadRequest();
    }

    [HttpPost("me/rotate-api-key")]
    [ProducesResponseType(typeof(RotateApiKeyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RotateApiKeyResponse>> RotateApiKey()
    {
        var userId = userAccountService.GetUserId(User);
        var response = userId is null ? null : await userAccountService.RotateApiKeyAsync(userId);
        return response is null ? NotFound() : Ok(response);
    }
}
