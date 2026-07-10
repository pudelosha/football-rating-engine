using FootballResults.Api.DTOs;
using FootballResults.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;

namespace FootballResults.Api.Tests.Controllers;

public sealed class AuthEndpointTests
{
    [Fact]
    public async Task Register_ReturnsApiKey_AndLoginReturnsJwt()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword, "User One"));
        var registerResponse = await register.Content.ReadFromJsonAsync<RegisterResponse>();

        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        Assert.True(registerResponse!.Success);
        Assert.StartsWith("fr_", registerResponse.ApiKey);

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, FootballResultsApiFactory.UserPassword));
        var loginResponse = await login.Content.ReadFromJsonAsync<LoginResponse>();

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.True(loginResponse!.Success);
        Assert.False(string.IsNullOrWhiteSpace(loginResponse.Token));
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsBadRequest()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        var email = $"duplicate-{Guid.NewGuid():N}@example.com";

        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword));
        var duplicate = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword));

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task Login_WithBadPassword_ReturnsUnauthorized()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        var email = $"bad-login-{Guid.NewGuid():N}@example.com";

        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword));
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "wrong-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task UserProfile_CanBeReadUpdated_AndApiKeyRotated()
    {
        await using var factory = new FootballResultsApiFactory();
        var (client, firstApiKey) = await factory.CreateUserClientAsync($"profile-{Guid.NewGuid():N}@example.com");

        var getProfile = await client.GetAsync("/api/users/me");
        var profile = await getProfile.Content.ReadFromJsonAsync<UserProfileDto>();
        Assert.Equal(HttpStatusCode.OK, getProfile.StatusCode);
        Assert.Equal("Test User", profile!.DisplayName);

        var update = await client.PutAsJsonAsync("/api/users/me", new UpdateUserProfileRequest("Updated User"));
        Assert.Equal(HttpStatusCode.NoContent, update.StatusCode);

        var rotate = await client.PostAsync("/api/users/me/rotate-api-key", null);
        var rotated = await rotate.Content.ReadFromJsonAsync<RotateApiKeyResponse>();
        Assert.Equal(HttpStatusCode.OK, rotate.StatusCode);
        Assert.StartsWith("fr_", rotated!.ApiKey);
        Assert.NotEqual(firstApiKey, rotated.ApiKey);
    }

    [Fact]
    public async Task User_CanChangePassword_AndLoginWithNewPassword()
    {
        await using var factory = new FootballResultsApiFactory();
        var email = $"password-{Guid.NewGuid():N}@example.com";
        var (client, _) = await factory.CreateUserClientAsync(email);

        var change = await client.PostAsJsonAsync("/api/users/me/change-password", new ChangePasswordRequest(FootballResultsApiFactory.UserPassword, "NewPassword123!"));
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        var login = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "NewPassword123!"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_InDevelopmentReturnsResetToken_AndResetAllowsLogin()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        var email = $"reset-{Guid.NewGuid():N}@example.com";
        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword));

        var forgot = await client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(email));
        var forgotResponse = await forgot.Content.ReadFromJsonAsync<ForgotPasswordResponse>();
        Assert.Equal(HttpStatusCode.OK, forgot.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(forgotResponse!.UserId));
        Assert.False(string.IsNullOrWhiteSpace(forgotResponse.ResetToken));

        var reset = await client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(forgotResponse.UserId!, forgotResponse.ResetToken!, "ResetPassword123!"));
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "ResetPassword123!"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task ResendConfirmationEmail_ForUnconfirmedUser_ReturnsOk()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        var email = $"resend-{Guid.NewGuid():N}@example.com";
        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword));

        var response = await client.PostAsJsonAsync("/api/auth/resend-confirmation-email", new ResendConfirmationEmailRequest(email));
        var body = await response.Content.ReadFromJsonAsync<AuthActionResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(body!.Success);
    }

    [Fact]
    public async Task ResendConfirmationEmail_ForMissingUser_ReturnsOk()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/resend-confirmation-email",
            new ResendConfirmationEmailRequest($"missing-{Guid.NewGuid():N}@example.com"));
        var body = await response.Content.ReadFromJsonAsync<AuthActionResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(body!.Success);
    }

    [Fact]
    public async Task ResendConfirmationEmail_ForConfirmedUser_ReturnsOk()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();
        var email = $"confirmed-{Guid.NewGuid():N}@example.com";
        var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, FootballResultsApiFactory.UserPassword));
        register.EnsureSuccessStatusCode();

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FootballResults.Api.Model.Database.AppDbContext>();
        var user = await dbContext.Users.FirstAsync(user => user.Email == email);
        user.EmailConfirmed = true;
        await dbContext.SaveChangesAsync();

        var response = await client.PostAsJsonAsync("/api/auth/resend-confirmation-email", new ResendConfirmationEmailRequest(email));
        var body = await response.Content.ReadFromJsonAsync<AuthActionResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(body!.Success);
    }

    [Fact]
    public async Task ConfirmEmail_GetEndpoint_ReturnsBadRequestForInvalidToken()
    {
        await using var factory = new FootballResultsApiFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/confirm-email?userId=missing-user&token=v2_invalid");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
