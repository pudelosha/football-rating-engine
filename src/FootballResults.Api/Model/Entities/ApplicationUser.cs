using Microsoft.AspNetCore.Identity;

namespace FootballResults.Api.Model.Entities;

public sealed class ApplicationUser : IdentityUser
{
    public DateTimeOffset MemberSinceUtc { get; set; } = DateTimeOffset.UtcNow;
    public string? DisplayName { get; set; }
    public string ApiKeyHash { get; set; } = string.Empty;
    public DateTimeOffset ApiKeyCreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
