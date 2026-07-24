using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Tests.Support;
using System.Net;
using System.Net.Http.Json;

namespace FootballResults.Api.Tests.Controllers;

public sealed class AdminEndpointTests
{
    [Fact]
    public async Task Admin_CanPreviewCreateUpdateAndDeleteTournament()
    {
        await using var factory = new FootballResultsApiFactory();
        var tournamentId = await factory.SeedTournamentAsync();
        var client = await factory.CreateAdminClientAsync();

        var preview = await client.PostAsJsonAsync("/api/tournaments/preview", Request());
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);

        var create = await client.PostAsJsonAsync("/api/tournaments", Request());
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var update = await client.PutAsJsonAsync($"/api/tournaments/{tournamentId}", new UpdateTournamentRequest("Updated Cup", "en", "0"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var delete = await client.DeleteAsync($"/api/tournaments/{tournamentId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    [Theory]
    [InlineData("/api/tournaments/1/sync/full", TournamentSyncMode.Full)]
    [InlineData("/api/tournaments/1/sync/schedule", TournamentSyncMode.Schedule)]
    [InlineData("/api/tournaments/1/sync/live", TournamentSyncMode.Live)]
    [InlineData("/api/tournaments/1/sync/finalize", TournamentSyncMode.Finalize)]
    [InlineData("/api/tournaments/1/sync/results", TournamentSyncMode.Results)]
    public async Task Admin_CanRunSyncEndpoints(string path, TournamentSyncMode expectedMode)
    {
        await using var factory = new FootballResultsApiFactory();
        var client = await factory.CreateAdminClientAsync();

        var response = await client.PostAsync(path, null);
        var sync = await response.Content.ReadFromJsonAsync<SyncTournamentResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(expectedMode, sync!.Mode);
    }

    [Fact]
    public async Task Admin_CanReadSyncRuns()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = await factory.CreateAdminClientAsync();

        var runs = await client.GetFromJsonAsync<IReadOnlyList<TournamentSyncRunDto>>("/api/tournaments/1/sync-runs");
        var run = await client.GetFromJsonAsync<TournamentSyncRunDto>("/api/tournament-sync-runs/77");

        Assert.Single(runs!);
        Assert.Equal(77, run!.Id);
    }

    [Fact]
    public async Task Admin_CanManageUsers()
    {
        await using var factory = new FootballResultsApiFactory();
        await factory.CreateUserClientAsync($"managed-{Guid.NewGuid():N}@example.com");
        var adminClient = await factory.CreateAdminClientAsync();

        var users = await adminClient.GetFromJsonAsync<IReadOnlyList<AdminUserDto>>("/api/admin/users");
        Assert.True(users!.Count >= 2);

        var managedUser = users.First(user => user.Roles.Contains("User"));
        var get = await adminClient.GetAsync($"/api/admin/users/{managedUser.Id}");
        var suspend = await adminClient.PostAsync($"/api/admin/users/{managedUser.Id}/suspend", null);
        var unsuspend = await adminClient.PostAsync($"/api/admin/users/{managedUser.Id}/unsuspend", null);
        var delete = await adminClient.DeleteAsync($"/api/admin/users/{managedUser.Id}");

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, suspend.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, unsuspend.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    private static CreateTournamentRequest Request()
    {
        return new CreateTournamentRequest("https://www.livescore.com/en/football/international/world-cup-2026/fixtures/");
    }
}
