using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Interfaces;

public interface IApiKeyService
{
    string GenerateApiKey();
    string HashApiKey(string apiKey);
    Task<ApplicationUser?> FindUserByApiKeyAsync(string apiKey, CancellationToken cancellationToken);
}
