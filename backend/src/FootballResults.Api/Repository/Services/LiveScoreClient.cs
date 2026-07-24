using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;

namespace FootballResults.Api.Repository.Services;

public sealed partial class LiveScoreClient(HttpClient httpClient) : ILiveScoreClient
{
    public async Task<IReadOnlyList<LiveScoreHistoricalMatchRow>> GetTeamDetailsRowsAsync(
        Tournament tournament,
        Team team,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(team.LiveScoreTeamId))
        {
            return [];
        }

        var endpoint = BuildTeamDetailsEndpoint(tournament, team.LiveScoreTeamId);
        using var payload = await GetJsonDocumentAsync(endpoint, cancellationToken);
        return ParseTeamDetailsPayload(payload.RootElement, endpoint).ToList();
    }

    public async Task<LiveScoreMatchStatisticsRow?> GetMatchStatisticsAsync(
        Tournament tournament,
        string eventId,
        CancellationToken cancellationToken)
    {
        try
        {
            using var payload = await GetJsonDocumentAsync(BuildStatisticsEndpoint(tournament, eventId), cancellationToken);
            return ParseMatchStatistics(payload.RootElement);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<LiveScoreFixtureRow>> GetCompetitionRowsAsync(
        Tournament tournament,
        LiveScoreListType listType,
        bool enrichScoreBreakdowns,
        IReadOnlySet<string> skipDetailEventIds,
        CancellationToken cancellationToken)
    {
        var endpoint = BuildCompetitionEndpoint(tournament, listType);
        using var payload = await GetJsonDocumentAsync(endpoint, cancellationToken);
        var rows = ParseCompactPayload(payload.RootElement, tournament, endpoint, listType).ToList();

        if (!enrichScoreBreakdowns)
        {
            return rows;
        }

        var enriched = new List<LiveScoreFixtureRow>(rows.Count);
        foreach (var row in rows)
        {
            if (!NeedsScoreBreakdownEnrichment(row) || skipDetailEventIds.Contains(row.EventId))
            {
                enriched.Add(row);
                continue;
            }

            try
            {
                using var details = await GetJsonDocumentAsync(BuildIncidentsEndpoint(tournament, row.EventId), cancellationToken);
                enriched.Add(ApplyScoreBreakdown(row, details.RootElement));
            }
            catch (HttpRequestException)
            {
                enriched.Add(row);
            }
            catch (JsonException)
            {
                enriched.Add(row);
            }
        }

        return enriched;
    }

    private static IEnumerable<LiveScoreFixtureRow> ParseCompactPayload(
        JsonElement payload,
        Tournament tournament,
        string sourceEndpoint,
        LiveScoreListType listType)
    {
        if (!TryGetProperty(payload, "Stages", out var stages) || stages.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var stage in stages.EnumerateArray())
        {
            if (!TryGetProperty(stage, "Events", out var events) || events.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var liveScoreEvent in events.EnumerateArray())
            {
                yield return ParseCompactEvent(liveScoreEvent, stage, payload, tournament, sourceEndpoint, listType);
            }
        }
    }

    private static IEnumerable<LiveScoreHistoricalMatchRow> ParseTeamDetailsPayload(
        JsonElement payload,
        string sourceEndpoint)
    {
        if (!TryGetProperty(payload, "Stages", out var stages) || stages.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var stage in stages.EnumerateArray())
        {
            if (!TryGetProperty(stage, "Events", out var events) || events.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var liveScoreEvent in events.EnumerateArray())
            {
                yield return ParseTeamDetailsEvent(liveScoreEvent, stage, sourceEndpoint);
            }
        }
    }

    private static LiveScoreFixtureRow ParseCompactEvent(
        JsonElement liveScoreEvent,
        JsonElement stage,
        JsonElement payload,
        Tournament tournament,
        string sourceEndpoint,
        LiveScoreListType listType)
    {
        var home = FirstTeam(liveScoreEvent, "T1");
        var away = FirstTeam(liveScoreEvent, "T2");
        var eventId = Text(liveScoreEvent, "Eid");
        var status = NormalizeStatus(liveScoreEvent);
        var regularHomeScore = RegularTimeScore(liveScoreEvent, "Tr1", "Tr1OR", status);
        var regularAwayScore = RegularTimeScore(liveScoreEvent, "Tr2", "Tr2OR", status);
        var afterExtraTimeHomeScore = Score(liveScoreEvent, "Tr1ET");
        var afterExtraTimeAwayScore = Score(liveScoreEvent, "Tr2ET");

        return new LiveScoreFixtureRow(
            SyncState: NormalizeSyncState(status),
            ListType: listType,
            CompetitionId: Text(payload, "CompId").OrDefault(Text(stage, "CompId")).OrDefault(tournament.LiveScoreCompetitionId),
            CompetitionName: Text(payload, "CompN").OrDefault(Text(stage, "CompN")).OrDefault(Text(stage, "Cnm")),
            CompetitionCountry: Text(payload, "CompD").OrDefault(Text(stage, "CompD")),
            CompetitionUrlName: Text(payload, "CompUrlName").OrDefault(Text(stage, "CompUrlName")),
            CategoryCode: Text(payload, "Ccd").OrDefault(Text(stage, "Ccd")),
            CategoryName: Text(payload, "Cnm").OrDefault(Text(stage, "Cnm")),
            CategoryTransliteratedName: Text(payload, "CnmT").OrDefault(Text(stage, "CnmT")),
            StageId: Text(stage, "Sid"),
            StageName: Text(stage, "Snm").OrDefault(Text(stage, "CompST")),
            StageCode: Text(stage, "Scd"),
            EventId: eventId,
            KickoffUtc: ParseLiveScoreDateTime(Text(liveScoreEvent, "Esd")),
            HomeTeam: Text(home, "Nm"),
            AwayTeam: Text(away, "Nm"),
            HomeAbbr: Text(home, "Abr"),
            AwayAbbr: Text(away, "Abr"),
            HomeTeamImage: Text(home, "Img"),
            AwayTeamImage: Text(away, "Img"),
            HomeTeamId: Text(home, "ID"),
            AwayTeamId: Text(away, "ID"),
            HomeScore: Score(liveScoreEvent, "Tr1"),
            AwayScore: Score(liveScoreEvent, "Tr2"),
            RegularHomeScore: regularHomeScore,
            RegularAwayScore: regularAwayScore,
            AfterExtraTimeHomeScore: afterExtraTimeHomeScore,
            AfterExtraTimeAwayScore: afterExtraTimeAwayScore,
            ExtraTimeHomeGoals: ScoreDifference(afterExtraTimeHomeScore, regularHomeScore),
            ExtraTimeAwayGoals: ScoreDifference(afterExtraTimeAwayScore, regularAwayScore),
            PenaltyHomeScore: Score(liveScoreEvent, "Trp1"),
            PenaltyAwayScore: Score(liveScoreEvent, "Trp2"),
            Status: status,
            StatusRaw: Text(liveScoreEvent, "Eps"),
            RoundInfo: Text(liveScoreEvent, "ErnInf"),
            MatchUrl: BuildMatchUrl(tournament.BaseUrl, Text(home, "Nm"), Text(away, "Nm"), eventId),
            SourceEndpoint: sourceEndpoint);
    }

    private static LiveScoreHistoricalMatchRow ParseTeamDetailsEvent(
        JsonElement liveScoreEvent,
        JsonElement stage,
        string sourceEndpoint)
    {
        var home = FirstTeam(liveScoreEvent, "T1");
        var away = FirstTeam(liveScoreEvent, "T2");
        var status = NormalizeStatus(liveScoreEvent);
        var regularHomeScore = RegularTimeScore(liveScoreEvent, "Tr1", "Tr1OR", status);
        var regularAwayScore = RegularTimeScore(liveScoreEvent, "Tr2", "Tr2OR", status);
        var competitionName = Text(stage, "CompN").OrDefault(Text(stage, "Snm"));

        return new LiveScoreHistoricalMatchRow(
            EventId: Text(liveScoreEvent, "Eid"),
            CompetitionId: Text(stage, "CompId"),
            CompetitionName: competitionName,
            CompetitionCountry: Text(stage, "CompD").OrDefault(Text(stage, "Cnm")),
            SeasonName: competitionName,
            StageName: Text(stage, "Snm"),
            StageCode: Text(stage, "Scd"),
            KickoffUtc: ParseLiveScoreDateTime(Text(liveScoreEvent, "Esd")),
            HomeTeam: Text(home, "Nm"),
            AwayTeam: Text(away, "Nm"),
            HomeAbbr: Text(home, "Abr"),
            AwayAbbr: Text(away, "Abr"),
            HomeTeamId: Text(home, "ID"),
            AwayTeamId: Text(away, "ID"),
            HomeScore: Score(liveScoreEvent, "Tr1"),
            AwayScore: Score(liveScoreEvent, "Tr2"),
            RegularHomeScore: regularHomeScore,
            RegularAwayScore: regularAwayScore,
            Status: status,
            StatusRaw: Text(liveScoreEvent, "Eps"),
            RoundInfo: Text(liveScoreEvent, "ErnInf"),
            SourceEndpoint: sourceEndpoint);
    }

    private static LiveScoreFixtureRow ApplyScoreBreakdown(LiveScoreFixtureRow row, JsonElement details)
    {
        var regularHomeScore = Score(details, "Tr1OR") ?? row.RegularHomeScore;
        var regularAwayScore = Score(details, "Tr2OR") ?? row.RegularAwayScore;
        var afterExtraTimeHomeScore = Score(details, "Tr1ET") ?? row.AfterExtraTimeHomeScore;
        var afterExtraTimeAwayScore = Score(details, "Tr2ET") ?? row.AfterExtraTimeAwayScore;
        var penaltyHomeScore = Score(details, "Trp1") ?? row.PenaltyHomeScore;
        var penaltyAwayScore = Score(details, "Trp2") ?? row.PenaltyAwayScore;

        return row with
        {
            RegularHomeScore = regularHomeScore,
            RegularAwayScore = regularAwayScore,
            AfterExtraTimeHomeScore = afterExtraTimeHomeScore,
            AfterExtraTimeAwayScore = afterExtraTimeAwayScore,
            ExtraTimeHomeGoals = ScoreDifference(afterExtraTimeHomeScore, regularHomeScore),
            ExtraTimeAwayGoals = ScoreDifference(afterExtraTimeAwayScore, regularAwayScore),
            PenaltyHomeScore = penaltyHomeScore,
            PenaltyAwayScore = penaltyAwayScore
        };
    }

    private static LiveScoreMatchStatisticsRow? ParseMatchStatistics(JsonElement payload)
    {
        if (!TryGetProperty(payload, "Stat", out var stats) || stats.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        JsonElement? home = null;
        JsonElement? away = null;
        foreach (var teamStats in stats.EnumerateArray())
        {
            var teamNumber = Int(teamStats, "Tnb");
            if (teamNumber == 1)
            {
                home = teamStats;
            }
            else if (teamNumber == 2)
            {
                away = teamStats;
            }
        }

        if (home is null && away is null)
        {
            return null;
        }

        return new LiveScoreMatchStatisticsRow(
            EventId: Text(payload, "Eid"),
            HomeExpectedGoals: Decimal(home, "Xg"),
            AwayExpectedGoals: Decimal(away, "Xg"),
            HomeShotsOnTarget: Int(home, "Shon"),
            AwayShotsOnTarget: Int(away, "Shon"),
            HomeShotsOffTarget: Int(home, "Shof"),
            AwayShotsOffTarget: Int(away, "Shof"),
            HomeBlockedShots: Int(home, "Shbl"),
            AwayBlockedShots: Int(away, "Shbl"),
            HomePossession: Int(home, "Pss"),
            AwayPossession: Int(away, "Pss"),
            HomeCorners: Int(home, "Cos"),
            AwayCorners: Int(away, "Cos"),
            HomeFouls: Int(home, "Fls"),
            AwayFouls: Int(away, "Fls"),
            HomeThrowIns: Int(home, "Ths"),
            AwayThrowIns: Int(away, "Ths"),
            HomeCrosses: Int(home, "Crs"),
            AwayCrosses: Int(away, "Crs"),
            HomeGoalkeeperSaves: Int(home, "Gks"),
            AwayGoalkeeperSaves: Int(away, "Gks"),
            HomeGoalKicks: Int(home, "Goa"),
            AwayGoalKicks: Int(away, "Goa"),
            HomeOffsides: Int(home, "Ofs"),
            AwayOffsides: Int(away, "Ofs"),
            HomeYellowCards: Int(home, "Ycs"),
            AwayYellowCards: Int(away, "Ycs"),
            HomeRedCards: Int(home, "Rcs"),
            AwayRedCards: Int(away, "Rcs"),
            HomeYellowRedCards: Int(home, "YRcs"),
            AwayYellowRedCards: Int(away, "YRcs"),
            HomeCounterAttacks: Int(home, "Att"),
            AwayCounterAttacks: Int(away, "Att"));
    }

    private async Task<JsonDocument> GetJsonDocumentAsync(string endpoint, CancellationToken cancellationToken)
    {
        await using var stream = await httpClient.GetStreamAsync(endpoint, cancellationToken);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }

    private static string BuildCompetitionEndpoint(Tournament tournament, LiveScoreListType listType)
    {
        var endpointType = listType == LiveScoreListType.Fixtures ? "fixtures-w" : "results-w";
        var query = $"limit=500&locale={Uri.EscapeDataString(tournament.Locale.OrDefault("en"))}";
        return $"{tournament.ApiBaseUrl.TrimEnd('/')}/v1/api/app/competition/{tournament.LiveScoreCompetitionId}/{endpointType}/{tournament.TimezoneOffset.OrDefault("0")}?{query}";
    }

    private static string BuildIncidentsEndpoint(Tournament tournament, string eventId)
    {
        var locale = Uri.EscapeDataString(tournament.Locale.OrDefault("en"));
        return $"{tournament.ApiBaseUrl.TrimEnd('/')}/v1/api/app/incidents/soccer/{eventId}?locale={locale}";
    }

    private static string BuildStatisticsEndpoint(Tournament tournament, string eventId)
    {
        var locale = Uri.EscapeDataString(tournament.Locale.OrDefault("en"));
        return $"{tournament.ApiBaseUrl.TrimEnd('/')}/v1/api/app/statistics/soccer/{eventId}?locale={locale}";
    }

    private static string BuildTeamDetailsEndpoint(Tournament tournament, string teamId)
    {
        var locale = Uri.EscapeDataString(tournament.Locale.OrDefault("en"));
        var teamApiBaseUrl = tournament.ApiBaseUrl
            .TrimEnd('/')
            .Replace("public-api", "team-api", StringComparison.OrdinalIgnoreCase);
        return $"{teamApiBaseUrl}/v1/api/app/team/{Uri.EscapeDataString(teamId)}/details?locale={locale}";
    }

    private static JsonElement FirstTeam(JsonElement liveScoreEvent, string propertyName)
    {
        if (!TryGetProperty(liveScoreEvent, propertyName, out var teams) ||
            teams.ValueKind != JsonValueKind.Array ||
            teams.GetArrayLength() == 0)
        {
            return default;
        }

        var team = teams[0];
        return team.ValueKind == JsonValueKind.Object ? team : default;
    }

    private static MatchStatus NormalizeStatus(JsonElement liveScoreEvent)
    {
        var rawStatus = Text(liveScoreEvent, "Eps");
        var statusId = Int(liveScoreEvent, "Esid");
        var rawUpper = rawStatus.ToUpperInvariant();

        if (new[] { "CANC", "CAN", "CANCELLED", "CANCELED", "ABD", "ABAN" }.Contains(rawUpper))
        {
            return MatchStatus.Cancelled;
        }

        if (new[] { "POSTP", "POSTP.", "PPD", "PST", "POSTPONED", "SUSP" }.Contains(rawUpper))
        {
            return MatchStatus.Postponed;
        }

        if (rawStatus == "NS" || statusId == 1)
        {
            return MatchStatus.Upcoming;
        }

        if (new[] { "FT", "AET", "AP", "Pen." }.Contains(rawStatus) || new[] { 6, 7, 11, 12, 13 }.Contains(statusId ?? 0))
        {
            return MatchStatus.Finished;
        }

        if (rawStatus is "HT" or "ET" || rawStatus.EndsWith('\'') || statusId == 2)
        {
            return MatchStatus.Live;
        }

        return MatchStatus.Unknown;
    }

    private static MatchSyncState NormalizeSyncState(MatchStatus status)
    {
        return status switch
        {
            MatchStatus.Finished => MatchSyncState.Finalized,
            MatchStatus.Live => MatchSyncState.Live,
            MatchStatus.Cancelled => MatchSyncState.Cancelled,
            MatchStatus.Postponed => MatchSyncState.Postponed,
            MatchStatus.Upcoming => MatchSyncState.Scheduled,
            _ => MatchSyncState.Unknown
        };
    }

    private static DateTimeOffset? ParseLiveScoreDateTime(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (!DateTime.TryParseExact(
                value,
                "yyyyMMddHHmmss",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed))
        {
            return null;
        }

        return new DateTimeOffset(DateTime.SpecifyKind(parsed, DateTimeKind.Utc));
    }

    private static int? RegularTimeScore(JsonElement liveScoreEvent, string scoreKey, string regularKey, MatchStatus status)
    {
        var regularScore = Score(liveScoreEvent, regularKey);
        if (regularScore.HasValue)
        {
            return regularScore;
        }

        if (status == MatchStatus.Finished &&
            !Score(liveScoreEvent, "Tr1ET").HasValue &&
            !Score(liveScoreEvent, "Tr2ET").HasValue)
        {
            return Score(liveScoreEvent, scoreKey);
        }

        return null;
    }

    private static bool NeedsScoreBreakdownEnrichment(LiveScoreFixtureRow row)
    {
        return !string.IsNullOrWhiteSpace(row.EventId) &&
            row.Status == MatchStatus.Finished &&
            (!row.RegularHomeScore.HasValue || !row.RegularAwayScore.HasValue);
    }

    private static int? ScoreDifference(int? laterScore, int? earlierScore)
    {
        return laterScore.HasValue && earlierScore.HasValue ? laterScore - earlierScore : null;
    }

    private static int? Score(JsonElement element, string propertyName)
    {
        var value = Text(element, propertyName);
        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }

    private static int? Int(JsonElement element, string propertyName)
    {
        if (!TryGetProperty(element, propertyName, out var value))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt32(out var parsed) => parsed,
            JsonValueKind.String when int.TryParse(value.GetString(), out var parsed) => parsed,
            _ => null
        };
    }

    private static int? Int(JsonElement? element, string propertyName)
    {
        return element.HasValue ? Int(element.Value, propertyName) : null;
    }

    private static decimal? Decimal(JsonElement? element, string propertyName)
    {
        if (!element.HasValue || !TryGetProperty(element.Value, propertyName, out var value))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetDecimal(out var parsed) => parsed,
            JsonValueKind.String when decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => null
        };
    }

    private static string Text(JsonElement element, string propertyName)
    {
        if (element.ValueKind != JsonValueKind.Object || !TryGetProperty(element, propertyName, out var value))
        {
            return string.Empty;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? string.Empty,
            JsonValueKind.Number => value.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => string.Empty
        };
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(propertyName, out value))
        {
            return true;
        }

        value = default;
        return false;
    }

    private static string BuildMatchUrl(string tournamentBaseUrl, string homeTeam, string awayTeam, string eventId)
    {
        var slug = $"{Slugify(homeTeam)}-vs-{Slugify(awayTeam)}".Trim('-');
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "match";
        }

        return $"{tournamentBaseUrl.TrimEnd('/')}/{slug}/{eventId}/";
    }

    private static string Slugify(string value)
    {
        var normalized = value.Normalize(System.Text.NormalizationForm.FormD);
        var ascii = new string(normalized.Where(character => CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark).ToArray());
        return SlugRegex().Replace(ascii.ToLowerInvariant(), "-").Trim('-');
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex SlugRegex();
}
