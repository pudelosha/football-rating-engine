using FootballResults.Api.DTOs;
using FootballResults.Api.Tests.Support;
using System.Net;
using System.Net.Http.Json;

namespace FootballResults.Api.Tests.Controllers;

public sealed class AuthorizationEndpointTests
{
    [Fact]
    public async Task Health_IsAnonymous()
    {
        await using var factory = new FootballResultsApiFactory();
        var response = await factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PublicReadEndpoint_RequiresValidApiKeyOrAdminJwt()
    {
        await using var factory = new FootballResultsApiFactory();
        await factory.SeedTournamentAsync();

        var anonymous = await factory.CreateClient().GetAsync("/api/tournaments");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var invalidKeyClient = factory.CreateClient();
        invalidKeyClient.DefaultRequestHeaders.Add("X-Api-Key", "bad-key");
        var invalidKey = await invalidKeyClient.GetAsync("/api/tournaments");
        Assert.Equal(HttpStatusCode.Unauthorized, invalidKey.StatusCode);

        var key = await factory.RegisterAndGetApiKeyAsync($"key-{Guid.NewGuid():N}@example.com");
        var keyClient = factory.CreateClient();
        keyClient.DefaultRequestHeaders.Add("X-Api-Key", key);
        var validKey = await keyClient.GetAsync("/api/tournaments");
        Assert.Equal(HttpStatusCode.OK, validKey.StatusCode);

        var adminClient = await factory.CreateAdminClientAsync();
        var admin = await adminClient.GetAsync("/api/tournaments");
        Assert.Equal(HttpStatusCode.OK, admin.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_RejectsAnonymousApiKeyAndUserJwt_ButAcceptsAdminJwt()
    {
        await using var factory = new FootballResultsApiFactory();

        var anonymous = await factory.CreateClient().PostAsJsonAsync("/api/tournaments/preview", PreviewRequest());
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var apiKey = await factory.RegisterAndGetApiKeyAsync($"key-admin-{Guid.NewGuid():N}@example.com");
        var keyClient = factory.CreateClient();
        keyClient.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
        var keyResponse = await keyClient.PostAsJsonAsync("/api/tournaments/preview", PreviewRequest());
        Assert.Equal(HttpStatusCode.Unauthorized, keyResponse.StatusCode);

        var (userClient, _) = await factory.CreateUserClientAsync($"normal-user-{Guid.NewGuid():N}@example.com");
        var userResponse = await userClient.PostAsJsonAsync("/api/tournaments/preview", PreviewRequest());
        Assert.Equal(HttpStatusCode.Forbidden, userResponse.StatusCode);

        var adminClient = await factory.CreateAdminClientAsync();
        var adminResponse = await adminClient.PostAsJsonAsync("/api/tournaments/preview", PreviewRequest());
        Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
    }

    [Fact]
    public async Task UserProfileEndpoint_RequiresUserJwt()
    {
        await using var factory = new FootballResultsApiFactory();

        var anonymous = await factory.CreateClient().GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var apiKey = await factory.RegisterAndGetApiKeyAsync($"profile-key-{Guid.NewGuid():N}@example.com");
        var keyClient = factory.CreateClient();
        keyClient.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
        var keyResponse = await keyClient.GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.Unauthorized, keyResponse.StatusCode);
    }

    private static CreateTournamentRequest PreviewRequest()
    {
        return new CreateTournamentRequest("https://www.livescore.com/en/football/international/world-cup-2026/fixtures/");
    }
}
