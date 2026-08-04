using System.Globalization;
using FootballResults.Api.Repository.Services;

namespace FootballResults.Api.Middleware;

public sealed class ApiKeyRateLimitingMiddleware(
    RequestDelegate next,
    ApiKeyRateLimitStore rateLimitStore)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!ShouldRateLimit(context))
        {
            await next(context);
            return;
        }

        var apiKey = context.Request.Headers[ApiKeyAuthenticationDefaults.HeaderName].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            await next(context);
            return;
        }

        var result = rateLimitStore.Check(apiKey, DateTimeOffset.UtcNow);
        WriteRateLimitHeaders(context.Response, result);

        if (result.IsAllowed)
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.Response.WriteAsJsonAsync(
            new
            {
                message = "Too many requests. Please retry after the rate limit window resets.",
                limit = result.PermitLimit,
                retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(result.RetryAfter.TotalSeconds)),
                resetAtUtc = result.ResetAtUtc
            },
            context.RequestAborted);
    }

    private static bool ShouldRateLimit(HttpContext context)
    {
        return HttpMethods.IsOptions(context.Request.Method) is false
            && context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
            && context.Request.Headers.ContainsKey(ApiKeyAuthenticationDefaults.HeaderName);
    }

    private static void WriteRateLimitHeaders(HttpResponse response, ApiKeyRateLimitResult result)
    {
        response.Headers["X-RateLimit-Limit"] = result.PermitLimit.ToString(CultureInfo.InvariantCulture);
        response.Headers["X-RateLimit-Remaining"] = result.Remaining.ToString(CultureInfo.InvariantCulture);
        response.Headers["X-RateLimit-Reset"] = result.ResetAtUtc.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        response.Headers["X-RateLimit-Reset-UTC"] = result.ResetAtUtc.ToString("O", CultureInfo.InvariantCulture);

        if (!result.IsAllowed)
        {
            response.Headers["Retry-After"] = Math.Max(1, (int)Math.Ceiling(result.RetryAfter.TotalSeconds))
                .ToString(CultureInfo.InvariantCulture);
        }
    }
}
