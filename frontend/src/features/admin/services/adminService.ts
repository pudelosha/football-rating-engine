import { authorizedRequest } from '../../../shared/api/httpClient'
import type {
  AdminUser,
  CombinedRatingsResponse,
  DataQualityIssue,
  DataQualityTournamentCheck,
  EloRatingRun,
  ExternalTeamMapping,
  ImportTransfermarktSquadResponse,
  LayerRatingRun,
  MatchSummary,
  RatingConfiguration,
  SquadQualitySnapshot,
  SyncAllTournamentsResponse,
  SyncServiceConfigurationResponse,
  SyncServiceHealth,
  SyncTournamentResponse,
  TeamSummary,
  TournamentDetails,
  TournamentPreview,
  TournamentRatingSetup,
  TournamentSquadCoverageResponse,
  TournamentSummary,
  TournamentSyncRun,
  TournamentSyncRunSummary,
} from '../../../shared/types'

export function fetchAdminTeams(token: string) {
  return authorizedRequest<TeamSummary[]>(token, '/api/admin/teams')
}

export function updateTeam(token: string, teamId: number, body: object) {
  return authorizedRequest<TeamSummary>(token, `/api/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchTournamentDetails(token: string, tournamentId: number) {
  return authorizedRequest<TournamentDetails>(token, `/api/tournaments/${tournamentId}`)
}

export function fetchTournamentTeams(token: string, tournamentId: number) {
  return authorizedRequest<TeamSummary[]>(token, `/api/tournaments/${tournamentId}/teams`)
}

export function fetchTournamentMatches(token: string, tournamentId: number) {
  return authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`)
}

export function fetchTournamentSyncRuns(token: string, tournamentId: number) {
  return authorizedRequest<TournamentSyncRun[]>(token, `/api/tournaments/${tournamentId}/sync-runs`)
}

export function fetchRatingConfiguration(token: string) {
  return authorizedRequest<RatingConfiguration>(token, '/api/admin/ratings/configuration')
}

export function saveRatingConfiguration(token: string, body: object) {
  return authorizedRequest<RatingConfiguration>(token, '/api/admin/ratings/configuration', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchBaseEloLatestRun(token: string, tournamentId: number) {
  return authorizedRequest<EloRatingRun>(token, `/api/tournaments/${tournamentId}/ratings/base-elo/latest-run`)
}

export function fetchFormLatestRun(token: string, tournamentId: number) {
  return authorizedRequest<LayerRatingRun>(token, `/api/tournaments/${tournamentId}/ratings/form/latest-run`)
}

export function fetchPerformanceLatestRun(token: string, tournamentId: number) {
  return authorizedRequest<LayerRatingRun>(token, `/api/tournaments/${tournamentId}/ratings/performance/latest-run`)
}

export function fetchCombinedRatings(token: string, tournamentId: number) {
  return authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`)
}

export function fetchTournamentRatingSetup(token: string, tournamentId: number) {
  return authorizedRequest<TournamentRatingSetup>(token, `/api/tournaments/${tournamentId}/rating-setup`)
}

export function saveTournamentRatingSetup(token: string, tournamentId: number, body: object) {
  return authorizedRequest<TournamentRatingSetup>(token, `/api/tournaments/${tournamentId}/rating-setup`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function runRatingRebuild(token: string, endpoint: string, body: object) {
  return authorizedRequest<unknown>(token, endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchSyncRunSummaries(token: string) {
  return authorizedRequest<TournamentSyncRunSummary[]>(token, '/api/tournament-sync-runs?limit=20')
}

export function fetchSystemHealth(token: string) {
  return authorizedRequest<SyncServiceHealth[]>(token, '/api/system-jobs/health')
}

export function syncAllTournaments(token: string, mode: string, language?: string) {
  return authorizedRequest<SyncAllTournamentsResponse>(token, `/api/tournaments/sync/${mode}`, {
    method: 'POST',
    ...(language ? { body: JSON.stringify({ language }) } : {}),
  })
}

export function updateSystemJobService(token: string, serviceKey: string, body: object) {
  return authorizedRequest<SyncServiceConfigurationResponse>(token, `/api/system-jobs/services/${serviceKey}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchDataQualityChecks(token: string) {
  return authorizedRequest<DataQualityTournamentCheck[]>(token, '/api/admin/data-quality/tournament-checks')
}

export function fetchDataQualityIssues(token: string, checkKey: string) {
  return authorizedRequest<DataQualityIssue[]>(token, `/api/admin/data-quality/tournament-checks/${checkKey}/issues`)
}

export function acceptDataQualityIssues(token: string, checkKey: string, body: object) {
  return authorizedRequest(token, `/api/admin/data-quality/tournament-checks/${checkKey}/accepted-issues`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchAdminUsers(token: string) {
  return authorizedRequest<AdminUser[]>(token, '/api/admin/users')
}

export function updateUserLock(token: string, userId: string, isLocked: boolean) {
  return authorizedRequest<void>(token, `/api/admin/users/${userId}/${isLocked ? 'suspend' : 'unsuspend'}`, {
    method: 'POST',
  })
}

export function deleteAdminUser(token: string, userId: string) {
  return authorizedRequest<void>(token, `/api/admin/users/${userId}`, { method: 'DELETE' })
}

export function updateUserRole(token: string, userId: string, body: object) {
  return authorizedRequest<AdminUser>(token, `/api/admin/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function resendUserConfirmation(token: string, userId: string, body: object) {
  return authorizedRequest<void>(token, `/api/admin/users/${userId}/resend-confirmation`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchTournamentSquadCoverage(token: string) {
  return authorizedRequest<TournamentSquadCoverageResponse[]>(token, '/api/tournaments/squad-quality/coverage')
}

export function fetchExternalTeamMappings(token: string, teamId: number) {
  return authorizedRequest<ExternalTeamMapping[]>(token, `/api/teams/${teamId}/external-mappings`)
}

export function fetchLatestSquadSnapshot(token: string, teamId: number) {
  return authorizedRequest<SquadQualitySnapshot>(token, `/api/teams/${teamId}/squad-quality/latest`)
}

export function importTransfermarktSquad(token: string, teamId: number, body: object) {
  return authorizedRequest<ImportTransfermarktSquadResponse>(token, `/api/admin/teams/${teamId}/transfermarkt/import`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function previewTournament(token: string, body: object) {
  return authorizedRequest<TournamentPreview>(token, '/api/tournaments/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createTournament(token: string, body: object) {
  return authorizedRequest<TournamentDetails>(token, '/api/tournaments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateTournament(token: string, tournamentId: number, body: object) {
  return authorizedRequest<TournamentDetails>(token, `/api/tournaments/${tournamentId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteTournament(token: string, tournamentId: number) {
  return authorizedRequest<void>(token, `/api/tournaments/${tournamentId}`, { method: 'DELETE' })
}

export function syncTournament(token: string, tournamentId: number, mode: string, language?: string) {
  return authorizedRequest<SyncTournamentResponse>(token, `/api/tournaments/${tournamentId}/sync/${mode}`, {
    method: 'POST',
    ...(language ? { body: JSON.stringify({ language }) } : {}),
  })
}

export function updateTournamentTeam(token: string, teamId: number, body: object) {
  return authorizedRequest<TournamentDetails['teams'][number]>(token, `/api/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function updateTournamentMatch(token: string, tournamentId: number, matchId: number, body: object) {
  return authorizedRequest<MatchSummary>(token, `/api/tournaments/${tournamentId}/matches/${matchId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
