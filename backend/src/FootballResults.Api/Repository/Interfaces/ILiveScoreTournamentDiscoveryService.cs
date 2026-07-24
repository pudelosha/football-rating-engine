using FootballResults.Api.DTOs;

namespace FootballResults.Api.Repository.Interfaces;

public interface ILiveScoreTournamentDiscoveryService
{
    Task<TournamentPreviewDto> PreviewAsync(
        string liveScoreUrl,
        string locale,
        string timezoneOffset,
        CancellationToken cancellationToken);

    Task<LiveScoreTournamentDiscoveryResult> DiscoverAsync(
        string liveScoreUrl,
        string locale,
        string timezoneOffset,
        CancellationToken cancellationToken);
}

public sealed record LiveScoreTournamentDiscoveryResult(
    string LiveScoreCompetitionId,
    string Name,
    string CompetitionName,
    string CompetitionCountry,
    string CompetitionUrlName,
    string CategoryCode,
    string CategoryName,
    string CategoryTransliteratedName,
    string BaseUrl,
    string FixturesUrl,
    string ResultsUrl,
    string ApiBaseUrl,
    string Locale,
    string TimezoneOffset)
{
    public TournamentPreviewDto ToPublicPreview()
    {
        return new TournamentPreviewDto(
            Name,
            CompetitionName,
            CompetitionCountry,
            CategoryCode,
            CategoryName,
            CategoryTransliteratedName,
            Locale,
            TimezoneOffset);
    }
}
