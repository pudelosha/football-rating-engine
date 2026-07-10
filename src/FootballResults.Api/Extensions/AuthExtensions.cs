using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace FootballResults.Api.Extensions;

public static class AuthExtensions
{
    public const string ApiKeyOrAdminPolicy = "ApiKeyOrAdmin";
    public const string AdminPolicy = "AdminOnly";
    public const string UserPolicy = "UserOnly";

    public static IServiceCollection AddFootballResultsAuth(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<Model.Database.AppDbContext>()
        .AddDefaultTokenProviders();

        services.Configure<DataProtectionTokenProviderOptions>(options =>
        {
            options.TokenLifespan = TimeSpan.FromDays(7);
        });

        var jwtKey = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Missing Jwt:Key.");
        var jwtIssuer = configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Missing Jwt:Issuer.");
        var jwtAudience = configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Missing Jwt:Audience.");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                NameClaimType = ClaimTypes.NameIdentifier,
                RoleClaimType = ClaimTypes.Role,
                ClockSkew = TimeSpan.Zero
            };
        })
        .AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(
            ApiKeyAuthenticationDefaults.AuthenticationScheme,
            _ => { });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(AdminPolicy, policy =>
            {
                policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme);
                policy.RequireRole("Admin");
            });

            options.AddPolicy(UserPolicy, policy =>
            {
                policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme);
                policy.RequireRole("User", "Admin");
            });

            options.AddPolicy(ApiKeyOrAdminPolicy, policy =>
            {
                policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, ApiKeyAuthenticationDefaults.AuthenticationScheme);
                policy.RequireAssertion(context =>
                    context.User.IsInRole("Admin") ||
                    context.User.HasClaim("api_key_valid", "true"));
            });
        });

        return services;
    }
}
