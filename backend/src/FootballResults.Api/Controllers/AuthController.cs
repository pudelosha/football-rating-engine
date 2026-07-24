using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request)
    {
        var response = await authService.RegisterAsync(request);
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var response = await authService.LoginAsync(request);
        return response.Success ? Ok(response) : Unauthorized(response);
    }

    [HttpPost("confirm-email")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthActionResponse>> ConfirmEmail(string userId, string token)
    {
        var response = await authService.ConfirmEmailAsync(userId, token);
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("confirm-email")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthActionResponse>> ConfirmEmailFromLink(string userId, string token)
    {
        var response = await authService.ConfirmEmailAsync(userId, token);
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [HttpPost("resend-confirmation-email")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthActionResponse>> ResendConfirmationEmail(ResendConfirmationEmailRequest request)
    {
        return Ok(await authService.ResendConfirmationEmailAsync(request));
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ForgotPasswordResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword(ForgotPasswordRequest request)
    {
        return Ok(await authService.ForgotPasswordAsync(request));
    }

    [HttpPost("request-password-reset")]
    [ProducesResponseType(typeof(ForgotPasswordResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ForgotPasswordResponse>> RequestPasswordReset(ForgotPasswordRequest request)
    {
        return Ok(await authService.ForgotPasswordAsync(request));
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthActionResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthActionResponse>> ResetPassword(ResetPasswordRequest request)
    {
        var response = await authService.ResetPasswordAsync(request);
        return response.Success ? Ok(response) : BadRequest(response);
    }
}
