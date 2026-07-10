using FootballResults.Api.Model.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Model.Database;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<TournamentStage> TournamentStages => Set<TournamentStage>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TournamentTeam> TournamentTeams => Set<TournamentTeam>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<MatchStatistics> MatchStatistics => Set<MatchStatistics>();
    public DbSet<TournamentSyncRun> TournamentSyncRuns => Set<TournamentSyncRun>();
    public DbSet<HistoricalMatch> HistoricalMatches => Set<HistoricalMatch>();
    public DbSet<EloRatingRun> EloRatingRuns => Set<EloRatingRun>();
    public DbSet<TeamEloRating> TeamEloRatings => Set<TeamEloRating>();
    public DbSet<MatchEloSnapshot> MatchEloSnapshots => Set<MatchEloSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("Users");
            entity.Property(user => user.DisplayName).HasMaxLength(120);
            entity.Property(user => user.ApiKeyHash).HasMaxLength(128);
            entity.HasIndex(user => user.ApiKeyHash).IsUnique();
        });

        modelBuilder.Entity<IdentityRole>().ToTable("Roles");
        modelBuilder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
        modelBuilder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
        modelBuilder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
        modelBuilder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");
        modelBuilder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");

        modelBuilder.Entity<Tournament>(entity =>
        {
            entity.HasIndex(tournament => tournament.LiveScoreCompetitionId).IsUnique();
            entity.HasIndex(tournament => tournament.BaseUrl).IsUnique();

            entity.Property(tournament => tournament.LiveScoreCompetitionId).HasMaxLength(64);
            entity.Property(tournament => tournament.Name).HasMaxLength(200);
            entity.Property(tournament => tournament.CompetitionName).HasMaxLength(200);
            entity.Property(tournament => tournament.CompetitionCountry).HasMaxLength(120);
            entity.Property(tournament => tournament.CompetitionUrlName).HasMaxLength(160);
            entity.Property(tournament => tournament.CategoryCode).HasMaxLength(64);
            entity.Property(tournament => tournament.CategoryName).HasMaxLength(200);
            entity.Property(tournament => tournament.CategoryTransliteratedName).HasMaxLength(200);
            entity.Property(tournament => tournament.BaseUrl).HasMaxLength(500);
            entity.Property(tournament => tournament.FixturesUrl).HasMaxLength(500);
            entity.Property(tournament => tournament.ResultsUrl).HasMaxLength(500);
            entity.Property(tournament => tournament.ApiBaseUrl).HasMaxLength(500);
            entity.Property(tournament => tournament.Locale).HasMaxLength(16);
            entity.Property(tournament => tournament.TimezoneOffset).HasMaxLength(16);
        });

        modelBuilder.Entity<TournamentStage>(entity =>
        {
            entity.HasIndex(stage => new { stage.TournamentId, stage.LiveScoreStageId }).IsUnique();

            entity.Property(stage => stage.LiveScoreStageId).HasMaxLength(64);
            entity.Property(stage => stage.Name).HasMaxLength(200);
            entity.Property(stage => stage.Code).HasMaxLength(64);

            entity.HasOne(stage => stage.Tournament)
                .WithMany(tournament => tournament.Stages)
                .HasForeignKey(stage => stage.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasIndex(team => team.LiveScoreTeamId)
                .IsUnique()
                .HasFilter("[LiveScoreTeamId] IS NOT NULL");
            entity.HasIndex(team => team.Name);

            entity.Property(team => team.LiveScoreTeamId).HasMaxLength(64);
            entity.Property(team => team.Name).HasMaxLength(200);
            entity.Property(team => team.Abbreviation).HasMaxLength(32);
            entity.Property(team => team.ImageUrl).HasMaxLength(500);
        });

        modelBuilder.Entity<TournamentTeam>(entity =>
        {
            entity.HasKey(tournamentTeam => new { tournamentTeam.TournamentId, tournamentTeam.TeamId });

            entity.HasOne(tournamentTeam => tournamentTeam.Tournament)
                .WithMany(tournament => tournament.TournamentTeams)
                .HasForeignKey(tournamentTeam => tournamentTeam.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tournamentTeam => tournamentTeam.Team)
                .WithMany(team => team.TournamentTeams)
                .HasForeignKey(tournamentTeam => tournamentTeam.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Match>(entity =>
        {
            entity.HasIndex(match => match.LiveScoreEventId).IsUnique();
            entity.HasIndex(match => new { match.TournamentId, match.KickoffUtc });
            entity.HasIndex(match => new { match.TournamentId, match.Status });
            entity.HasIndex(match => new { match.TournamentId, match.SyncState });

            entity.Property(match => match.LiveScoreEventId).HasMaxLength(64);
            entity.Property(match => match.HomeTeamNameSnapshot).HasMaxLength(200);
            entity.Property(match => match.AwayTeamNameSnapshot).HasMaxLength(200);
            entity.Property(match => match.HomeTeamAbbrSnapshot).HasMaxLength(32);
            entity.Property(match => match.AwayTeamAbbrSnapshot).HasMaxLength(32);
            entity.Property(match => match.HomeTeamImageSnapshot).HasMaxLength(500);
            entity.Property(match => match.AwayTeamImageSnapshot).HasMaxLength(500);
            entity.Property(match => match.RawStatus).HasMaxLength(64);
            entity.Property(match => match.RoundInfo).HasMaxLength(200);
            entity.Property(match => match.MatchUrl).HasMaxLength(500);
            entity.Property(match => match.LastSourceEndpoint).HasMaxLength(1000);
            entity.Property(match => match.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(match => match.SyncState).HasConversion<string>().HasMaxLength(32);
            entity.Property(match => match.LastSeenInListType).HasConversion<string>().HasMaxLength(32);

            entity.HasOne(match => match.Tournament)
                .WithMany(tournament => tournament.Matches)
                .HasForeignKey(match => match.TournamentId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(match => match.Stage)
                .WithMany(stage => stage.Matches)
                .HasForeignKey(match => match.StageId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(match => match.HomeTeam)
                .WithMany(team => team.HomeMatches)
                .HasForeignKey(match => match.HomeTeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(match => match.AwayTeam)
                .WithMany(team => team.AwayMatches)
                .HasForeignKey(match => match.AwayTeamId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MatchStatistics>(entity =>
        {
            entity.HasIndex(statistics => statistics.MatchId).IsUnique();
            entity.HasIndex(statistics => statistics.LiveScoreEventId).IsUnique();

            entity.Property(statistics => statistics.LiveScoreEventId).HasMaxLength(64);
            entity.Property(statistics => statistics.HomeExpectedGoals).HasPrecision(8, 2);
            entity.Property(statistics => statistics.AwayExpectedGoals).HasPrecision(8, 2);

            entity.HasOne(statistics => statistics.Match)
                .WithOne(match => match.Statistics)
                .HasForeignKey<MatchStatistics>(statistics => statistics.MatchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TournamentSyncRun>(entity =>
        {
            entity.HasIndex(syncRun => new { syncRun.TournamentId, syncRun.StartedAtUtc });

            entity.Property(syncRun => syncRun.Mode).HasConversion<string>().HasMaxLength(32);
            entity.Property(syncRun => syncRun.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(syncRun => syncRun.ErrorMessage).HasMaxLength(2000);

            entity.HasOne(syncRun => syncRun.Tournament)
                .WithMany(tournament => tournament.SyncRuns)
                .HasForeignKey(syncRun => syncRun.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HistoricalMatch>(entity =>
        {
            entity.HasIndex(match => match.LiveScoreEventId).IsUnique();
            entity.HasIndex(match => new { match.LiveScoreCompetitionId, match.KickoffUtc });
            entity.HasIndex(match => new { match.CompetitionName, match.KickoffUtc });
            entity.HasIndex(match => match.HomeTeamId);
            entity.HasIndex(match => match.AwayTeamId);

            entity.Property(match => match.LiveScoreEventId).HasMaxLength(64);
            entity.Property(match => match.LiveScoreCompetitionId).HasMaxLength(64);
            entity.Property(match => match.CompetitionName).HasMaxLength(200);
            entity.Property(match => match.CompetitionCountry).HasMaxLength(120);
            entity.Property(match => match.SeasonName).HasMaxLength(200);
            entity.Property(match => match.StageName).HasMaxLength(200);
            entity.Property(match => match.StageCode).HasMaxLength(64);
            entity.Property(match => match.HomeTeamLiveScoreId).HasMaxLength(64);
            entity.Property(match => match.AwayTeamLiveScoreId).HasMaxLength(64);
            entity.Property(match => match.HomeTeamNameSnapshot).HasMaxLength(200);
            entity.Property(match => match.AwayTeamNameSnapshot).HasMaxLength(200);
            entity.Property(match => match.HomeTeamAbbrSnapshot).HasMaxLength(32);
            entity.Property(match => match.AwayTeamAbbrSnapshot).HasMaxLength(32);
            entity.Property(match => match.RawStatus).HasMaxLength(64);
            entity.Property(match => match.RoundInfo).HasMaxLength(200);
            entity.Property(match => match.SourceEndpoint).HasMaxLength(1000);
            entity.Property(match => match.Status).HasConversion<string>().HasMaxLength(32);

            entity.HasOne(match => match.HomeTeam)
                .WithMany()
                .HasForeignKey(match => match.HomeTeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(match => match.AwayTeam)
                .WithMany()
                .HasForeignKey(match => match.AwayTeamId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EloRatingRun>(entity =>
        {
            entity.HasIndex(run => new { run.TournamentId, run.StartedAtUtc });

            entity.Property(run => run.Name).HasMaxLength(200);
            entity.Property(run => run.Scope).HasMaxLength(64);
            entity.Property(run => run.BaseRating).HasPrecision(9, 2);
            entity.Property(run => run.PromotedBaselineRating).HasPrecision(9, 2);
            entity.Property(run => run.KFactor).HasPrecision(9, 2);
            entity.Property(run => run.HomeAdvantage).HasPrecision(9, 2);
            entity.Property(run => run.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(run => run.ErrorMessage).HasMaxLength(2000);

            entity.HasOne(run => run.Tournament)
                .WithMany()
                .HasForeignKey(run => run.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeamEloRating>(entity =>
        {
            entity.HasIndex(rating => new { rating.EloRatingRunId, rating.TeamId }).IsUnique();

            entity.Property(rating => rating.Rating).HasPrecision(9, 2);

            entity.HasOne(rating => rating.EloRatingRun)
                .WithMany(run => run.TeamRatings)
                .HasForeignKey(rating => rating.EloRatingRunId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rating => rating.Team)
                .WithMany()
                .HasForeignKey(rating => rating.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MatchEloSnapshot>(entity =>
        {
            entity.HasIndex(snapshot => new { snapshot.EloRatingRunId, snapshot.HistoricalMatchId }).IsUnique();
            entity.HasIndex(snapshot => new { snapshot.EloRatingRunId, snapshot.KickoffUtc });
            entity.HasIndex(snapshot => new { snapshot.EloRatingRunId, snapshot.HomeTeamId });
            entity.HasIndex(snapshot => new { snapshot.EloRatingRunId, snapshot.AwayTeamId });

            entity.Property(snapshot => snapshot.LiveScoreEventId).HasMaxLength(64);
            entity.Property(snapshot => snapshot.HomeEloBefore).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.AwayEloBefore).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.HomeEloAfter).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.AwayEloAfter).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.HomeExpected).HasPrecision(9, 4);
            entity.Property(snapshot => snapshot.AwayExpected).HasPrecision(9, 4);
            entity.Property(snapshot => snapshot.HomeActual).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.AwayActual).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.HomeEloChange).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.AwayEloChange).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.KFactor).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.HomeAdvantageApplied).HasPrecision(9, 2);
            entity.Property(snapshot => snapshot.GoalDifferenceMultiplier).HasPrecision(9, 2);

            entity.HasOne(snapshot => snapshot.EloRatingRun)
                .WithMany(run => run.MatchSnapshots)
                .HasForeignKey(snapshot => snapshot.EloRatingRunId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(snapshot => snapshot.HistoricalMatch)
                .WithMany(match => match.EloSnapshots)
                .HasForeignKey(snapshot => snapshot.HistoricalMatchId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(snapshot => snapshot.HomeTeam)
                .WithMany()
                .HasForeignKey(snapshot => snapshot.HomeTeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(snapshot => snapshot.AwayTeam)
                .WithMany()
                .HasForeignKey(snapshot => snapshot.AwayTeamId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
