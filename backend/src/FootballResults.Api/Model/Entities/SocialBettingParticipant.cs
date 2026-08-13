namespace FootballResults.Api.Model.Entities;

public sealed class SocialBettingParticipant
{
    public int Id { get; set; }
    public int SocialBettingTournamentId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public SocialBettingParticipantRole Role { get; set; } = SocialBettingParticipantRole.Player;
    public SocialBettingParticipantStatus Status { get; set; } = SocialBettingParticipantStatus.Pending;
    public string? InvitationTokenHash { get; set; }
    public DateTimeOffset? InvitationExpiresAtUtc { get; set; }
    public DateTimeOffset InvitedAtUtc { get; set; }
    public DateTimeOffset? AcceptedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public SocialBettingTournament SocialBettingTournament { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
