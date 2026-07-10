# Football Rating Engine

Football Rating Engine is a .NET backend for collecting football fixtures, results, match statistics, and building team strength ratings with a transparent Base Elo model.

The project started as a Python LiveScore data sync experiment and is now being rebuilt as a structured ASP.NET Core API that can support a larger Football Team Strength Rating system.

Repository: `pudelosha/football-rating-engine`

---

## Overview

The backend syncs football competition data from LiveScore, stores it in SQL Server, tracks fixture/result changes over time, enriches finished matches with statistics, and calculates Premier League Base Elo ratings from historical match data.

The first rating module focuses on **FTSR v1: Base Elo**. It uses historical Premier League matches, starts teams from configurable baseline values, handles promoted or returning teams, and stores match-by-match Elo snapshots so every rating can be audited.

---

## Key Features

- LiveScore competition discovery from public competition URLs
- Fixture, live match, finalization, and results synchronization
- Finished-match score breakdown support, including regular time, extra time, and penalties
- Match statistics enrichment with xG, shots, possession, corners, fouls, cards, and related metrics
- Tournament, team, stage, match, and sync-run persistence
- Base Elo rebuild endpoint for tournament teams
- Historical Premier League match import from LiveScore team details
- Match-by-match Elo snapshots for explainable rating changes
- JWT authentication, API key access, and role-based authorization
- Admin user seeding and SMTP-based email flows
- Password reset and email confirmation support
- xUnit integration tests

---

## Architecture

| Layer | Technology |
| --- | --- |
| Backend | ASP.NET Core Web API |
| Runtime | .NET 10 |
| Database | SQL Server, InMemory for local/dev fallback |
| ORM | Entity Framework Core |
| Auth | ASP.NET Core Identity, JWT, API keys |
| Background Jobs | Hosted Services |
| External Data | LiveScore public APIs |
| Tests | xUnit |

---

## Data Model Highlights

Core football sync entities:

- `Tournament`
- `TournamentStage`
- `Team`
- `TournamentTeam`
- `Match`
- `MatchStatistics`
- `TournamentSyncRun`

Base Elo entities:

- `HistoricalMatch`
- `EloRatingRun`
- `TeamEloRating`
- `MatchEloSnapshot`

`Match` stores current competition data. `HistoricalMatch` stores deduplicated historical match input for rating calculations. `MatchEloSnapshot` stores the rating state before and after each processed match.

---

## LiveScore Sync

The project uses LiveScore public endpoints that power the website experience.

Competition data:

```text
https://prod-cdn-public-api.livescore.com/v1/api/app/competition/{competitionId}/fixtures-w/{timezoneOffset}?limit=500&locale=en
https://prod-cdn-public-api.livescore.com/v1/api/app/competition/{competitionId}/results-w/{timezoneOffset}?limit=500&locale=en
```

Match details:

```text
https://prod-cdn-public-api.livescore.com/v1/api/app/incidents/soccer/{eventId}?locale=en
https://prod-cdn-public-api.livescore.com/v1/api/app/statistics/soccer/{eventId}?locale=en
```

Team history for Elo bootstrap:

```text
https://prod-cdn-team-api.livescore.com/v1/api/app/team/{teamId}/details?locale=en
```

---

## Base Elo Model

The current rating engine is intentionally simple and explainable.

Default rebuild parameters:

```json
{
  "baseRating": 1500,
  "promotedBaselineRating": 1400,
  "kFactor": 20,
  "homeAdvantage": 55,
  "bootstrapSeasonCount": 3,
  "scope": "PremierLeague"
}
```

Rating calculation:

```text
expected_home = 1 / (1 + 10 ^ ((away_elo - (home_elo + home_advantage)) / 400))

new_home_elo = home_elo + K * goal_multiplier * (actual_home - expected_home)
new_away_elo = away_elo + K * goal_multiplier * (actual_away - expected_away)
```

Promoted or returning Premier League teams are inferred by comparing the current tournament teams against teams that played in the latest completed numeric Premier League season. Those teams start the current season from `promotedBaselineRating`.

---

## Important Endpoints

Create a tournament from a LiveScore URL:

```http
POST /api/tournaments
```

Run tournament sync:

