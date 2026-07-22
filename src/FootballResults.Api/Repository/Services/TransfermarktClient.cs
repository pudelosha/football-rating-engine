using FootballResults.Api.Repository.Interfaces;

namespace FootballResults.Api.Repository.Services;

public sealed class TransfermarktClient(HttpClient httpClient) : ITransfermarktClient
{
    public async Task<string> GetClubPageAsync(string transfermarktUrl, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(transfermarktUrl, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Host, "www.transfermarkt.com", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Transfermarkt URL must be an absolute www.transfermarkt.com URL.");
        }

        using var response = await httpClient.GetAsync(uri, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}
