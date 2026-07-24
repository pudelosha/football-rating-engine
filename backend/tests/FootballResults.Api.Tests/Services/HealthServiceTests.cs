using FootballResults.Api.Repository.Services;
using Microsoft.Extensions.Hosting;

namespace FootballResults.Api.Tests.Services;

public sealed class HealthServiceTests
{
    [Fact]
    public void GetHealth_ReturnsApplicationStatus()
    {
        var environment = new TestHostEnvironment
        {
            ApplicationName = "FootballResults.Api",
            EnvironmentName = Environments.Development
        };
        var service = new HealthService(environment);

        var result = service.GetHealth();

        Assert.Equal("Healthy", result.Status);
        Assert.Equal("FootballResults.Api", result.Application);
        Assert.Equal(Environments.Development, result.Environment);
        Assert.True(result.CheckedAtUtc <= DateTimeOffset.UtcNow);
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
