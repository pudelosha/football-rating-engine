using FootballResults.Api.Model.Database;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Extensions;

public static class DatabaseExtensions
{
    public static IServiceCollection AddDatabase(
        this IServiceCollection services,
        string? connectionString,
        IWebHostEnvironment environment,
        IConfiguration configuration)
    {
        if (configuration.GetValue<bool>("Testing:UseInMemoryDatabase"))
        {
            var databaseName = configuration["Testing:InMemoryDatabaseName"] ?? "FootballResultsTests";
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));

            return services;
        }

        if (environment.IsDevelopment() && string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase("FootballResultsDev"));

            return services;
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Missing connection string: ConnectionStrings:DefaultConnection");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString));

        return services;
    }
}
