using AngleSharp.Html.Parser;
using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.RegularExpressions;

namespace FootballResults.Api.Repository.Services;

public sealed partial class SquadQualityService(
    AppDbContext dbContext,
    ITransfermarktClient transfermarktClient) : ISquadQualityService
{
    private const string Provider = "Transfermarkt";

    public async Task<ImportTransfermarktSquadResponse> ImportTransfermarktSquadAsync(
        int teamId,
        ImportTransfermarktSquadRequest request,
        CancellationToken cancellationToken)
    {
        var team = await dbContext.Teams.FirstOrDefaultAsync(team => team.Id == teamId, cancellationToken);
        if (team is null)
        {
            throw new KeyNotFoundException($"Team {teamId} was not found.");
        }

        var importUrl = BuildDetailedSquadUrl(request.TransfermarktUrl, request.Season);
        var html = await transfermarktClient.GetClubPageAsync(importUrl, cancellationToken);
        var parsed = await ParseClubPageAsync(importUrl, html, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var mapping = await dbContext.ExternalTeamMappings
            .FirstOrDefaultAsync(mapping =>
                mapping.Provider == Provider &&
                mapping.TeamId == teamId,
                cancellationToken);

        if (mapping is null)
        {
            mapping = new ExternalTeamMapping
            {
                TeamId = teamId,
                Provider = Provider,
                CreatedAtUtc = now
            };
            dbContext.ExternalTeamMappings.Add(mapping);
        }

        mapping.ExternalTeamId = parsed.ExternalTeamId;
        mapping.ExternalSlug = parsed.ExternalSlug;
        mapping.SourceUrl = parsed.SourceUrl;
        mapping.UpdatedAtUtc = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        var orderedMarketValues = parsed.Players
            .Where(player => player.MarketValueEur.HasValue)
            .Select(player => player.MarketValueEur!.Value)
            .OrderByDescending(value => value)
            .ToList();

        var snapshot = new SquadQualitySnapshot
        {
            TeamId = teamId,
            ExternalTeamMappingId = mapping.Id,
            Provider = Provider,
            ExternalTeamId = parsed.ExternalTeamId,
            ExternalSlug = parsed.ExternalSlug,
            SourceUrl = parsed.SourceUrl,
            Season = Clean(request.Season) ?? parsed.Season,
            FetchedAtUtc = now,
            ClubName = parsed.ClubName,
            LeagueName = parsed.LeagueName,
            LeagueLevel = parsed.LeagueLevel,
            InLeagueSince = parsed.InLeagueSince,
            StadiumName = parsed.StadiumName,
            StadiumCapacity = parsed.StadiumCapacity,
            TransferRecordText = parsed.TransferRecordText,
            TransferRecordValueEur = parsed.TransferRecordValueEur,
            SquadSize = parsed.SquadSize,
            AverageAge = parsed.AverageAge,
            ForeignersCount = parsed.ForeignersCount,
            ForeignersPercentage = parsed.ForeignersPercentage,
            NationalTeamPlayers = parsed.NationalTeamPlayers,
            TotalMarketValueEur = parsed.TotalMarketValueEur,
            AverageMarketValueEur = orderedMarketValues.Count == 0 ? null : RoundMoney(orderedMarketValues.Average()),
            TopElevenMarketValueEur = SumTop(orderedMarketValues, 11),
            TopFifteenMarketValueEur = SumTop(orderedMarketValues, 15),
            ValueWeightedAverageAge = CalculateValueWeightedAverageAge(parsed.Players),
            ValueWeightedContractYears = CalculateValueWeightedContractYears(parsed.Players, now),
            PlayerCount = parsed.Players.Count,
            Players = parsed.Players.Select(player => new SquadPlayerSnapshot
            {
                ExternalPlayerId = player.ExternalPlayerId,
                ProfileUrl = player.ProfileUrl,
                PlayerName = player.PlayerName,
                PositionGroup = player.PositionGroup,
                Position = player.Position,
                ShirtNumber = player.ShirtNumber,
                DateOfBirth = player.DateOfBirth,
                Age = player.Age,
                Nationalities = player.Nationalities,
                HeightCm = player.HeightCm,
                Foot = player.Foot,
                JoinedDate = player.JoinedDate,
                SignedFromClubName = player.SignedFromClubName,
                SignedFromExternalClubId = player.SignedFromExternalClubId,
                SignedFromSeasonId = player.SignedFromSeasonId,
                TransferMovementText = player.TransferMovementText,
                TransferFeeText = player.TransferFeeText,
                TransferFeeEur = player.TransferFeeEur,
                ContractUntil = player.ContractUntil,
                MarketValueText = player.MarketValueText,
                MarketValueEur = player.MarketValueEur
            }).ToList()
        };

        dbContext.SquadQualitySnapshots.Add(snapshot);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new ImportTransfermarktSquadResponse(
            team.Id,
            team.Name,
            mapping.Id,
            snapshot.Id,
            mapping.ExternalTeamId,
            mapping.ExternalSlug,
            snapshot.ClubName,
            snapshot.SourceUrl,
            snapshot.Season,
            snapshot.PlayerCount,
            snapshot.TotalMarketValueEur,
            snapshot.TopElevenMarketValueEur,
            snapshot.TopFifteenMarketValueEur,
            snapshot.ValueWeightedAverageAge,
            snapshot.ValueWeightedContractYears);
    }

    public async Task<IReadOnlyList<ExternalTeamMappingDto>> GetTeamMappingsAsync(
        int teamId,
        CancellationToken cancellationToken)
    {
        return await dbContext.ExternalTeamMappings
            .Include(mapping => mapping.Team)
            .Where(mapping => mapping.TeamId == teamId)
            .OrderBy(mapping => mapping.Provider)
            .Select(mapping => new ExternalTeamMappingDto(
                mapping.Id,
                mapping.TeamId,
                mapping.Team.Name,
                mapping.Provider,
                mapping.ExternalTeamId,
                mapping.ExternalSlug,
                mapping.SourceUrl,
                mapping.CreatedAtUtc,
                mapping.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<SquadQualitySnapshotDto?> GetLatestSnapshotAsync(
        int teamId,
        CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.SquadQualitySnapshots
            .Include(snapshot => snapshot.Team)
            .Where(snapshot => snapshot.TeamId == teamId)
            .OrderByDescending(snapshot => snapshot.FetchedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return snapshot is null ? null : ToSnapshotDto(snapshot);
    }

    public async Task<IReadOnlyList<SquadPlayerSnapshotDto>> GetSnapshotPlayersAsync(
        int snapshotId,
        CancellationToken cancellationToken)
    {
        return await dbContext.SquadPlayerSnapshots
            .Where(player => player.SquadQualitySnapshotId == snapshotId)
            .OrderByDescending(player => player.MarketValueEur ?? 0)
            .ThenBy(player => player.PlayerName)
            .Select(player => new SquadPlayerSnapshotDto(
                player.Id,
                player.SquadQualitySnapshotId,
                player.ExternalPlayerId,
                player.ProfileUrl,
                player.PlayerName,
                player.PositionGroup,
                player.Position,
                player.ShirtNumber,
                player.DateOfBirth,
                player.Age,
                player.Nationalities,
                player.HeightCm,
                player.Foot,
                player.JoinedDate,
                player.SignedFromClubName,
                player.SignedFromExternalClubId,
                player.SignedFromSeasonId,
                player.TransferMovementText,
                player.TransferFeeText,
                player.TransferFeeEur,
                player.ContractUntil,
                player.MarketValueText,
                player.MarketValueEur))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TeamSquadQualityRatingDto>> GetTournamentTeamRatingsAsync(
        int tournamentId,
        CancellationToken cancellationToken)
    {
        var teams = await dbContext.TournamentTeams
            .Include(tournamentTeam => tournamentTeam.Team)
            .Where(tournamentTeam => tournamentTeam.TournamentId == tournamentId)
            .Select(tournamentTeam => tournamentTeam.Team)
            .OrderBy(team => team.Name)
            .ToListAsync(cancellationToken);

        if (teams.Count == 0)
        {
            return [];
        }

        var teamIds = teams.Select(team => team.Id).ToHashSet();
        var allSnapshots = await dbContext.SquadQualitySnapshots
            .Include(snapshot => snapshot.Players)
            .Where(snapshot => teamIds.Contains(snapshot.TeamId))
            .ToListAsync(cancellationToken);
        var snapshots = allSnapshots
            .GroupBy(snapshot => snapshot.TeamId)
            .Select(group => group.OrderByDescending(snapshot => snapshot.FetchedAtUtc).First())
            .ToList();

        var snapshotByTeamId = snapshots.ToDictionary(snapshot => snapshot.TeamId);
        var baselines = CalculateBaselines(snapshots);

        return teams
            .Select(team =>
            {
                snapshotByTeamId.TryGetValue(team.Id, out var snapshot);
                var components = snapshot is null ? SquadQualityComponents.Empty : CalculateSquadQualityComponents(snapshot, baselines);
                var adjustment = RoundRating(Clamp(components.TotalScore * 70m, -70m, 70m));

                return new TeamSquadQualityRatingDto(
                    team.Id,
                    team.Name,
                    team.Abbreviation,
                    snapshot?.Id,
                    snapshot?.FetchedAtUtc,
                    snapshot?.TotalMarketValueEur,
                    snapshot?.TopElevenMarketValueEur,
                    snapshot?.TopFifteenMarketValueEur,
                    snapshot?.AverageAge,
                    snapshot?.ValueWeightedAverageAge,
                    snapshot?.ValueWeightedContractYears,
                    snapshot?.NationalTeamPlayers,
                    snapshot?.PlayerCount ?? 0,
                    RoundNullable(components.TopElevenScore),
                    RoundNullable(components.TopFifteenScore),
                    RoundNullable(components.TotalValueScore),
                    RoundNullable(components.NationalTeamPlayersScore),
                    RoundNullable(components.PrimeAgeScore),
                    RoundNullable(components.ContractStabilityScore),
                    RoundNullable(components.PositionalBalanceScore),
                    RoundMetric(components.TotalScore),
                    adjustment);
            })
            .OrderByDescending(rating => rating.SquadQualityAdjustment)
            .ThenBy(rating => rating.TeamName)
            .ToList();
    }

    private static async Task<ParsedTransfermarktClub> ParseClubPageAsync(
        string sourceUrl,
        string html,
        CancellationToken cancellationToken)
    {
        var parser = new HtmlParser();
        var document = await parser.ParseDocumentAsync(html, cancellationToken);
        var uri = new Uri(sourceUrl);
        var externalTeamId = ExtractRequired(TeamIdRegex(), uri.AbsolutePath, "Transfermarkt team id");
        var externalSlug = ExtractSlug(uri.AbsolutePath);
        var header = document.QuerySelector("header.data-header");

        var players = document
            .QuerySelector("table.items")
            ?.QuerySelector(":scope > tbody")
            ?.Children
            .Where(element => string.Equals(element.TagName, "tr", StringComparison.OrdinalIgnoreCase))
            .Select(row => ParsePlayer(row))
            .Where(player => player is not null)
            .Select(player => player!)
            .GroupBy(player => player.ExternalPlayerId, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .ToList();

        var totalMarketValueText = header?.QuerySelector(".data-header__market-value-wrapper")?.TextContent;
        var foreignersText = HeaderValue(header, "Foreigners:");
        var stadiumText = HeaderValue(header, "Stadium:");
        var transferRecordText = HeaderValue(header, "Current transfer record:");

        return new ParsedTransfermarktClub(
            externalTeamId,
            externalSlug,
            sourceUrl,
            ExtractSeason(sourceUrl),
            Clean(document.QuerySelector("h1.data-header__headline-wrapper")?.TextContent) ?? string.Empty,
            Clean(header?.QuerySelector(".data-header__box__club-link")?.TextContent) ?? string.Empty,
            Clean(HeaderValue(header, "League level:")) ?? string.Empty,
            Clean(HeaderValue(header, "In league since:")) ?? string.Empty,
            ExtractStadiumName(stadiumText),
            ExtractStadiumCapacity(stadiumText),
            Clean(transferRecordText) ?? string.Empty,
            ParseMoney(transferRecordText),
            ParseInt(HeaderValue(header, "Squad size:")),
            ParseDecimal(HeaderValue(header, "Average age:")),
            ParseInt(foreignersText),
            ParsePercentage(foreignersText),
            ParseInt(HeaderValue(header, "National team players:")),
            ParseMoney(totalMarketValueText),
            players ?? []);
    }

    private static ParsedTransfermarktPlayer? ParsePlayer(AngleSharp.Dom.IElement row)
    {
        var profileLink = row.QuerySelector("td.posrela a[href*='/profil/spieler/']");
        if (profileLink is null)
        {
            return null;
        }

        var cells = row.QuerySelectorAll(":scope > td").ToList();
        if (cells.Count < 5)
        {
            return null;
        }

        var shirtNumber = Clean(cells.ElementAtOrDefault(0)?.TextContent) ?? string.Empty;
        var playerName = Clean(profileLink.TextContent) ?? string.Empty;
        var playerId = ExtractRequired(PlayerIdRegex(), profileLink.GetAttribute("href") ?? string.Empty, "Transfermarkt player id");
        var profileUrl = profileLink.GetAttribute("href") ?? string.Empty;
        var positionGroup = Clean(cells.ElementAtOrDefault(0)?.GetAttribute("title")) ?? string.Empty;
        var position = Clean(row.QuerySelector("table.inline-table tr:nth-child(2) td")?.TextContent) ?? string.Empty;
        var dateAndAge = Clean(cells.ElementAtOrDefault(2)?.TextContent);
        var nationalities = string.Join(
            ", ",
            cells.ElementAtOrDefault(3)?
                .QuerySelectorAll("img.flaggenrahmen")
                .Select(flag => Clean(flag.GetAttribute("title") ?? flag.GetAttribute("alt")))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase) ?? []);
        var marketValueText = Clean(cells.LastOrDefault()?.TextContent) ?? string.Empty;
        var transferInfo = ParseTransferInfo(cells.ElementAtOrDefault(7));

        return new ParsedTransfermarktPlayer(
            playerId,
            profileUrl,
            playerName,
            positionGroup,
            position,
            shirtNumber,
            ParseDateOfBirth(dateAndAge),
            ParseAge(dateAndAge),
            nationalities,
            ParseHeightCm(Clean(cells.ElementAtOrDefault(4)?.TextContent)),
            Clean(cells.ElementAtOrDefault(5)?.TextContent) ?? string.Empty,
            ParseDate(Clean(cells.ElementAtOrDefault(6)?.TextContent)),
            transferInfo.SignedFromClubName,
            transferInfo.SignedFromExternalClubId,
            transferInfo.SignedFromSeasonId,
            transferInfo.TransferMovementText,
            transferInfo.TransferFeeText,
            ParseMoney(transferInfo.TransferFeeText),
            ParseDate(Clean(cells.ElementAtOrDefault(8)?.TextContent)),
            marketValueText,
            ParseMoney(marketValueText));
    }

    private static TransferInfo ParseTransferInfo(AngleSharp.Dom.IElement? cell)
    {
        if (cell is null)
        {
            return TransferInfo.Empty;
        }

        var link = cell.QuerySelector("a");
        var image = cell.QuerySelector("img");
        var href = link?.GetAttribute("href") ?? string.Empty;
        var title = Clean(link?.GetAttribute("title")) ?? string.Empty;
        var signedFromClubName = Clean(image?.GetAttribute("alt") ?? image?.GetAttribute("title") ?? cell.TextContent) ?? string.Empty;
        var movementText = ExtractTransferMovementText(title, signedFromClubName);
        var feeText = ExtractTransferFeeText(title);

        return new TransferInfo(
            signedFromClubName,
            ExtractOptional(TeamIdRegex(), href),
            ExtractOptional(SeasonRegex(), href),
            movementText,
            feeText);
    }

    private static string ExtractTransferMovementText(string title, string fallback)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return fallback;
        }

        var semicolonIndex = title.IndexOf(';', StringComparison.Ordinal);
        var firstPart = semicolonIndex >= 0 ? title[..semicolonIndex] : title;
        var feeMarkerIndex = firstPart.IndexOf(": Abl", StringComparison.OrdinalIgnoreCase);
        return Clean(feeMarkerIndex >= 0 ? firstPart[..feeMarkerIndex] : firstPart) ?? fallback;
    }

    private static string ExtractTransferFeeText(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return string.Empty;
        }

        var feeMatch = TransferFeeRegex().Match(title);
        if (feeMatch.Success)
        {
            return Clean(feeMatch.Groups[1].Value) ?? string.Empty;
        }

        var abloseMatch = TransferAbloseRegex().Match(title);
        return abloseMatch.Success ? Clean(abloseMatch.Groups[1].Value) ?? string.Empty : string.Empty;
    }

    private static string? HeaderValue(AngleSharp.Dom.IElement? header, string label)
    {
        var element = header?
            .QuerySelectorAll(".data-header__label")
            .FirstOrDefault(element => Clean(element.TextContent)?.StartsWith(label, StringComparison.OrdinalIgnoreCase) == true);

        return Clean(element?.QuerySelector(".data-header__content")?.TextContent ?? element?.TextContent?.Replace(label, string.Empty, StringComparison.OrdinalIgnoreCase));
    }

    private static SquadQualityBaselines CalculateBaselines(IReadOnlyList<SquadQualitySnapshot> snapshots)
    {
        return new SquadQualityBaselines(
            AveragePositive(snapshots.Select(snapshot => snapshot.TopElevenMarketValueEur)),
            AveragePositive(snapshots.Select(snapshot => snapshot.TopFifteenMarketValueEur)),
            AveragePositive(snapshots.Select(snapshot => snapshot.TotalMarketValueEur)),
            AveragePositive(snapshots.Select(snapshot => snapshot.NationalTeamPlayers.HasValue ? (decimal?)snapshot.NationalTeamPlayers.Value : null)),
            AveragePositive(snapshots.Select(snapshot => snapshot.ValueWeightedContractYears)));
    }

    private static SquadQualityComponents CalculateSquadQualityComponents(
        SquadQualitySnapshot snapshot,
        SquadQualityBaselines baselines)
    {
        var components = new List<(decimal? Score, decimal Weight)>
        {
            (LogScore(snapshot.TopElevenMarketValueEur, baselines.TopElevenMarketValueEur), 0.40m),
            (LogScore(snapshot.TopFifteenMarketValueEur, baselines.TopFifteenMarketValueEur), 0.20m),
            (LogScore(snapshot.TotalMarketValueEur, baselines.TotalMarketValueEur), 0.12m),
            (LinearScore(snapshot.NationalTeamPlayers, baselines.NationalTeamPlayers, 10m), 0.10m),
            (AgeBalanceScore(snapshot.ValueWeightedAverageAge ?? snapshot.AverageAge), 0.08m),
            (ContractStabilityScore(snapshot.ValueWeightedContractYears, baselines.ValueWeightedContractYears), 0.05m),
            (PositionalBalanceScore(snapshot.Players), 0.05m)
        };

        var availableWeight = components.Where(component => component.Score.HasValue).Sum(component => component.Weight);
        if (availableWeight == 0)
        {
            return SquadQualityComponents.Empty;
        }

        var totalScore = Clamp(
            components
                .Where(component => component.Score.HasValue)
                .Sum(component => component.Score!.Value * component.Weight) / availableWeight,
            -1,
            1);

        return new SquadQualityComponents(
            components[0].Score,
            components[1].Score,
            components[2].Score,
            components[3].Score,
            components[4].Score,
            components[5].Score,
            components[6].Score,
            totalScore);
    }

    private static decimal? LogScore(decimal? value, decimal baseline)
    {
        if (!value.HasValue || value.Value <= 0 || baseline <= 0)
        {
            return null;
        }

        return Clamp((decimal)Math.Log((double)(value.Value / baseline)) / 1.25m, -1, 1);
    }

    private static decimal? LinearScore(int? value, decimal baseline, decimal cap)
    {
        if (!value.HasValue || baseline <= 0)
        {
            return null;
        }

        return Clamp((value.Value - baseline) / cap, -1, 1);
    }

    private static decimal? AgeBalanceScore(decimal? averageAge)
    {
        if (!averageAge.HasValue)
        {
            return null;
        }

        var distanceFromPrime = Math.Abs(averageAge.Value - 25.5m);
        return Clamp(1m - (distanceFromPrime / 5m), -1, 1);
    }

    private static decimal? ContractStabilityScore(decimal? valueWeightedContractYears, decimal baseline)
    {
        if (!valueWeightedContractYears.HasValue)
        {
            return null;
        }

        var baselineValue = baseline <= 0 ? 2.5m : baseline;
        return Clamp((valueWeightedContractYears.Value - baselineValue) / 2m, -1, 1);
    }

    private static decimal? PositionalBalanceScore(IReadOnlyList<SquadPlayerSnapshot> players)
    {
        var valuesByGroup = players
            .Where(player => player.MarketValueEur.HasValue && player.MarketValueEur.Value > 0)
            .GroupBy(player => NormalizePositionGroup(player.PositionGroup))
            .ToDictionary(group => group.Key, group => group.Sum(player => player.MarketValueEur!.Value), StringComparer.OrdinalIgnoreCase);
        var totalValue = valuesByGroup.Values.Sum();
        if (totalValue <= 0)
        {
            return null;
        }

        var targets = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
        {
            ["Goalkeeper"] = 0.08m,
            ["Defender"] = 0.32m,
            ["Midfield"] = 0.32m,
            ["Attack"] = 0.28m
        };

        var distance = targets.Sum(target =>
        {
            valuesByGroup.TryGetValue(target.Key, out var groupValue);
            return Math.Abs((groupValue / totalValue) - target.Value);
        });

        return Clamp(1m - (distance / 0.70m), -1, 1);
    }

    private static string NormalizePositionGroup(string positionGroup)
    {
        return positionGroup switch
        {
            "Goalkeeper" => "Goalkeeper",
            "Defender" => "Defender",
            "Midfield" => "Midfield",
            "Attack" => "Attack",
            _ => "Other"
        };
    }

    private static decimal AveragePositive(IEnumerable<decimal?> values)
    {
        var positive = values
            .Where(value => value.HasValue && value.Value > 0)
            .Select(value => value!.Value)
            .ToList();

        return positive.Count == 0 ? 0 : positive.Average();
    }

    private static decimal? SumTop(IReadOnlyList<decimal> values, int count)
    {
        return values.Count == 0 ? null : RoundMoney(values.Take(count).Sum());
    }

    private static decimal? CalculateValueWeightedAverageAge(IReadOnlyList<ParsedTransfermarktPlayer> players)
    {
        var valuedPlayers = players
            .Where(player => player.Age.HasValue && player.MarketValueEur.HasValue && player.MarketValueEur.Value > 0)
            .ToList();
        var valueSum = valuedPlayers.Sum(player => player.MarketValueEur!.Value);
        if (valueSum <= 0)
        {
            return null;
        }

        return RoundMetric(valuedPlayers.Sum(player => player.Age!.Value * player.MarketValueEur!.Value) / valueSum);
    }

    private static decimal? CalculateValueWeightedContractYears(
        IReadOnlyList<ParsedTransfermarktPlayer> players,
        DateTimeOffset now)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var valuedPlayers = players
            .Where(player => player.ContractUntil.HasValue && player.MarketValueEur.HasValue && player.MarketValueEur.Value > 0)
            .ToList();
        var valueSum = valuedPlayers.Sum(player => player.MarketValueEur!.Value);
        if (valueSum <= 0)
        {
            return null;
        }

        return RoundMetric(valuedPlayers.Sum(player =>
        {
            var remainingDays = Math.Max(0, player.ContractUntil!.Value.DayNumber - today.DayNumber);
            return (remainingDays / 365.25m) * player.MarketValueEur!.Value;
        }) / valueSum);
    }

    private static string ExtractRequired(Regex regex, string value, string fieldName)
    {
        var match = regex.Match(value);
        if (!match.Success)
        {
            throw new InvalidOperationException($"{fieldName} could not be extracted from Transfermarkt page.");
        }

        return match.Groups[1].Value;
    }

    private static string ExtractOptional(Regex regex, string value)
    {
        var match = regex.Match(value);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }

    private static string BuildDetailedSquadUrl(string transfermarktUrl, string? season)
    {
        if (!Uri.TryCreate(transfermarktUrl, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Host, "www.transfermarkt.com", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Transfermarkt URL must be an absolute www.transfermarkt.com URL.");
        }

        var teamId = ExtractRequired(TeamIdRegex(), uri.AbsolutePath, "Transfermarkt team id");
        var slug = ExtractSlug(uri.AbsolutePath);
        var seasonYear = ExtractSeasonYear(season) ?? ExtractOptional(SeasonRegex(), uri.AbsolutePath);
        if (string.IsNullOrWhiteSpace(seasonYear))
        {
            return transfermarktUrl;
        }

        return $"https://www.transfermarkt.com/{slug}/kader/verein/{teamId}/saison_id/{seasonYear}/plus/1";
    }

    private static string? ExtractSeasonYear(string? season)
    {
        if (string.IsNullOrWhiteSpace(season))
        {
            return null;
        }

        var match = YearRegex().Match(season);
        return match.Success ? match.Groups[1].Value : null;
    }

    private static string ExtractSlug(string absolutePath)
    {
        return absolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
    }

    private static string? ExtractSeason(string sourceUrl)
    {
        var match = SeasonRegex().Match(sourceUrl);
        return match.Success ? $"{match.Groups[1].Value}/{int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture) + 1}" : null;
    }

    private static string ExtractStadiumName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return Clean(StadiumSeatsRegex().Replace(value, string.Empty)) ?? string.Empty;
    }

    private static int? ExtractStadiumCapacity(string? value)
    {
        var match = StadiumSeatsRegex().Match(value ?? string.Empty);
        return match.Success ? ParseInt(match.Groups[1].Value) : null;
    }

    private static DateOnly? ParseDateOfBirth(string? value)
    {
        var match = DateAgeRegex().Match(value ?? string.Empty);
        return match.Success && DateOnly.TryParseExact(match.Groups[1].Value, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;
    }

    private static DateOnly? ParseDate(string? value)
    {
        return DateOnly.TryParseExact(value, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;
    }

    private static decimal? ParseHeightCm(string? value)
    {
        var match = DecimalRegex().Match(value ?? string.Empty);
        if (!match.Success ||
            !decimal.TryParse(match.Value.Replace(",", ".", StringComparison.Ordinal), NumberStyles.Number, CultureInfo.InvariantCulture, out var meters))
        {
            return null;
        }

        return RoundMetric(meters * 100m);
    }

    private static int? ParseAge(string? value)
    {
        var match = DateAgeRegex().Match(value ?? string.Empty);
        return match.Success && int.TryParse(match.Groups[2].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var age)
            ? age
            : null;
    }

    private static int? ParseInt(string? value)
    {
        var match = NumberRegex().Match(value ?? string.Empty);
        if (!match.Success)
        {
            return null;
        }

        var normalized = match.Value.Replace(".", string.Empty, StringComparison.Ordinal).Replace(",", string.Empty, StringComparison.Ordinal);
        return int.TryParse(normalized, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }

    private static decimal? ParseDecimal(string? value)
    {
        var match = DecimalRegex().Match(value ?? string.Empty);
        return match.Success && decimal.TryParse(match.Value.Replace(",", ".", StringComparison.Ordinal), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static decimal? ParsePercentage(string? value)
    {
        var match = PercentageRegex().Match(value ?? string.Empty);
        return match.Success && decimal.TryParse(match.Groups[1].Value.Replace(",", ".", StringComparison.Ordinal), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static decimal? ParseMoney(string? value)
    {
        var match = MoneyRegex().Match(value ?? string.Empty);
        if (!match.Success)
        {
            return null;
        }

        var signText = string.IsNullOrWhiteSpace(match.Groups["signBefore"].Value)
            ? match.Groups["signAfter"].Value
            : match.Groups["signBefore"].Value;
        var sign = signText == "-" ? -1m : 1m;
        var amount = decimal.Parse(match.Groups["amount"].Value.Replace(",", ".", StringComparison.Ordinal), CultureInfo.InvariantCulture);
        var suffix = match.Groups["suffix"].Value.ToLowerInvariant();
        var multiplier = suffix switch
        {
            "bn" => 1_000_000_000m,
            "m" => 1_000_000m,
            "k" => 1_000m,
            _ => 1m
        };

        return RoundMoney(sign * amount * multiplier);
    }

    private static string? Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return WhitespaceRegex().Replace(value, " ").Trim();
    }

    private static decimal Clamp(decimal value, decimal min, decimal max)
    {
        return Math.Min(Math.Max(value, min), max);
    }

    private static decimal RoundMetric(decimal value)
    {
        return decimal.Round(value, 4, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundRating(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal? RoundNullable(decimal? value)
    {
        return value.HasValue ? RoundMetric(value.Value) : null;
    }

    private static SquadQualitySnapshotDto ToSnapshotDto(SquadQualitySnapshot snapshot)
    {
        return new SquadQualitySnapshotDto(
            snapshot.Id,
            snapshot.TeamId,
            snapshot.Team.Name,
            snapshot.Team.Abbreviation,
            snapshot.Provider,
            snapshot.ExternalTeamId,
            snapshot.ExternalSlug,
            snapshot.SourceUrl,
            snapshot.Season,
            snapshot.FetchedAtUtc,
            snapshot.ClubName,
            snapshot.LeagueName,
            snapshot.LeagueLevel,
            snapshot.InLeagueSince,
            snapshot.StadiumName,
            snapshot.StadiumCapacity,
            snapshot.TransferRecordText,
            snapshot.TransferRecordValueEur,
            snapshot.SquadSize,
            snapshot.AverageAge,
            snapshot.ForeignersCount,
            snapshot.ForeignersPercentage,
            snapshot.NationalTeamPlayers,
            snapshot.TotalMarketValueEur,
            snapshot.AverageMarketValueEur,
            snapshot.TopElevenMarketValueEur,
            snapshot.TopFifteenMarketValueEur,
            snapshot.ValueWeightedAverageAge,
            snapshot.ValueWeightedContractYears,
            snapshot.PlayerCount);
    }

    [GeneratedRegex(@"/verein/(\d+)", RegexOptions.IgnoreCase)]
    private static partial Regex TeamIdRegex();

    [GeneratedRegex(@"/spieler/(\d+)", RegexOptions.IgnoreCase)]
    private static partial Regex PlayerIdRegex();

    [GeneratedRegex(@"/saison_id/(\d{4})", RegexOptions.IgnoreCase)]
    private static partial Regex SeasonRegex();

    [GeneratedRegex(@"(?<signBefore>[+-])?\s*[\u20AC\u00A3$]\s*(?<signAfter>[+-])?\s*(?<amount>\d+(?:[.,]\d+)?)\s*(?<suffix>bn|m|k)?", RegexOptions.IgnoreCase)]
    private static partial Regex MoneyRegex();

    [GeneratedRegex(@"(\d{4})")]
    private static partial Regex YearRegex();

    [GeneratedRegex(@"fee:\s*([^;]+)", RegexOptions.IgnoreCase)]
    private static partial Regex TransferFeeRegex();

    [GeneratedRegex(@"Abl\S*e\s*([^;]+)", RegexOptions.IgnoreCase)]
    private static partial Regex TransferAbloseRegex();

    [GeneratedRegex(@"(\d+(?:[.,]\d+)?)\s*%")]
    private static partial Regex PercentageRegex();

    [GeneratedRegex(@"\d+(?:[.,]\d+)?")]
    private static partial Regex DecimalRegex();

    [GeneratedRegex(@"\d+(?:[.,]\d+)?")]
    private static partial Regex NumberRegex();

    [GeneratedRegex(@"(\d{2}/\d{2}/\d{4})\s*\((\d+)\)")]
    private static partial Regex DateAgeRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();

    [GeneratedRegex(@"[\d.,]+\s*Seats", RegexOptions.IgnoreCase)]
    private static partial Regex StadiumSeatsRegex();

    private sealed record ParsedTransfermarktClub(
        string ExternalTeamId,
        string ExternalSlug,
        string SourceUrl,
        string? Season,
        string ClubName,
        string LeagueName,
        string LeagueLevel,
        string InLeagueSince,
        string StadiumName,
        int? StadiumCapacity,
        string TransferRecordText,
        decimal? TransferRecordValueEur,
        int? SquadSize,
        decimal? AverageAge,
        int? ForeignersCount,
        decimal? ForeignersPercentage,
        int? NationalTeamPlayers,
        decimal? TotalMarketValueEur,
        IReadOnlyList<ParsedTransfermarktPlayer> Players);

    private sealed record ParsedTransfermarktPlayer(
        string ExternalPlayerId,
        string ProfileUrl,
        string PlayerName,
        string PositionGroup,
        string Position,
        string ShirtNumber,
        DateOnly? DateOfBirth,
        int? Age,
        string Nationalities,
        decimal? HeightCm,
        string Foot,
        DateOnly? JoinedDate,
        string SignedFromClubName,
        string SignedFromExternalClubId,
        string SignedFromSeasonId,
        string TransferMovementText,
        string TransferFeeText,
        decimal? TransferFeeEur,
        DateOnly? ContractUntil,
        string MarketValueText,
        decimal? MarketValueEur);

    private sealed record TransferInfo(
        string SignedFromClubName,
        string SignedFromExternalClubId,
        string SignedFromSeasonId,
        string TransferMovementText,
        string TransferFeeText)
    {
        public static TransferInfo Empty { get; } = new(string.Empty, string.Empty, string.Empty, string.Empty, string.Empty);
    }

    private sealed record SquadQualityBaselines(
        decimal TopElevenMarketValueEur,
        decimal TopFifteenMarketValueEur,
        decimal TotalMarketValueEur,
        decimal NationalTeamPlayers,
        decimal ValueWeightedContractYears);

    private sealed record SquadQualityComponents(
        decimal? TopElevenScore,
        decimal? TopFifteenScore,
        decimal? TotalValueScore,
        decimal? NationalTeamPlayersScore,
        decimal? PrimeAgeScore,
        decimal? ContractStabilityScore,
        decimal? PositionalBalanceScore,
        decimal TotalScore)
    {
        public static SquadQualityComponents Empty { get; } = new(null, null, null, null, null, null, null, 0);
    }
}

