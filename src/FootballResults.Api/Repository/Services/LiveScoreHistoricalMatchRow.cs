using FootballResults.Api.Model.Entities;

namespace FootballResults.Api.Repository.Services;

public sealed record LiveScoreHistoricalMatchRow(
    string EventId,
    string CompetitionId,
    string CompetitionName,
    string CompetitionCountry,
    string SeasonName,
    string StageName,
    string StageCode,
    DateTimeOffset? KickoffUtc,
    string HomeTeam,
    string AwayTeam,
    string HomeAbbr,
    string AwayAbbr,
    string HomeTeamId,
    string AwayTeamId,
    int? HomeScore,
    int? AwayScore,
    int? RegularHomeScore,
    int? RegularAwayScore,
    MatchStatus Status,
    string StatusRaw,
    string RoundInfo,
    string SourceEndpoint);
