using FootballResults.Api.DTOs;
using FootballResults.Api.Repository.Interfaces;
using FootballResults.Api.Repository.Services;
using FootballResults.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Tests.Services;

public sealed class SquadQualityServiceTests
{
    [Fact]
    public async Task ImportTransfermarktSquadAsync_NormalizesDetailedUrlAndParsesPlayers()
    {
        await using var dbContext = ServiceTestData.CreateDbContext("squad-quality-transfermarkt");
        var team = ServiceTestData.Team("Manchester United", "MUN");
        dbContext.Teams.Add(team);
        await dbContext.SaveChangesAsync();

        var client = new FakeTransfermarktClient(TransfermarktHtml());
        var service = new SquadQualityService(dbContext, client);

        var response = await service.ImportTransfermarktSquadAsync(
            team.Id,
            new ImportTransfermarktSquadRequest("https://www.transfermarkt.com/manchester-united/startseite/verein/985", "2026/2027"),
            CancellationToken.None);

        Assert.Equal("https://www.transfermarkt.com/manchester-united/kader/verein/985/saison_id/2026/plus/1", client.LastUrl);
        Assert.Equal("985", response.ExternalTeamId);
        Assert.Equal("manchester-united", response.ExternalSlug);
        Assert.Equal("Manchester United", response.ClubName);
        Assert.Equal("2026/2027", response.Season);
        Assert.Equal(2, response.PlayerCount);
        Assert.Equal(80_000_000m, response.TotalMarketValueEur);
        Assert.Equal(80_000_000m, response.TopElevenMarketValueEur);

        var snapshot = await dbContext.SquadQualitySnapshots
            .Include(snapshot => snapshot.Players)
            .SingleAsync();
        Assert.Equal("Premier League", snapshot.LeagueName);
        Assert.Equal("First Tier", snapshot.LeagueLevel);
        Assert.Equal(2, snapshot.SquadSize);
        Assert.Equal(25.5m, snapshot.AverageAge);
        Assert.Equal(1, snapshot.ForeignersCount);
        Assert.Equal(50m, snapshot.ForeignersPercentage);
        Assert.Equal(2, snapshot.Players.Count);
        Assert.Contains(snapshot.Players, player =>
            player.ExternalPlayerId == "258923" &&
            player.PlayerName == "Marcus Rashford" &&
            player.Age == 28 &&
            player.MarketValueEur == 50_000_000m);
        Assert.Contains(snapshot.Players, player =>
            player.ExternalPlayerId == "654321" &&
            player.PositionGroup == "Midfield" &&
            player.MarketValueEur == 30_000_000m);
    }

    private static string TransfermarktHtml()
    {
        return """
            <html>
              <body>
                <h1 class="data-header__headline-wrapper">Manchester United</h1>
                <header class="data-header">
                  <span class="data-header__market-value-wrapper">€80.00m</span>
                  <span class="data-header__box__club-link">Premier League</span>
                  <div class="data-header__label">League level:<span class="data-header__content">First Tier</span></div>
                  <div class="data-header__label">In league since:<span class="data-header__content">32 years</span></div>
                  <div class="data-header__label">Stadium:<span class="data-header__content">Old Trafford 30000 Seats</span></div>
                  <div class="data-header__label">Current transfer record:<span class="data-header__content">€-20.00m</span></div>
                  <div class="data-header__label">Squad size:<span class="data-header__content">2</span></div>
                  <div class="data-header__label">Average age:<span class="data-header__content">25.5</span></div>
                  <div class="data-header__label">Foreigners:<span class="data-header__content">1 50.0%</span></div>
                  <div class="data-header__label">National team players:<span class="data-header__content">2</span></div>
                </header>
                <table class="items">
                  <tbody>
                    <tr>
                      <td title="Attack">9</td>
                      <td class="posrela">
                        <table class="inline-table">
                          <tr><td><a href="/marcus-rashford/profil/spieler/258923">Marcus Rashford</a></td></tr>
                          <tr><td>Left Winger</td></tr>
                        </table>
                      </td>
                      <td>31/10/1997 (28)</td>
                      <td><img class="flaggenrahmen" title="England"></td>
                      <td>1,80 m</td>
                      <td>right</td>
                      <td>01/07/2016</td>
                      <td><a href="/academy/startseite/verein/5242/saison_id/2016" title="academy; fee: €0"><img alt="Academy"></a></td>
                      <td>30/06/2028</td>
                      <td>€50.00m</td>
                    </tr>
                    <tr>
                      <td title="Midfield">8</td>
                      <td class="posrela">
                        <table class="inline-table">
                          <tr><td><a href="/kobbie-mainoo/profil/spieler/654321">Kobbie Mainoo</a></td></tr>
                          <tr><td>Central Midfield</td></tr>
                        </table>
                      </td>
                      <td>19/04/2005 (21)</td>
                      <td><img class="flaggenrahmen" title="England"></td>
                      <td>1,75 m</td>
                      <td>right</td>
                      <td>01/07/2023</td>
                      <td><a href="/academy/startseite/verein/5242/saison_id/2023" title="academy; fee: €0"><img alt="Academy"></a></td>
                      <td>30/06/2029</td>
                      <td>€30.00m</td>
                    </tr>
                    <tr>
                      <td title="Attack">9</td>
                      <td class="posrela">
                        <table class="inline-table">
                          <tr><td><a href="/marcus-rashford/profil/spieler/258923">Marcus Rashford</a></td></tr>
                          <tr><td>Left Winger</td></tr>
                        </table>
                      </td>
                      <td>31/10/1997 (28)</td>
                      <td><img class="flaggenrahmen" title="England"></td>
                      <td>1,80 m</td>
                      <td>right</td>
                      <td>01/07/2016</td>
                      <td></td>
                      <td>30/06/2028</td>
                      <td>€50.00m</td>
                    </tr>
                  </tbody>
                </table>
              </body>
            </html>
            """;
    }

    private sealed class FakeTransfermarktClient(string html) : ITransfermarktClient
    {
        public string? LastUrl { get; private set; }

        public Task<string> GetClubPageAsync(string transfermarktUrl, CancellationToken cancellationToken)
        {
            LastUrl = transfermarktUrl;
            return Task.FromResult(html);
        }
    }
}
