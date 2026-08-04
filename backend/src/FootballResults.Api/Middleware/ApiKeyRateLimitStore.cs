using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace FootballResults.Api.Middleware;

public sealed record ApiKeyRateLimitResult(
    bool IsAllowed,
    int PermitLimit,
    int Remaining,
    DateTimeOffset ResetAtUtc,
    TimeSpan RetryAfter);

public sealed class ApiKeyRateLimitStore(IOptions<ApiKeyRateLimitOptions> options)
{
    private readonly ConcurrentDictionary<string, ApiKeyRateLimitWindow> windows = new();

    public ApiKeyRateLimitResult Check(string apiKey, DateTimeOffset nowUtc)
    {
        var limit = Math.Max(1, options.Value.PermitLimit);
        var window = TimeSpan.FromSeconds(Math.Max(1, options.Value.WindowSeconds));
        var partitionKey = HashPartitionKey(apiKey);
        var rateWindow = windows.GetOrAdd(partitionKey, _ => new ApiKeyRateLimitWindow(nowUtc.Add(window)));

        lock (rateWindow)
        {
            if (nowUtc >= rateWindow.ResetAtUtc)
            {
                rateWindow.RequestCount = 0;
                rateWindow.ResetAtUtc = nowUtc.Add(window);
            }

            if (rateWindow.RequestCount >= limit)
            {
                return new ApiKeyRateLimitResult(
                    false,
                    limit,
                    0,
                    rateWindow.ResetAtUtc,
                    rateWindow.ResetAtUtc - nowUtc);
            }

            rateWindow.RequestCount++;
            return new ApiKeyRateLimitResult(
                true,
                limit,
                limit - rateWindow.RequestCount,
                rateWindow.ResetAtUtc,
                TimeSpan.Zero);
        }
    }

    private static string HashPartitionKey(string apiKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(apiKey.Trim()));
        return Convert.ToHexString(bytes);
    }

    private sealed class ApiKeyRateLimitWindow(DateTimeOffset resetAtUtc)
    {
        public int RequestCount { get; set; }
        public DateTimeOffset ResetAtUtc { get; set; } = resetAtUtc;
    }
}
