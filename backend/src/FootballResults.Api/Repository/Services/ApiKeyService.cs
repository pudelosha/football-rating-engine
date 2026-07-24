using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace FootballResults.Api.Repository.Services;

public sealed class ApiKeyService(UserManager<ApplicationUser> userManager) : IApiKeyService
{
    public string GenerateApiKey()
    {
        return $"fr_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=')}";
    }

    public string HashApiKey(string apiKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(apiKey));
        return Convert.ToHexString(bytes);
    }

    public async Task<ApplicationUser?> FindUserByApiKeyAsync(string apiKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }

        var hash = HashApiKey(apiKey.Trim());
        return await userManager.Users.FirstOrDefaultAsync(user => user.ApiKeyHash == hash, cancellationToken);
    }
}
