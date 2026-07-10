using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FootballResults.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthExtensions.AdminPolicy)]
[Route("api/admin/users")]
public sealed class AdminUsersController(IUserAccountService userAccountService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminUserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> GetUsers()
    {
        return Ok(await userAccountService.GetUsersAsync());
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserDto>> GetUser(string id)
    {
        var user = await userAccountService.GetUserAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost("{id}/suspend")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SuspendUser(string id)
    {
        return await userAccountService.SuspendUserAsync(id) ? NoContent() : NotFound();
    }

    [HttpPost("{id}/unsuspend")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnsuspendUser(string id)
    {
        return await userAccountService.UnsuspendUserAsync(id) ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(string id)
    {
        return await userAccountService.DeleteUserAsync(id) ? NoContent() : NotFound();
    }
}
