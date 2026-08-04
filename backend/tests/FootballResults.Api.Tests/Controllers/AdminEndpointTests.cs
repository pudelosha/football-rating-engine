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

        var update = await client.PutAsJsonAsync($"/api/tournaments/{tournamentId}", new UpdateTournamentRequest("Updated Cup", "2026", true, true, null, "International", "en", "0"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updatedTournament = await update.Content.ReadFromJsonAsync<TournamentDetailsDto>();
        Assert.Equal("International", updatedTournament!.CompetitionCountry);

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
    public async Task Admin_CanUpdateTeam()
    {
        await using var factory = new FootballResultsApiFactory();
        var tournamentId = await factory.SeedTournamentAsync();
        var client = await factory.CreateAdminClientAsync();
        var teams = await client.GetFromJsonAsync<IReadOnlyList<TeamDto>>($"/api/tournaments/{tournamentId}/teams");
        var team = teams!.First();

        var response = await client.PutAsJsonAsync($"/api/teams/{team.Id}", new UpdateTeamRequest("Updated Team", "UPD"));
        var updated = await response.Content.ReadFromJsonAsync<TeamDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Updated Team", updated!.Name);
        Assert.Equal("UPD", updated.Abbreviation);
    }

    [Fact]
    public async Task Admin_CanDisableTeamVisibility_WithoutRemovingTournamentAssignment()
    {
        await using var factory = new FootballResultsApiFactory();
        var tournamentId = await factory.SeedTournamentAsync();
        var client = await factory.CreateAdminClientAsync();
        var teams = await client.GetFromJsonAsync<IReadOnlyList<TeamDto>>($"/api/tournaments/{tournamentId}/teams");
        var team = teams!.First();

        var response = await client.PutAsJsonAsync($"/api/teams/{team.Id}", new UpdateTeamRequest(team.Name, team.Abbreviation, false));
        var updated = await response.Content.ReadFromJsonAsync<TeamDto>();
        var publicTeams = await client.GetFromJsonAsync<IReadOnlyList<TeamDto>>("/api/teams");
        var adminTeams = await client.GetFromJsonAsync<IReadOnlyList<AdminTeamDto>>("/api/admin/teams");
        var adminTeam = adminTeams!.Single(adminTeam => adminTeam.Id == team.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(updated!.IsEnabled);
        Assert.DoesNotContain(publicTeams!, publicTeam => publicTeam.Id == team.Id);
        Assert.False(adminTeam.IsEnabled);
        Assert.Contains(adminTeam.TournamentAssignments, assignment => assignment.TournamentId == tournamentId);
    }

    [Fact]
    public async Task Admin_CanUpdateMatch()
    {
        await using var factory = new FootballResultsApiFactory();
        var tournamentId = await factory.SeedTournamentAsync();
        var client = await factory.CreateAdminClientAsync();
        var matches = await client.GetFromJsonAsync<IReadOnlyList<MatchDto>>($"/api/tournaments/{tournamentId}/matches");
        var match = matches!.First();

        var response = await client.PutAsJsonAsync(
            $"/api/tournaments/{tournamentId}/matches/{match.Id}",
            new UpdateMatchRequest(
                match.StageId,
                match.KickoffUtc,
                3,
                1,
                2,
                1,
                null,
                null,
                null,
                null,
                MatchStatus.Finished,
                "FT",
                MatchSyncState.Finalized,
                "Admin Round"));
        var updated = await response.Content.ReadFromJsonAsync<MatchDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Admin Round", updated!.RoundInfo);
        Assert.Equal(3, updated.HomeScore);
        Assert.Equal(MatchStatus.Finished, updated.Status);
    }

    [Fact]
    public async Task Admin_CanUpdateTournamentRatingSetup()
    {
        await using var factory = new FootballResultsApiFactory();
        var tournamentId = await factory.SeedTournamentAsync();
        var client = await factory.CreateAdminClientAsync();

        var response = await client.PutAsJsonAsync(
            $"/api/tournaments/{tournamentId}/rating-setup",
            new UpdateTournamentRatingSetupRequest(false, true, false, -4));
        var updated = await response.Content.ReadFromJsonAsync<TournamentRatingSetupDto>();
        var fetched = await client.GetFromJsonAsync<TournamentRatingSetupDto>($"/api/tournaments/{tournamentId}/rating-setup");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(updated!.IncludeForm);
        Assert.True(updated.IncludePerformance);
        Assert.False(updated.IncludeSquad);
        Assert.Equal(-4, updated.SnapshotStartSeasonOffset);
        Assert.Equal(updated, fetched);
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

    [Fact]
    public async Task Admin_CanAcceptDataQualityIssue_AndHideItFromIssueList()
    {
        await using var factory = new FootballResultsApiFactory();
        await factory.SeedTournamentAsync();
        var client = await factory.CreateAdminClientAsync();

        var issues = await client.GetFromJsonAsync<IReadOnlyList<DataQualityIssueDto>>("/api/admin/data-quality/tournament-checks/match-statistics/issues");
        var issue = Assert.Single(issues!);

        var accept = await client.PostAsJsonAsync(
            "/api/admin/data-quality/tournament-checks/match-statistics/accepted-issues",
            new AcceptDataQualityIssuesRequest(
                [new AcceptDataQualityIssueRequest(issue.Key, issue.EntityType, issue.EntityId, issue.Issue)],
                "Accepted missing provider data in test."));

        Assert.Equal(HttpStatusCode.NoContent, accept.StatusCode);

        var remainingIssues = await client.GetFromJsonAsync<IReadOnlyList<DataQualityIssueDto>>("/api/admin/data-quality/tournament-checks/match-statistics/issues");
        Assert.DoesNotContain(
            remainingIssues!,
            remaining => remaining.EntityId == issue.EntityId && remaining.Issue == issue.Issue);
    }

    private static CreateTournamentRequest Request()
    {
        return new CreateTournamentRequest("https://www.livescore.com/en/football/international/world-cup-2026/fixtures/");
    }
}
