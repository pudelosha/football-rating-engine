namespace FootballResults.Api.Model.Entities;

public enum MatchSyncState
{
    Unknown = 0,
    Scheduled = 1,
    Live = 2,
    Finalized = 3,
    Postponed = 4,
    Cancelled = 5
}
