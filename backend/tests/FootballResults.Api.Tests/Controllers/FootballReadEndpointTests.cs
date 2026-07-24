using FootballResults.Api.DTOs;
using FootballResults.Api.Tests.Support;
using System.Net;
using System.Net.Http.Json;

namespace FootballResults.Api.Tests.Controllers;

public sealed class FootballReadEndpointTests
{
    [Fact]
    public async Task TournamentReadEndpoints_ReturnExpectedPublicData_WithApiKey()
    {
        await using var factory = new FootballResultsApiFactory();
        var tournamentId = await factory.SeedTournamentAsync();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", await factory.RegisterAndGetApiKeyAsync($"reads-{Guid.NewGuid():N}@example.com"));

        var tournaments = await client.GetFromJsonAsync<IReadOnlyList<TournamentSummaryDto>>("/api/tournaments");
        Assert.Single(tournaments!);
        Assert.Equal("World Cup 2026", tournaments![0].Name);

        var tournament = await client.GetFromJsonAsync<TournamentDetailsDto>($"/api/tournaments/{tournamentId}");
        Assert.Equal("World Cup 2026", tournament!.Name);
        Assert.Equal(2, tournament.Teams.Count);
        Assert.Single(tournament.Stages);

        var matches = await client.GetFromJsonAsync<IReadOnlyList<MatchDto>>($"/api/tournaments/{tournamentId}/matches");
        Assert.Equal(3, matches!.Count);

        var match = await client.GetFromJsonAsync<MatchDto>($"/api/tournaments/{tournamentId}/matches/{matches[0].Id}");
        Assert.Equal(tournamentId, match!.TournamentId);

        var results = await client.GetFromJsonAsync<IReadOnlyList<MatchDto>>($"/api/tournaments/{tournamentId}/matches/results");
        Assert.Single(results!);

        var live = await client.GetFromJsonAsync<IReadOnlyList<MatchDto>>($"/api/tournaments/{tournamentId}/matches/live");
        Assert.Single(live!);

        var upcoming = await client.GetFromJsonAsync<IReadOnlyList<MatchDto>>($"/api/tournaments/{tournamentId}/matches/upcoming");
        Assert.Single(upcoming!);

        var tournamentTeams = await client.GetFromJsonAsync<IReadOnlyList<TeamDto>>($"/api/tournaments/{tournamentId}/teams");
        Assert.Equal(2, tournamentTeams!.Count);
    }

    [Fact]
    public async Task TeamEndpoints_ReturnPublicTeamDtos_WithApiKey()
    {
        await using var factory = new FootballResultsApiFactory();
        await factory.SeedTournamentAsync();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", await factory.RegisterAndGetApiKeyAsync($"teams-{Guid.NewGuid():N}@example.com"));

        var teams = await client.GetFromJsonAsync<IReadOnlyList<TeamDto>>("/api/teams");
        Assert.Equal(2, teams!.Count);

        var team = await client.GetAsync($"/api/teams/{teams[0].Id}");
        Assert.Equal(HttpStatusCode.OK, team.StatusCode);

        var missing = await client.GetAsync("/api/teams/999999");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task TournamentMissingResources_ReturnNotFound_WithApiKey()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", await factory.RegisterAndGetApiKeyAsync($"missing-{Guid.NewGuid():N}@example.com"));

        var tournament = await client.GetAsync("/api/tournaments/999999");
        var match = await client.GetAsync("/api/tournaments/999999/matches/999999");

        Assert.Equal(HttpStatusCode.NotFound, tournament.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, match.StatusCode);
    }
}
