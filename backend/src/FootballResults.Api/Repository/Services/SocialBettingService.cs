using FootballResults.Api.DTOs;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using FootballResults.Api.Repository.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace FootballResults.Api.Repository.Services;

public sealed class SocialBettingService(
    AppDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    IApiKeyService apiKeyService,
    IEmailService emailService,
    ILogger<SocialBettingService> logger) : ISocialBettingService
{
    private static readonly TimeSpan InvitationLifetime = TimeSpan.FromDays(14);

    public async Task<IReadOnlyList<SocialBettingTournamentSummaryDto>> GetTournamentsAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var tournaments = await dbContext.SocialBettingTournaments
            .AsNoTracking()
            .Include(tournament => tournament.SourceTournament)
            .Include(tournament => tournament.Participants)
            .Where(tournament => tournament.Participants.Any(participant =>
                participant.UserId == userId && participant.Status != SocialBettingParticipantStatus.Removed))
            .OrderByDescending(tournament => tournament.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return tournaments.Select(tournament =>
        {
            var participant = tournament.Participants.First(participant => participant.UserId == userId);
            return new SocialBettingTournamentSummaryDto(
                tournament.Id,
                tournament.SourceTournamentId,
                tournament.Name,
                tournament.SourceTournament.Name,
                tournament.SourceTournament.Season,
                participant.Role.ToString(),
                participant.Status.ToString(),
                tournament.Participants.Count(participant => participant.Status != SocialBettingParticipantStatus.Removed),
                tournament.IsActive);
        }).ToList();
    }

    public async Task<SocialBettingTournamentDto?> GetTournamentAsync(
        int id,
        string userId,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(id, cancellationToken);
        if (tournament is null || !CanView(tournament, userId))
        {
            return null;
        }

        return ToDto(tournament, userId);
    }

    public async Task<SocialBettingTournamentDto> CreateTournamentAsync(
        string userId,
        CreateSocialBettingTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var sourceTournamentExists = await dbContext.Tournaments
            .AnyAsync(tournament => tournament.Id == request.SourceTournamentId, cancellationToken);
        if (!sourceTournamentExists)
        {
            throw new InvalidOperationException("Source tournament was not found.");
        }

        var creator = await userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User was not found.");

        var now = DateTimeOffset.UtcNow;
        var tournament = new SocialBettingTournament
        {
            SourceTournamentId = request.SourceTournamentId,
            CreatedByUserId = userId,
            Name = request.Name.Trim(),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        ApplySettings(tournament, request.Settings);

        tournament.Participants.Add(new SocialBettingParticipant
        {
            UserId = userId,
            Email = creator.Email ?? string.Empty,
            Nickname = creator.DisplayName,
            Role = SocialBettingParticipantRole.Admin,
            Status = SocialBettingParticipantStatus.Accepted,
            InvitedAtUtc = now,
            AcceptedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });

        dbContext.SocialBettingTournaments.Add(tournament);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (request.Participants is { Count: > 0 })
        {
            foreach (var participant in request.Participants)
            {
                await InviteParticipantAsync(tournament, participant, request.Language, cancellationToken);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var saved = await LoadTournamentAsync(tournament.Id, cancellationToken)
            ?? throw new InvalidOperationException("Created tournament could not be loaded.");
        return ToDto(saved, userId);
    }

    public async Task<SocialBettingTournamentDto?> UpdateTournamentAsync(
        int id,
        string userId,
        UpdateSocialBettingTournamentRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(id, cancellationToken);
        if (tournament is null || !CanAdminister(tournament, userId))
        {
            return null;
        }

        tournament.Name = request.Name.Trim();
        tournament.UpdatedAtUtc = DateTimeOffset.UtcNow;
        ApplySettings(tournament, request.Settings);

        if (request.Participants is not null)
        {
            var submittedEmails = request.Participants
                .Select(participant => participant.Email.Trim().ToLowerInvariant())
                .Where(email => !string.IsNullOrWhiteSpace(email))
                .ToHashSet();

            foreach (var participant in request.Participants)
            {
                await InviteParticipantAsync(tournament, participant, request.Language, cancellationToken);
            }

            foreach (var existingParticipant in tournament.Participants.Where(participant =>
                participant.Role != SocialBettingParticipantRole.Admin &&
                participant.Status != SocialBettingParticipantStatus.Removed &&
                !submittedEmails.Contains(participant.Email.ToLowerInvariant())))
            {
                existingParticipant.Status = SocialBettingParticipantStatus.Removed;
                existingParticipant.UpdatedAtUtc = DateTimeOffset.UtcNow;
                existingParticipant.InvitationTokenHash = null;
                existingParticipant.InvitationExpiresAtUtc = null;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(tournament, userId);
    }

    public async Task<SocialBettingParticipantDto?> AddParticipantAsync(
        int tournamentId,
        string userId,
        AddSocialBettingParticipantRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(tournamentId, cancellationToken);
        if (tournament is null || !CanAdminister(tournament, userId))
        {
            return null;
        }

        var participant = await InviteParticipantAsync(
            tournament,
            new UpsertSocialBettingParticipantRequest(request.Email, request.Nickname),
            request.Language,
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(participant);
    }

    public async Task<SocialBettingParticipantDto?> ResendInvitationAsync(
        int tournamentId,
        int participantId,
        string userId,
        string? language,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(tournamentId, cancellationToken);
        if (tournament is null || !CanAdminister(tournament, userId))
        {
            return null;
        }

        var participant = tournament.Participants.FirstOrDefault(participant => participant.Id == participantId);
        if (participant is null || participant.Status == SocialBettingParticipantStatus.Removed)
        {
            return null;
        }

        var token = CreateInviteToken();
        var now = DateTimeOffset.UtcNow;
        participant.InvitationTokenHash = HashToken(token);
        participant.InvitationExpiresAtUtc = now.Add(InvitationLifetime);
        participant.InvitedAtUtc = now;
        participant.UpdatedAtUtc = now;
        if (participant.Status != SocialBettingParticipantStatus.Accepted)
        {
            participant.Status = SocialBettingParticipantStatus.Pending;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await emailService.SendSocialBettingInvitationEmailAsync(
                participant.User,
                tournament.Name,
                participant.Id,
                token,
                !await userManager.HasPasswordAsync(participant.User),
                language);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Social betting invitation could not be resent to {Email}.", participant.Email);
        }

        return ToDto(participant);
    }

    public async Task<SocialBettingTournamentSummaryDto?> ConfirmParticipationAsync(
        int tournamentId,
        string userId,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(tournamentId, cancellationToken);
        if (tournament is null)
        {
            return null;
        }

        var participant = tournament.Participants.FirstOrDefault(participant =>
            participant.UserId == userId && participant.Status == SocialBettingParticipantStatus.Pending);
        if (participant is null)
        {
            return null;
        }

        participant.Status = SocialBettingParticipantStatus.Accepted;
        participant.AcceptedAtUtc = DateTimeOffset.UtcNow;
        participant.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return new SocialBettingTournamentSummaryDto(
            tournament.Id,
            tournament.SourceTournamentId,
            tournament.Name,
            tournament.SourceTournament.Name,
            tournament.SourceTournament.Season,
            participant.Role.ToString(),
            participant.Status.ToString(),
            tournament.Participants.Count(participant => participant.Status != SocialBettingParticipantStatus.Removed),
            tournament.IsActive);
    }

    public async Task<bool> AcceptInvitationAsync(
        AcceptSocialBettingInvitationRequest request,
        CancellationToken cancellationToken)
    {
        var participant = await dbContext.SocialBettingParticipants
            .Include(participant => participant.User)
            .FirstOrDefaultAsync(participant => participant.Id == request.ParticipantId, cancellationToken);

        if (participant is null ||
            participant.InvitationTokenHash is null ||
            participant.InvitationExpiresAtUtc < DateTimeOffset.UtcNow)
        {
            return false;
        }

        string decodedToken;
        try
        {
            decodedToken = IdentityTokenUrlDecoder.Decode(request.Token);
        }
        catch (FormatException)
        {
            return false;
        }

        if (participant.InvitationTokenHash != HashToken(decodedToken))
        {
            return false;
        }

        if (!participant.User.EmailConfirmed)
        {
            participant.User.EmailConfirmed = true;
        }

        if (!await userManager.HasPasswordAsync(participant.User))
        {
            var passwordResult = await userManager.AddPasswordAsync(participant.User, request.Password);
            if (!passwordResult.Succeeded)
            {
                return false;
            }
        }

        participant.InvitationTokenHash = null;
        participant.InvitationExpiresAtUtc = null;
        participant.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task<SocialBettingParticipant> InviteParticipantAsync(
        SocialBettingTournament tournament,
        UpsertSocialBettingParticipantRequest request,
        string? language,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var existingParticipant = tournament.Participants.FirstOrDefault(participant =>
            participant.Email.ToLower() == email || participant.User?.Email?.ToLower() == email);
        if (existingParticipant is not null)
        {
            existingParticipant.Nickname = string.IsNullOrWhiteSpace(request.Nickname) ? existingParticipant.Nickname : request.Nickname.Trim();
            existingParticipant.Status = existingParticipant.Status == SocialBettingParticipantStatus.Removed
                ? SocialBettingParticipantStatus.Pending
                : existingParticipant.Status;
            existingParticipant.UpdatedAtUtc = DateTimeOffset.UtcNow;
            return existingParticipant;
        }

        var user = await userManager.FindByEmailAsync(email);
        var requiresPasswordSetup = false;
        if (user is null)
        {
            requiresPasswordSetup = true;
            var apiKey = apiKeyService.GenerateApiKey();
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                DisplayName = request.Nickname?.Trim(),
                EmailConfirmed = false,
                ApiKeyHash = apiKeyService.HashApiKey(apiKey),
                ApiKeyCreatedAtUtc = DateTimeOffset.UtcNow,
                MemberSinceUtc = DateTimeOffset.UtcNow
            };

            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join(" ", createResult.Errors.Select(error => error.Description)));
            }

            await userManager.AddToRoleAsync(user, "User");
        }

        var token = CreateInviteToken();
        var now = DateTimeOffset.UtcNow;
        var participant = new SocialBettingParticipant
        {
            SocialBettingTournamentId = tournament.Id,
            UserId = user.Id,
            Email = user.Email ?? email,
            Nickname = request.Nickname?.Trim() ?? user.DisplayName,
            Role = SocialBettingParticipantRole.Player,
            Status = SocialBettingParticipantStatus.Pending,
            InvitationTokenHash = HashToken(token),
            InvitationExpiresAtUtc = now.Add(InvitationLifetime),
            InvitedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        tournament.Participants.Add(participant);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await emailService.SendSocialBettingInvitationEmailAsync(
                user,
                tournament.Name,
                participant.Id,
                token,
                requiresPasswordSetup || !await userManager.HasPasswordAsync(user),
                language);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Social betting invitation could not be sent to {Email}.", email);
        }

        return participant;
    }

    private Task<SocialBettingTournament?> LoadTournamentAsync(int id, CancellationToken cancellationToken)
    {
        return dbContext.SocialBettingTournaments
            .Include(tournament => tournament.SourceTournament)
            .Include(tournament => tournament.Participants)
            .ThenInclude(participant => participant.User)
            .FirstOrDefaultAsync(tournament => tournament.Id == id, cancellationToken);
    }

    private static bool CanView(SocialBettingTournament tournament, string userId)
    {
        return tournament.Participants.Any(participant =>
            participant.UserId == userId && participant.Status != SocialBettingParticipantStatus.Removed);
    }

    private static bool CanAdminister(SocialBettingTournament tournament, string userId)
    {
        return tournament.Participants.Any(participant =>
            participant.UserId == userId &&
            participant.Role == SocialBettingParticipantRole.Admin &&
            participant.Status == SocialBettingParticipantStatus.Accepted);
    }

    private static void ApplySettings(SocialBettingTournament tournament, SocialBettingTournamentSettingsDto settings)
    {
        tournament.AllowExactScoreBonus = settings.AllowExactScoreBonus;
        tournament.ExactScoreBonusMode = ParseExactScoreBonusMode(settings.ExactScoreBonusMode);
        tournament.ExactScoreBonusValue = decimal.Round(Math.Max(0, settings.ExactScoreBonusValue), 2);
        tournament.ExactScoreOddsMultiplier = decimal.Round(Math.Max(0, settings.ExactScoreOddsMultiplier), 4);
        tournament.AllowQualificationPick = settings.AllowQualificationPick;
        tournament.ApplyMissingBetPenalty = settings.ApplyMissingBetPenalty;
        tournament.MissingBetPenalty = decimal.Round(Math.Clamp(settings.MissingBetPenalty, -10, 0), 2);
        tournament.PoolMode = ParsePoolMode(settings.PoolMode);
        tournament.BaseBetAmount = decimal.Round(Math.Max(1, settings.BaseBetAmount), 2);
        tournament.StartingCredits = decimal.Round(Math.Max(1, settings.StartingCredits), 2);
        tournament.MaxBetPerGame = decimal.Round(Math.Max(1, settings.MaxBetPerGame), 2);
    }

    private static SocialBettingExactScoreBonusMode ParseExactScoreBonusMode(string? value)
    {
        return Enum.TryParse<SocialBettingExactScoreBonusMode>(value, ignoreCase: true, out var mode)
            ? mode
            : SocialBettingExactScoreBonusMode.FixedValue;
    }

    private static SocialBettingPoolMode ParsePoolMode(string? value)
    {
        return Enum.TryParse<SocialBettingPoolMode>(value, ignoreCase: true, out var mode)
            ? mode
            : SocialBettingPoolMode.FixedBaseAmount;
    }

    private static SocialBettingTournamentDto ToDto(SocialBettingTournament tournament, string userId)
    {
        var participant = tournament.Participants.FirstOrDefault(participant => participant.UserId == userId);
        return new SocialBettingTournamentDto(
            tournament.Id,
            tournament.SourceTournamentId,
            tournament.Name,
            tournament.SourceTournament.Name,
            tournament.SourceTournament.Season,
            participant?.Role.ToString() ?? SocialBettingParticipantRole.Player.ToString(),
            tournament.Participants.Count(participant => participant.Status != SocialBettingParticipantStatus.Removed),
            tournament.IsActive,
            new SocialBettingTournamentSettingsDto(
                tournament.AllowExactScoreBonus,
                tournament.ExactScoreBonusMode.ToString(),
                tournament.ExactScoreBonusValue,
                tournament.ExactScoreOddsMultiplier,
                tournament.AllowQualificationPick,
                tournament.ApplyMissingBetPenalty,
                tournament.MissingBetPenalty,
                tournament.PoolMode.ToString(),
                tournament.BaseBetAmount,
                tournament.StartingCredits,
                tournament.MaxBetPerGame),
            tournament.Participants
                .Where(participant => participant.Status != SocialBettingParticipantStatus.Removed)
                .OrderBy(participant => participant.Role)
                .ThenBy(participant => participant.Nickname ?? participant.Email)
                .Select(ToDto)
                .ToList());
    }

    private static SocialBettingParticipantDto ToDto(SocialBettingParticipant participant)
    {
        return new SocialBettingParticipantDto(
            participant.Id,
            participant.UserId,
            participant.Email,
            participant.Nickname ?? participant.User?.DisplayName ?? participant.Email,
            participant.Role.ToString(),
            participant.Status.ToString(),
            participant.InvitedAtUtc,
            participant.AcceptedAtUtc);
    }

    private static string CreateInviteToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}
