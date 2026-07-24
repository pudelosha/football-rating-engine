using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace FootballResults.Api.Tests.Support;

public sealed class FootballResultsApiFactory : WebApplicationFactory<Program>
{
    public const string AdminEmail = "pudel1985@gmail.com";
    public const string AdminPassword = "AdminPassword123!";
    public const string UserPassword = "UserPassword123!";

    private readonly string databaseName = $"FootballResultsTests_{Guid.NewGuid():N}";

    public FootballResultsApiFactory()
    {
        Environment.SetEnvironmentVariable("Testing__UseInMemoryDatabase", "true");
        Environment.SetEnvironmentVariable("Testing__InMemoryDatabaseName", databaseName);
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", string.Empty);
        Environment.SetEnvironmentVariable("Jwt__Key", "football-results-tests-jwt-signing-key-with-more-than-32-chars");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "FootballResults.Api.Tests");
        Environment.SetEnvironmentVariable("Jwt__Audience", "FootballResults.Api.Tests");
        Environment.SetEnvironmentVariable("Auth__AdminEmail", AdminEmail);
        Environment.SetEnvironmentVariable("Auth__AdminPassword", AdminPassword);
        Environment.SetEnvironmentVariable("EmailSettings__EnableSending", "false");
        Environment.SetEnvironmentVariable("TournamentSync__EnableScheduleSync", "false");
        Environment.SetEnvironmentVariable("TournamentSync__EnableLiveSync", "false");
        Environment.SetEnvironmentVariable("TournamentSync__EnableFinalizeSync", "false");
        Environment.SetEnvironmentVariable("TournamentSync__EnableResultsSync", "false");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = string.Empty,
                ["Jwt:Key"] = "football-results-tests-jwt-signing-key-with-more-than-32-chars",
                ["Jwt:Issuer"] = "FootballResults.Api.Tests",
                ["Jwt:Audience"] = "FootballResults.Api.Tests",
                ["Auth:AdminEmail"] = AdminEmail,
                ["Auth:AdminPassword"] = AdminPassword,
                ["EmailSettings:EnableSending"] = "false",
                ["Testing:UseInMemoryDatabase"] = "true",
                ["Testing:InMemoryDatabaseName"] = databaseName,
                ["TournamentSync:EnableScheduleSync"] = "false",
                ["TournamentSync:EnableLiveSync"] = "false",
                ["TournamentSync:EnableFinalizeSync"] = "false",
                ["TournamentSync:EnableResultsSync"] = "false"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IHostedService>();
            services.RemoveAll<ILiveScoreTournamentDiscoveryService>();
            services.RemoveAll<ITournamentCreationService>();
            services.RemoveAll<ITournamentSyncService>();
            services.AddScoped<ILiveScoreTournamentDiscoveryService, FakeLiveScoreTournamentDiscoveryService>();
            services.AddScoped<ITournamentCreationService, FakeTournamentCreationService>();
            services.AddScoped<ITournamentSyncService, FakeTournamentSyncService>();
        });
    }

    public async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(AdminEmail, AdminPassword));
        login.EnsureSuccessStatusCode();

        var response = await login.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", response!.Token);
        return client;
    }

    public async Task<(HttpClient Client, string ApiKey)> CreateUserClientAsync(string email)
    {
        var client = CreateClient();
        var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, UserPassword, "Test User"));
        register.EnsureSuccessStatusCode();

        var registerResponse = await register.Content.ReadFromJsonAsync<RegisterResponse>();
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, UserPassword));
        login.EnsureSuccessStatusCode();

        var loginResponse = await login.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResponse!.Token);

        return (client, registerResponse!.ApiKey!);
    }

    public async Task<string> RegisterAndGetApiKeyAsync(string email)
    {
        var client = CreateClient();
        var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, UserPassword, "Key User"));
        register.EnsureSuccessStatusCode();

        var response = await register.Content.ReadFromJsonAsync<RegisterResponse>();
        return response!.ApiKey!;
    }

    public async Task<int> SeedTournamentAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tournament = new Tournament
        {
            LiveScoreCompetitionId = $"comp-{Guid.NewGuid():N}",
            Name = "World Cup 2026",
            CompetitionName = "World Cup",
            CompetitionCountry = "International",
            CompetitionUrlName = "world-cup-2026",
            CategoryCode = "international",
            CategoryName = "International",
            CategoryTransliteratedName = "international",
            BaseUrl = $"https://www.livescore.com/test/{Guid.NewGuid():N}",
            FixturesUrl = "https://www.livescore.com/test/fixtures/",
            ResultsUrl = "https://www.livescore.com/test/results/",
            ApiBaseUrl = "https://prod-cdn-public-api.livescore.com/v1/api/app",
            Locale = "en",
            TimezoneOffset = "0",
            CreatedAtUtc = DateTimeOffset.UtcNow,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        var stage = new TournamentStage
        {
            Tournament = tournament,
            LiveScoreStageId = $"stage-{Guid.NewGuid():N}",
            Name = "Group Stage Group A",
            Code = "group-a",
            SortOrder = 1
        };

        var home = new Team
        {
            LiveScoreTeamId = $"home-{Guid.NewGuid():N}",
            Name = "France",
            Abbreviation = "FRA"
        };
        var away = new Team
        {
            LiveScoreTeamId = $"away-{Guid.NewGuid():N}",
            Name = "Morocco",
            Abbreviation = "MAR"
        };

        dbContext.Tournaments.Add(tournament);
        dbContext.TournamentStages.Add(stage);
        dbContext.Teams.AddRange(home, away);
        dbContext.TournamentTeams.AddRange(
            new TournamentTeam { Tournament = tournament, Team = home },
            new TournamentTeam { Tournament = tournament, Team = away });
        dbContext.Matches.AddRange(
            new Match
            {
                Tournament = tournament,
                Stage = stage,
                HomeTeam = home,
                AwayTeam = away,
                LiveScoreEventId = $"finished-{Guid.NewGuid():N}",
                HomeTeamNameSnapshot = home.Name,
                AwayTeamNameSnapshot = away.Name,
                HomeTeamAbbrSnapshot = home.Abbreviation,
                AwayTeamAbbrSnapshot = away.Abbreviation,
                KickoffUtc = DateTimeOffset.UtcNow.AddDays(-1),
                HomeScore = 2,
                AwayScore = 1,
                Status = MatchStatus.Finished,
                RawStatus = "FT",
                SyncState = MatchSyncState.Finalized,
                RoundInfo = "Group Stage Group A",
                MatchUrl = "https://www.livescore.com/hidden",
                LastSeenInListType = LiveScoreListType.Results,
                LastSyncedAtUtc = DateTimeOffset.UtcNow
            },
            new Match
            {
                Tournament = tournament,
                Stage = stage,
                HomeTeam = home,
                AwayTeam = away,
                LiveScoreEventId = $"live-{Guid.NewGuid():N}",
                HomeTeamNameSnapshot = home.Name,
                AwayTeamNameSnapshot = away.Name,
                HomeTeamAbbrSnapshot = home.Abbreviation,
                AwayTeamAbbrSnapshot = away.Abbreviation,
                KickoffUtc = DateTimeOffset.UtcNow.AddMinutes(-10),
                Status = MatchStatus.Live,
                RawStatus = "45'",
                SyncState = MatchSyncState.Live,
                RoundInfo = "Group Stage Group A",
                MatchUrl = "https://www.livescore.com/hidden-live",
                LastSeenInListType = LiveScoreListType.Fixtures,
                LastSyncedAtUtc = DateTimeOffset.UtcNow
            },
            new Match
            {
                Tournament = tournament,
                Stage = stage,
                HomeTeam = home,
                AwayTeam = away,
                LiveScoreEventId = $"upcoming-{Guid.NewGuid():N}",
                HomeTeamNameSnapshot = home.Name,
                AwayTeamNameSnapshot = away.Name,
                HomeTeamAbbrSnapshot = home.Abbreviation,
                AwayTeamAbbrSnapshot = away.Abbreviation,
                KickoffUtc = DateTimeOffset.UtcNow.AddDays(2),
                Status = MatchStatus.Upcoming,
                RawStatus = "NS",
                SyncState = MatchSyncState.Scheduled,
                RoundInfo = "Group Stage Group A",
                MatchUrl = "https://www.livescore.com/hidden-upcoming",
                LastSeenInListType = LiveScoreListType.Fixtures,
                LastSyncedAtUtc = DateTimeOffset.UtcNow
            });

        await dbContext.SaveChangesAsync();
        return tournament.Id;
    }

    private sealed class FakeLiveScoreTournamentDiscoveryService : ILiveScoreTournamentDiscoveryService
    {
        public Task<TournamentPreviewDto> PreviewAsync(
            string liveScoreUrl,
            string locale,
            string timezoneOffset,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new TournamentPreviewDto(
                "World Cup 2026",
                "World Cup",
                "International",
                "international",
                "International",
                "international",
                locale,
                timezoneOffset));
        }

        public Task<LiveScoreTournamentDiscoveryResult> DiscoverAsync(
            string liveScoreUrl,
            string locale,
            string timezoneOffset,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new LiveScoreTournamentDiscoveryResult(
                $"comp-{Guid.NewGuid():N}",
                "World Cup 2026",
                "World Cup",
                "International",
                "world-cup-2026",
                "international",
                "International",
                "international",
                liveScoreUrl,
                $"{liveScoreUrl.TrimEnd('/')}/fixtures/",
                $"{liveScoreUrl.TrimEnd('/')}/results/",
                "https://prod-cdn-public-api.livescore.com/v1/api/app",
                locale,
                timezoneOffset));
        }
    }

    private sealed class FakeTournamentCreationService : ITournamentCreationService
    {
        public Task<TournamentDetailsDto> CreateAsync(CreateTournamentRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new TournamentDetailsDto(
                123,
                request.Name ?? "World Cup 2026",
                "World Cup",
                "International",
                "international",
                "International",
                "international",
                request.Locale,
                request.TimezoneOffset,
                DateTimeOffset.UtcNow,
                DateTimeOffset.UtcNow,
                DateTimeOffset.UtcNow,
                [],
                []));
        }
    }

    private sealed class FakeTournamentSyncService : ITournamentSyncService
    {
        public Task<SyncTournamentResponse> SyncAsync(int tournamentId, TournamentSyncMode mode, CancellationToken cancellationToken)
        {
            return Task.FromResult(new SyncTournamentResponse(
                77,
                tournamentId,
                mode,
                TournamentSyncRunStatus.Succeeded,
                1,
                2,
                3,
                string.Empty));
        }

        public Task<IReadOnlyList<TournamentSyncRunDto>> GetTournamentSyncRunsAsync(int tournamentId, CancellationToken cancellationToken)
        {
            IReadOnlyList<TournamentSyncRunDto> runs =
            [
                new TournamentSyncRunDto(77, tournamentId, TournamentSyncMode.Full, TournamentSyncRunStatus.Succeeded, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, 1, 2, 3, string.Empty)
            ];
            return Task.FromResult(runs);
        }

        public Task<TournamentSyncRunDto?> GetSyncRunAsync(int syncRunId, CancellationToken cancellationToken)
        {
            return Task.FromResult<TournamentSyncRunDto?>(new TournamentSyncRunDto(syncRunId, 1, TournamentSyncMode.Full, TournamentSyncRunStatus.Succeeded, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, 1, 2, 3, string.Empty));
        }
    }
}
