using System.Text.Json;
using System.Text.RegularExpressions;
using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;

namespace FootballResults.Api.Repository.Services;

public sealed partial class LiveScoreTournamentDiscoveryService(HttpClient httpClient) : ILiveScoreTournamentDiscoveryService
{
    private const string DefaultApiBaseUrl = "https://prod-cdn-public-api.livescore.com";

    public async Task<TournamentPreviewDto> PreviewAsync(
        string liveScoreUrl,
        string locale,
        string timezoneOffset,
        CancellationToken cancellationToken)
    {
        var discovery = await DiscoverAsync(liveScoreUrl, locale, timezoneOffset, cancellationToken);
        return discovery.ToPublicPreview();
    }

    public async Task<LiveScoreTournamentDiscoveryResult> DiscoverAsync(
        string liveScoreUrl,
        string locale,
        string timezoneOffset,
        CancellationToken cancellationToken)
    {
        var baseUrl = NormalizeCompetitionUrl(liveScoreUrl);
        var html = await httpClient.GetStringAsync(baseUrl + "fixtures/", cancellationToken);
        var runtimeConfig = ExtractRuntimeConfig(html);
        var nextData = ExtractNextData(html);
        var apiBaseUrl = runtimeConfig.TryGetValue("PUBLIC_API_URL", out var configuredApiUrl)
            ? configuredApiUrl
            : DefaultApiBaseUrl;

        var competitionId =
            FindFirstString(nextData.RootElement, "competitionId").OrDefault(FindFirstString(nextData.RootElement, "CompId"));
        competitionId = competitionId.OrDefault(FindFirstString(nextData.RootElement, "id"));
        var competitionName = FindFirstString(nextData.RootElement, "CompN", "Cnm");
        var competitionCountry = FindFirstString(nextData.RootElement, "CompD");
        var competitionUrlName = FindFirstString(nextData.RootElement, "CompUrlName");
        var categoryCode = FindFirstString(nextData.RootElement, "Ccd");
        var categoryName = FindFirstString(nextData.RootElement, "Cnm");
        var categoryTransliteratedName = FindFirstString(nextData.RootElement, "CnmT");
        var detectedLocale = FindFirstString(nextData.RootElement, "locale");
        var urlSlug = baseUrl.TrimEnd('/').Split('/').LastOrDefault() ?? string.Empty;

        competitionName = string.IsNullOrWhiteSpace(competitionName) ? HumanizeSlug(urlSlug) : competitionName;
        categoryName = string.IsNullOrWhiteSpace(categoryName) ? competitionName : categoryName;

        return new LiveScoreTournamentDiscoveryResult(
            LiveScoreCompetitionId: competitionId,
            Name: categoryName,
            CompetitionName: competitionName,
            CompetitionCountry: competitionCountry,
            CompetitionUrlName: string.IsNullOrWhiteSpace(competitionUrlName) ? urlSlug : competitionUrlName,
            CategoryCode: categoryCode,
            CategoryName: categoryName,
            CategoryTransliteratedName: categoryTransliteratedName,
            BaseUrl: baseUrl,
            FixturesUrl: baseUrl + "fixtures/",
            ResultsUrl: baseUrl + "results/",
            ApiBaseUrl: apiBaseUrl,
            Locale: string.IsNullOrWhiteSpace(locale) ? detectedLocale.OrDefault("en") : locale,
            TimezoneOffset: string.IsNullOrWhiteSpace(timezoneOffset) ? "0" : timezoneOffset);
    }

    public static string NormalizeCompetitionUrl(string url)
    {
        var normalized = url.Trim();
        foreach (var suffix in new[] { "/fixtures/", "/results/", "/fixtures", "/results" })
        {
            if (normalized.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                normalized = normalized[..^suffix.Length];
                break;
            }
        }

        return normalized.TrimEnd('/') + "/";
    }

    private static Dictionary<string, string> ExtractRuntimeConfig(string html)
    {
        var match = RuntimeConfigRegex().Match(html);
        if (!match.Success)
        {
            return [];
        }

        using var document = JsonDocument.Parse(match.Groups["json"].Value);
        return document.RootElement.EnumerateObject()
            .Where(property => property.Value.ValueKind == JsonValueKind.String)
            .ToDictionary(property => property.Name, property => property.Value.GetString() ?? string.Empty);
    }

    private static JsonDocument ExtractNextData(string html)
    {
        var match = NextDataRegex().Match(html);
        if (!match.Success)
        {
            throw new InvalidOperationException("Could not find LiveScore __NEXT_DATA__ script on the page.");
        }

        return JsonDocument.Parse(match.Groups["json"].Value);
    }

    private static string FindFirstString(JsonElement element, params string[] names)
    {
        foreach (var value in FindStrings(element, names))
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return string.Empty;
    }

    private static IEnumerable<string> FindStrings(JsonElement element, IReadOnlyCollection<string> names)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    if (names.Contains(property.Name, StringComparer.OrdinalIgnoreCase))
                    {
                        yield return property.Value.ValueKind == JsonValueKind.String
                            ? property.Value.GetString() ?? string.Empty
                            : property.Value.ToString();
                    }

                    foreach (var value in FindStrings(property.Value, names))
                    {
                        yield return value;
                    }
                }

                break;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    foreach (var value in FindStrings(item, names))
                    {
                        yield return value;
                    }
                }

                break;
        }
    }

    private static string HumanizeSlug(string slug)
    {
        return string.Join(
            ' ',
            slug.Split('-', StringSplitOptions.RemoveEmptyEntries)
                .Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }

    [GeneratedRegex("""window\.__PUBLIC_RUNTIME_CONFIG__\s*=\s*(?<json>\{.*?\})\s*;?\s*</script>""", RegexOptions.Singleline)]
    private static partial Regex RuntimeConfigRegex();

    [GeneratedRegex("""<script[^>]+id=["']__NEXT_DATA__["'][^>]*>(?<json>.*?)</script>""", RegexOptions.Singleline)]
    private static partial Regex NextDataRegex();
}

internal static class StringExtensions
{
    public static string OrDefault(this string value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }
}
