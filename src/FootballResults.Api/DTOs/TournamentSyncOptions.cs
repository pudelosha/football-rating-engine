namespace FootballResults.Api.DTOs;

public sealed class TournamentSyncOptions
{
    public bool EnableScheduleSync { get; set; }
    public bool EnableLiveSync { get; set; }
    public bool EnableFinalizeSync { get; set; }
    public bool EnableResultsSync { get; set; }
    public int ScheduleIntervalSeconds { get; set; } = 3600;
    public int LiveIntervalSeconds { get; set; } = 60;
    public int FinalizeIntervalSeconds { get; set; } = 60;
    public int ResultsIntervalSeconds { get; set; } = 86400;
    public int LiveStartsBeforeMinutes { get; set; } = 5;
    public int StatisticsDelayAfterFinishedMinutes { get; set; } = 60;
}