```http
POST /api/tournaments/{tournamentId}/sync/schedule
POST /api/tournaments/{tournamentId}/sync/live
POST /api/tournaments/{tournamentId}/sync/finalize
POST /api/tournaments/{tournamentId}/sync/results
POST /api/tournaments/{tournamentId}/sync/full
```

Rebuild Base Elo:

```http
POST /api/tournaments/{tournamentId}/ratings/base-elo/rebuild
```

Read latest Elo results:

```http
GET /api/tournaments/{tournamentId}/ratings/base-elo/latest-run
GET /api/tournaments/{tournamentId}/ratings/base-elo/teams
GET /api/rating-runs/{runId}/base-elo/snapshots
```

Authentication:

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/request-password-reset
POST /api/auth/reset-password
POST /api/auth/resend-confirmation-email
```

Health:

```http
GET /api/health
```

---

## Background Services

The API includes hosted services for automated synchronization:

| Service | Default Interval | Purpose |
| --- | ---: | --- |
| Schedule Sync | 1 hour | Refresh future fixtures and schedule changes |
| Live Sync | 1 minute | Update competitions that currently have live or due matches |
| Finalize Sync | 1 minute | Move finished matches into finalized state and enrich details |
| Results Reconciliation | 24 hours | Safety-net reconciliation against the results endpoint |

Base Elo recalculation is currently manual. This is intentional while the rating model is being tuned. It can later become a hosted service or scheduled job.

---

## Getting Started

### Prerequisites

- .NET 10 SDK
- SQL Server for persistent hosted/local storage
- Optional: `dotnet-ef` for manual migration management

The project can run in development without a connection string by using an in-memory database. For persistent data, configure SQL Server.

### Run Locally

```powershell
git clone https://github.com/pudelosha/football-rating-engine.git
cd football-rating-engine
dotnet restore
dotnet run --project src/FootballResults.Api
```

Default local URLs:

```text
https://localhost:7260
http://localhost:5165
```

### Run Tests

```powershell
dotnet test
```

---

## Configuration

Use `appsettings.local.json`, environment variables, or user secrets for local/private settings. Local override files are ignored by git.

Example local configuration:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=FootballRatingEngine;Trusted_Connection=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "Key": "replace-with-a-long-local-secret-at-least-32-characters",
    "Issuer": "football-rating-engine",
    "Audience": "football-rating-engine"
  },
  "Auth": {
    "AdminEmail": "admin@example.com",
    "AdminPassword": "AdminPassword123!"
  },
  "EmailSettings": {
    "EnableSending": false,
    "SmtpServer": "smtp.example.com",
    "SmtpPort": 587,
    "SmtpUsername": "",
    "SmtpPassword": "",
    "FromEmail": ""
  }
}
```

Never commit real connection strings, SMTP credentials, JWT secrets, or production admin passwords.

---

## Database

The application applies EF Core migrations automatically on startup when using a relational database.

Manual migration command:

```powershell
dotnet ef database update --project src/FootballResults.Api --startup-project src/FootballResults.Api
```

Create a migration:

```powershell
dotnet ef migrations add MigrationName --project src/FootballResults.Api --startup-project src/FootballResults.Api
```

---

## Example Workflow

1. Create a tournament from a LiveScore competition URL.
2. Run schedule or full sync to populate teams, stages, and matches.
3. Let hosted services keep fixtures, live matches, and results updated.
4. Rebuild Base Elo after a completed round or on demand.
5. Read team ratings and match-by-match snapshots through the rating endpoints.

Premier League example:

```http
POST /api/tournaments/1/ratings/base-elo/rebuild
GET /api/tournaments/1/ratings/base-elo/teams
```

---

## Deployment

The backend can be deployed to any .NET-compatible host, including:

- Azure App Service
- Windows IIS
- Docker
- Linux systemd service

For production:

- configure SQL Server
- provide a strong JWT key
- configure SMTP if email sending is required
- store secrets outside version control
- review hosted-service intervals before enabling continuous sync

---

## Roadmap

- Incremental Elo recalculation after finalized matches
- Form Rating based on recent performance against Elo expectation
- Performance Rating using xG, shots, and match statistics
- League Strength calculation from European competitions
- Squad Quality and Availability modules from external player data sources
- Public rating history charts and API filters
- Scheduled rating rebuild hosted service

---

## Project Status

Active development. The current version is focused on reliable football data synchronization and a transparent Base Elo foundation for the broader FTSR model.
