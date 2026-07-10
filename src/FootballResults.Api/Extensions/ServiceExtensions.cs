using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;

namespace FootballResults.Api.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<TournamentSyncOptions>(configuration.GetSection("TournamentSync"));

        services.AddScoped<IHealthService, HealthService>();
        services.AddHttpClient<ILiveScoreTournamentDiscoveryService, LiveScoreTournamentDiscoveryService>(client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36");
            client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en-US,en;q=0.9");
        });
        services.AddHttpClient<ILiveScoreClient, LiveScoreClient>(client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36");
            client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en-US,en;q=0.9");
        });
        services.AddScoped<ITournamentCreationService, TournamentCreationService>();
        services.AddScoped<ITournamentQueryService, TournamentQueryService>();
        services.AddScoped<IMatchQueryService, MatchQueryService>();
        services.AddScoped<ITournamentSyncService, TournamentSyncService>();
        services.AddScoped<IBaseEloRatingService, BaseEloRatingService>();
        services.AddScoped<IFormRatingService, FormRatingService>();
        services.AddScoped<IPerformanceRatingService, PerformanceRatingService>();
        services.AddScoped<IApiKeyService, ApiKeyService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserAccountService, UserAccountService>();

        services.AddHostedService<TournamentScheduleSyncHostedService>();
        services.AddHostedService<LiveMatchSyncHostedService>();
        services.AddHostedService<MatchFinalizationHostedService>();
        services.AddHostedService<ResultsReconciliationHostedService>();

        return services;
    }
}
