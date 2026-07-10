using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace FootballResults.Api.Extensions;

public static class DatabaseSeederExtensions
{
    public static async Task SeedIdentityAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var apiKeyService = scope.ServiceProvider.GetRequiredService<IApiKeyService>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("IdentitySeeder");

        foreach (var role in new[] { "User", "Admin" })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        var adminEmail = configuration["Auth:AdminEmail"] ?? "pudel1985@gmail.com";
        var adminPassword = configuration["Auth:AdminPassword"];
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogWarning("Admin user {AdminEmail} was not seeded because Auth:AdminPassword is missing.", adminEmail);
            return;
        }

        var admin = await userManager.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            var apiKey = apiKeyService.GenerateApiKey();
            admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                DisplayName = "Admin",
                ApiKeyHash = apiKeyService.HashApiKey(apiKey),
                ApiKeyCreatedAtUtc = DateTimeOffset.UtcNow
            };

            var created = await userManager.CreateAsync(admin, adminPassword);
            if (!created.Succeeded)
            {
                logger.LogError("Failed to create admin user: {Errors}", string.Join(", ", created.Errors.Select(error => error.Description)));
                return;
            }

            logger.LogInformation("Admin API key was created. Rotate it through the authenticated profile endpoint if it needs to be retrieved.");
        }

        if (!await userManager.IsInRoleAsync(admin, "Admin"))
        {
            await userManager.AddToRoleAsync(admin, "Admin");
        }
    }
}
