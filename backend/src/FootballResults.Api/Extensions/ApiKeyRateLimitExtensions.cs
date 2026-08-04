using FootballResults.Api.Middleware;

namespace FootballResults.Api.Extensions;

public static class ApiKeyRateLimitExtensions
{
    public static IServiceCollection AddApiKeyRateLimiting(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<ApiKeyRateLimitOptions>(configuration.GetSection("ApiKeyRateLimit"));
        services.AddSingleton<ApiKeyRateLimitStore>();
        return services;
    }

    public static IApplicationBuilder UseApiKeyRateLimiting(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ApiKeyRateLimitingMiddleware>();
    }
}
