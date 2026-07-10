using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Services;

namespace FootballResults.Api.Repository.Interfaces;

public interface ILiveScoreClient
{
    Task<IReadOnlyList<LiveScoreFixtureRow>> GetCompetitionRowsAsync(
        Tournament tournament,
        LiveScoreListType listType,
        bool enrichScoreBreakdowns,
        IReadOnlySet<string> skipDetailEventIds,
        CancellationToken cancellationToken);

    Task<LiveScoreMatchStatisticsRow?> GetMatchStatisticsAsync(
        Tournament tournament,
        string eventId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<LiveScoreHistoricalMatchRow>> GetTeamDetailsRowsAsync(
        Tournament tournament,
        Team team,
        CancellationToken cancellationToken);
}
