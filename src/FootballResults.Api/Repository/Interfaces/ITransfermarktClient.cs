namespace FootballResults.Api.Repository.Interfaces;

public interface ITransfermarktClient
{
    Task<string> GetClubPageAsync(string transfermarktUrl, CancellationToken cancellationToken);
}
