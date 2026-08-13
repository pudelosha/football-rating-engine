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
    IMatchPredictionSnapshotService matchPredictionSnapshotService,
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

    public async Task<SocialBettingResultsDto?> GetResultsAsync(
        int id,
        string userId,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(id, cancellationToken);
        if (tournament is null || !CanView(tournament, userId))
        {
            return null;
        }

        var acceptedParticipants = tournament.Participants
            .Where(participant => participant.Status == SocialBettingParticipantStatus.Accepted)
            .OrderBy(participant => participant.Nickname ?? participant.Email)
            .ToList();
        var participantIds = acceptedParticipants.Select(participant => participant.Id).ToList();
        var finishedMatches = await dbContext.Matches
            .AsNoTracking()
            .Where(match =>
                match.TournamentId == tournament.SourceTournamentId &&
                match.Status == MatchStatus.Finished &&
                match.RegularTimeHomeScore.HasValue &&
                match.RegularTimeAwayScore.HasValue)
            .OrderBy(match => match.KickoffUtc)
            .ThenBy(match => match.Id)
            .Select(match => new SocialBettingFinishedMatch(
                match.Id,
                match.KickoffUtc,
                match.RegularTimeHomeScore!.Value,
                match.RegularTimeAwayScore!.Value))
            .ToListAsync(cancellationToken);
        var finishedMatchIds = finishedMatches.Select(match => match.Id).ToList();
        var picks = await dbContext.SocialBettingPicks
            .AsNoTracking()
            .Where(pick =>
                pick.SocialBettingTournamentId == id &&
                participantIds.Contains(pick.ParticipantId) &&
                finishedMatchIds.Contains(pick.MatchId))
            .ToListAsync(cancellationToken);
        var picksByParticipant = picks
            .GroupBy(pick => pick.ParticipantId)
            .ToDictionary(group => group.Key, group => group.ToList());
        var matchById = finishedMatches.ToDictionary(match => match.Id);

        var rawRows = acceptedParticipants.Select(participant =>
        {
            picksByParticipant.TryGetValue(participant.Id, out var participantPicks);
            participantPicks ??= [];
            var settledPicks = participantPicks
                .Where(pick => pick.HomeScorePrediction.HasValue && pick.AwayScorePrediction.HasValue)
                .ToList();
            var wonPicks = 0;
            var drawPicks = 0;
            var failedPicks = 0;
            var points = 0m;

            foreach (var pick in settledPicks)
            {
                var match = matchById[pick.MatchId];
                var outcomeMatched = Outcome(match.HomeScore, match.AwayScore) ==
                    Outcome(pick.HomeScorePrediction!.Value, pick.AwayScorePrediction!.Value);
                var exactScoreMatched = pick.HomeScorePrediction == match.HomeScore && pick.AwayScorePrediction == match.AwayScore;

                if (!outcomeMatched)
                {
                    failedPicks++;
                    continue;
                }

                if (match.HomeScore == match.AwayScore)
                {
                    drawPicks++;
                }
                else
                {
                    wonPicks++;
                }

                points += pick.PointsAwarded ?? CalculatePickPoints(tournament, pick, match, exactScoreMatched);
            }

            var missedFinishedMatches = finishedMatches.Count - settledPicks.Select(pick => pick.MatchId).Distinct().Count();
            failedPicks += missedFinishedMatches;
            if (tournament.ApplyMissingBetPenalty)
            {
                points += missedFinishedMatches * tournament.MissingBetPenalty;
            }

            var placed = settledPicks.Count + missedFinishedMatches;
            return new SocialBettingResultsRow(
                participant.Nickname ?? participant.User.DisplayName ?? participant.Email,
                placed == 0 ? 0 : decimal.Round((decimal)(wonPicks + drawPicks) / placed * 100m, 0),
                wonPicks + drawPicks,
                decimal.Round(points, 2),
                Percentage(wonPicks, placed),
                Percentage(drawPicks, placed),
                Percentage(failedPicks, placed),
                PointsGrowth(participantPicks, finishedMatches, tournament));
        }).ToList();

        var orderedRows = rawRows
            .OrderByDescending(row => row.Result)
            .ThenByDescending(row => row.Accuracy)
            .ThenBy(row => row.UserName)
            .ToList();
        var standings = orderedRows
            .Select((row, index) => new SocialBettingStandingRowDto(
                index + 1,
                row.UserName,
                row.Accuracy,
                row.SuccessfulBets,
                row.Result,
                "stable",
                new SocialBettingPointsSplitDto(row.WinSplit, row.DrawSplit, row.FailedSplit)))
            .ToList();
        var growth = orderedRows
            .Select(row => new SocialBettingPointsGrowthSeriesDto(row.UserName, row.PointsGrowth))
            .ToList();

        return new SocialBettingResultsDto(standings, growth);
    }

    public async Task<IReadOnlyList<SocialBettingOutstandingBetDto>?> GetOutstandingBetsAsync(
        int id,
        string userId,
        int limit,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(id, cancellationToken);
        if (tournament is null || !CanView(tournament, userId))
        {
            return null;
        }

        var participant = tournament.Participants.FirstOrDefault(participant =>
            participant.UserId == userId &&
            participant.Status == SocialBettingParticipantStatus.Accepted);
        if (participant is null)
        {
            return [];
        }

        var now = DateTimeOffset.UtcNow;
        var cappedLimit = Math.Clamp(limit <= 0 ? 5 : limit, 1, 20);

        var placedMatchIds = await dbContext.SocialBettingPicks
            .AsNoTracking()
            .Where(pick =>
                pick.SocialBettingTournamentId == id &&
                pick.ParticipantId == participant.Id)
            .Select(pick => pick.MatchId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var matches = await dbContext.Matches
            .AsNoTracking()
            .Include(match => match.Stage)
            .Include(match => match.Tournament)
            .Include(match => match.PredictionSnapshot)
            .Where(match =>
                match.TournamentId == tournament.SourceTournamentId &&
                match.Status == MatchStatus.Upcoming &&
                match.KickoffUtc.HasValue &&
                match.KickoffUtc > now &&
                !placedMatchIds.Contains(match.Id))
            .OrderBy(match => match.KickoffUtc)
            .ThenBy(match => match.Id)
            .Take(cappedLimit)
            .Select(match => new SocialBettingOutstandingMatch(
                match.Id,
                match.KickoffUtc,
                match.HomeTeamNameSnapshot,
                match.AwayTeamNameSnapshot,
                match.Tournament.Name,
                match.Tournament.Season,
                match.Stage != null ? match.Stage.Name : match.RoundInfo,
                match.Status,
                match.PredictionSnapshot != null ? match.PredictionSnapshot.HomeWinProbability : 0,
                match.PredictionSnapshot != null ? match.PredictionSnapshot.DrawProbability : 0,
                match.PredictionSnapshot != null ? match.PredictionSnapshot.AwayWinProbability : 0,
                match.PredictionSnapshot != null ? match.PredictionSnapshot.HomeFairOdds : null,
                match.PredictionSnapshot != null ? match.PredictionSnapshot.DrawFairOdds : null,
                match.PredictionSnapshot != null ? match.PredictionSnapshot.AwayFairOdds : null))
            .ToListAsync(cancellationToken);

        var outstandingBets = new List<SocialBettingOutstandingBetDto>();
        foreach (var match in matches)
        {
            var prediction = await matchPredictionSnapshotService.PreviewMatchPredictionAsync(
                tournament.SourceTournamentId,
                match.Id,
                cancellationToken);

            outstandingBets.Add(new SocialBettingOutstandingBetDto(
                match.Id,
                FormatKickoff(match.KickoffUtc),
                match.KickoffUtc,
                match.HomeTeam,
                match.AwayTeam,
                $"{match.TournamentName} {match.Season}".Trim(),
                match.Stage,
                match.Status.ToString(),
                prediction?.HomeWinProbability ?? match.HomeWinProbability,
                prediction?.DrawProbability ?? match.DrawProbability,
                prediction?.AwayWinProbability ?? match.AwayWinProbability,
                prediction?.HomeFairOdds ?? match.HomeWinOdds,
                prediction?.DrawFairOdds ?? match.DrawOdds,
                prediction?.AwayFairOdds ?? match.AwayWinOdds));
        }

        return outstandingBets;
    }

    public async Task<SocialBettingMatchSummaryDto?> GetMatchSummaryAsync(
        int id,
        int matchId,
        string userId,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(id, cancellationToken);
        if (tournament is null || !CanView(tournament, userId))
        {
            return null;
        }

        var match = await dbContext.Matches
            .AsNoTracking()
            .Include(match => match.PredictionSnapshot)
            .FirstOrDefaultAsync(match => match.Id == matchId && match.TournamentId == tournament.SourceTournamentId, cancellationToken);
        if (match is null)
        {
            return null;
        }

        var acceptedParticipants = tournament.Participants
            .Where(participant => participant.Status == SocialBettingParticipantStatus.Accepted)
            .OrderBy(participant => participant.Nickname ?? participant.Email)
            .ToList();
        var participantIds = acceptedParticipants.Select(participant => participant.Id).ToList();
        var picks = await dbContext.SocialBettingPicks
            .AsNoTracking()
            .Where(pick =>
                pick.SocialBettingTournamentId == id &&
                pick.MatchId == matchId &&
                participantIds.Contains(pick.ParticipantId))
            .ToListAsync(cancellationToken);
        var picksByParticipant = picks
            .GroupBy(pick => pick.ParticipantId)
            .ToDictionary(group => group.Key, group => group.First());
        var completedPickCount = picks.Count(pick => pick.HomeScorePrediction.HasValue && pick.AwayScorePrediction.HasValue);
        var homeWinCount = 0;
        var drawCount = 0;
        var awayWinCount = 0;
        var totalHomeGoals = 0;
        var totalAwayGoals = 0;

        foreach (var pick in picks.Where(pick => pick.HomeScorePrediction.HasValue && pick.AwayScorePrediction.HasValue))
        {
            totalHomeGoals += pick.HomeScorePrediction!.Value;
            totalAwayGoals += pick.AwayScorePrediction!.Value;

            switch (Outcome(pick.HomeScorePrediction.Value, pick.AwayScorePrediction.Value))
            {
                case SocialBettingOutcome.HomeWin:
                    homeWinCount++;
                    break;
                case SocialBettingOutcome.Draw:
                    drawCount++;
                    break;
                case SocialBettingOutcome.AwayWin:
                    awayWinCount++;
                    break;
            }
        }

        var hasStarted = match.KickoffUtc.HasValue && match.KickoffUtc <= DateTimeOffset.UtcNow || match.Status != MatchStatus.Upcoming;
        var userBets = hasStarted
            ? acceptedParticipants.Select(participant =>
            {
                picksByParticipant.TryGetValue(participant.Id, out var pick);
                return ToUserBetSummary(participant, pick, match, tournament);
            }).ToList()
            : [];

        return new SocialBettingMatchSummaryDto(
            match.Id,
            match.HomeTeamNameSnapshot,
            match.AwayTeamNameSnapshot,
            match.KickoffUtc,
            FormatKickoff(match.KickoffUtc),
            match.Status.ToString(),
            hasStarted,
            match.RegularTimeHomeScore ?? match.HomeScore,
            match.RegularTimeAwayScore ?? match.AwayScore,
            acceptedParticipants.Count,
            completedPickCount,
            Percentage(homeWinCount, completedPickCount),
            Percentage(drawCount, completedPickCount),
            Percentage(awayWinCount, completedPickCount),
            completedPickCount == 0 ? 0 : decimal.Round((decimal)totalHomeGoals / completedPickCount, 2),
            completedPickCount == 0 ? 0 : decimal.Round((decimal)totalAwayGoals / completedPickCount, 2),
            match.PredictionSnapshot?.HomeFairOdds,
            match.PredictionSnapshot?.DrawFairOdds,
            match.PredictionSnapshot?.AwayFairOdds,
            userBets);
    }

    public async Task<SocialBettingPickDto?> UpsertPickAsync(
        int id,
        int matchId,
        string userId,
        UpsertSocialBettingPickRequest request,
        CancellationToken cancellationToken)
    {
        var tournament = await LoadTournamentAsync(id, cancellationToken);
        if (tournament is null || !CanView(tournament, userId))
        {
            return null;
        }

        var participant = tournament.Participants.FirstOrDefault(participant =>
            participant.UserId == userId &&
            participant.Status == SocialBettingParticipantStatus.Accepted);
        if (participant is null)
        {
            return null;
        }

        var match = await dbContext.Matches
            .Include(match => match.PredictionSnapshot)
            .FirstOrDefaultAsync(match => match.Id == matchId && match.TournamentId == tournament.SourceTournamentId, cancellationToken);
        if (match is null)
        {
            return null;
        }

        if (match.Status != MatchStatus.Upcoming || !match.KickoffUtc.HasValue || match.KickoffUtc <= DateTimeOffset.UtcNow)
        {
            throw new InvalidOperationException("Betting for this match is already locked.");
        }

        var now = DateTimeOffset.UtcNow;
        var pick = await dbContext.SocialBettingPicks
            .FirstOrDefaultAsync(pick =>
                pick.SocialBettingTournamentId == id &&
                pick.ParticipantId == participant.Id &&
                pick.MatchId == matchId,
                cancellationToken);

        if (pick is null)
        {
            pick = new SocialBettingPick
            {
                SocialBettingTournamentId = id,
                ParticipantId = participant.Id,
                MatchId = matchId,
                PlacedAtUtc = now
            };
            dbContext.SocialBettingPicks.Add(pick);
        }

        pick.HomeScorePrediction = request.HomeScorePrediction;
        pick.AwayScorePrediction = request.AwayScorePrediction;
        pick.QualifierTeamId = request.QualifierTeamId;
        pick.Stake = decimal.Round(Math.Max(tournament.BaseBetAmount, request.Stake ?? tournament.BaseBetAmount), 2);
        var prediction = match.PredictionSnapshot is null
            ? await matchPredictionSnapshotService.PreviewMatchPredictionAsync(id, matchId, cancellationToken)
            : null;

        pick.HomeOddsAtPlacement = match.PredictionSnapshot?.HomeFairOdds ?? prediction?.HomeFairOdds;
        pick.DrawOddsAtPlacement = match.PredictionSnapshot?.DrawFairOdds ?? prediction?.DrawFairOdds;
        pick.AwayOddsAtPlacement = match.PredictionSnapshot?.AwayFairOdds ?? prediction?.AwayFairOdds;
        pick.UpdatedAtUtc = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToPickDto(pick);
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

    private static decimal CalculatePickPoints(
        SocialBettingTournament tournament,
        SocialBettingPick pick,
        SocialBettingFinishedMatch match,
        bool exactScoreMatched)
    {
        var outcome = Outcome(match.HomeScore, match.AwayScore);
        var odds = outcome switch
        {
            SocialBettingOutcome.HomeWin => pick.HomeOddsAtPlacement,
            SocialBettingOutcome.Draw => pick.DrawOddsAtPlacement,
            SocialBettingOutcome.AwayWin => pick.AwayOddsAtPlacement,
            _ => null
        };
        var points = pick.Stake * Math.Max(odds ?? tournament.BaseBetAmount, tournament.BaseBetAmount);

        if (exactScoreMatched && tournament.AllowExactScoreBonus)
        {
            points += tournament.ExactScoreBonusMode == SocialBettingExactScoreBonusMode.OddsMultiplier
                ? points * tournament.ExactScoreOddsMultiplier
                : tournament.ExactScoreBonusValue;
        }

        return decimal.Round(points, 2);
    }

    private static SocialBettingPickDto ToPickDto(SocialBettingPick pick)
    {
        return new SocialBettingPickDto(
            pick.Id,
            pick.MatchId,
            pick.HomeScorePrediction ?? 0,
            pick.AwayScorePrediction ?? 0,
            pick.QualifierTeamId,
            pick.Stake,
            pick.HomeOddsAtPlacement,
            pick.DrawOddsAtPlacement,
            pick.AwayOddsAtPlacement,
            pick.PlacedAtUtc,
            pick.UpdatedAtUtc);
    }

    private static SocialBettingUserBetSummaryDto ToUserBetSummary(
        SocialBettingParticipant participant,
        SocialBettingPick? pick,
        Match match,
        SocialBettingTournament tournament)
    {
        if (pick is null || !pick.HomeScorePrediction.HasValue || !pick.AwayScorePrediction.HasValue)
        {
            return new SocialBettingUserBetSummaryDto(
                participant.Nickname ?? participant.User.DisplayName ?? participant.Email,
                "-",
                false,
                false,
                false,
                null,
                null);
        }

        var pickOutcome = Outcome(pick.HomeScorePrediction.Value, pick.AwayScorePrediction.Value);
        bool? matched = null;
        decimal? points = null;
        var homeScore = match.RegularTimeHomeScore ?? match.HomeScore;
        var awayScore = match.RegularTimeAwayScore ?? match.AwayScore;
        if (homeScore.HasValue && awayScore.HasValue)
        {
            matched = Outcome(homeScore.Value, awayScore.Value) == pickOutcome;
            if (matched.Value)
            {
                var exactScoreMatched = pick.HomeScorePrediction == homeScore && pick.AwayScorePrediction == awayScore;
                points = pick.PointsAwarded ?? CalculatePickPoints(
                    tournament,
                    pick,
                    new SocialBettingFinishedMatch(match.Id, match.KickoffUtc, homeScore.Value, awayScore.Value),
                    exactScoreMatched);
            }
            else
            {
                points = 0;
            }
        }

        return new SocialBettingUserBetSummaryDto(
            participant.Nickname ?? participant.User.DisplayName ?? participant.Email,
            $"{pick.HomeScorePrediction}:{pick.AwayScorePrediction}",
            pickOutcome == SocialBettingOutcome.HomeWin,
            pickOutcome == SocialBettingOutcome.Draw,
            pickOutcome == SocialBettingOutcome.AwayWin,
            matched,
            points);
    }

    private static IReadOnlyList<decimal> PointsGrowth(
        IReadOnlyList<SocialBettingPick> participantPicks,
        IReadOnlyList<SocialBettingFinishedMatch> finishedMatches,
        SocialBettingTournament tournament)
    {
        var pickByMatchId = participantPicks
            .Where(pick => pick.HomeScorePrediction.HasValue && pick.AwayScorePrediction.HasValue)
            .GroupBy(pick => pick.MatchId)
            .ToDictionary(group => group.Key, group => group.First());
        var points = 0m;
        var series = new List<decimal>();

        foreach (var match in finishedMatches)
        {
            if (pickByMatchId.TryGetValue(match.Id, out var pick))
            {
                var outcomeMatched = Outcome(match.HomeScore, match.AwayScore) ==
                    Outcome(pick.HomeScorePrediction!.Value, pick.AwayScorePrediction!.Value);
                if (outcomeMatched)
                {
                    var exactScoreMatched = pick.HomeScorePrediction == match.HomeScore && pick.AwayScorePrediction == match.AwayScore;
                    points += pick.PointsAwarded ?? CalculatePickPoints(tournament, pick, match, exactScoreMatched);
                }
            }
            else if (tournament.ApplyMissingBetPenalty)
            {
                points += tournament.MissingBetPenalty;
            }

            series.Add(decimal.Round(points, 2));
        }

        return series.Count == 0 ? [0m] : series;
    }

    private static decimal Percentage(int count, int total)
    {
        return total == 0 ? 0 : decimal.Round((decimal)count / total * 100m, 0);
    }

    private static SocialBettingOutcome Outcome(int homeScore, int awayScore)
    {
        return homeScore > awayScore
            ? SocialBettingOutcome.HomeWin
            : homeScore < awayScore
                ? SocialBettingOutcome.AwayWin
                : SocialBettingOutcome.Draw;
    }

    private static string FormatKickoff(DateTimeOffset? kickoff)
    {
        return kickoff.HasValue ? kickoff.Value.ToString("dd.MM.yyyy, HH:mm") : "-";
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

    private sealed record SocialBettingFinishedMatch(
        int Id,
        DateTimeOffset? KickoffUtc,
        int HomeScore,
        int AwayScore);

    private sealed record SocialBettingOutstandingMatch(
        int Id,
        DateTimeOffset? KickoffUtc,
        string HomeTeam,
        string AwayTeam,
        string TournamentName,
        string Season,
        string? Stage,
        MatchStatus Status,
        decimal HomeWinProbability,
        decimal DrawProbability,
        decimal AwayWinProbability,
        decimal? HomeWinOdds,
        decimal? DrawOdds,
        decimal? AwayWinOdds);

    private sealed record SocialBettingResultsRow(
        string UserName,
        decimal Accuracy,
        int SuccessfulBets,
        decimal Result,
        decimal WinSplit,
        decimal DrawSplit,
        decimal FailedSplit,
        IReadOnlyList<decimal> PointsGrowth);

    private enum SocialBettingOutcome
    {
        HomeWin,
        Draw,
        AwayWin
    }
}
