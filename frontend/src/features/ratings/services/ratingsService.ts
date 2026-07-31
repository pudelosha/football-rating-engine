import { authorizedRequest } from '../../../shared/api/httpClient'
import type {
  CombinedRatingsResponse,
  TeamFormMatchSnapshot,
  TeamFormRatingDetail,
  TeamPerformanceMatchSnapshot,
  TeamPerformanceRatingDetail,
  TeamSquadQualityRatingDetail,
  TournamentDetails,
  TournamentSummary,
} from '../../../shared/types'

export function fetchRatingTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchTournamentDetails(token: string, tournamentId: number) {
  return authorizedRequest<TournamentDetails>(token, `/api/tournaments/${tournamentId}`)
}

export function fetchCombinedRatings(token: string, tournamentId: number) {
  return authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`)
}

export function fetchFormRatings(token: string, tournamentId: number) {
  return authorizedRequest<TeamFormRatingDetail[]>(token, `/api/tournaments/${tournamentId}/ratings/form/teams`)
}

export function fetchPerformanceRatings(token: string, tournamentId: number) {
  return authorizedRequest<TeamPerformanceRatingDetail[]>(token, `/api/tournaments/${tournamentId}/ratings/performance/teams`)
}

export function fetchSquadRatings(token: string, tournamentId: number) {
  return authorizedRequest<TeamSquadQualityRatingDetail[]>(token, `/api/tournaments/${tournamentId}/ratings/squad-quality/teams`)
}

export function fetchFormSnapshots(token: string, runId?: number | null) {
  return runId
    ? authorizedRequest<TeamFormMatchSnapshot[]>(token, `/api/rating-runs/${runId}/form/snapshots`)
    : Promise.resolve({ ok: true, data: [] as TeamFormMatchSnapshot[] })
}

export function fetchPerformanceSnapshots(token: string, runId?: number | null) {
  return runId
    ? authorizedRequest<TeamPerformanceMatchSnapshot[]>(token, `/api/rating-runs/${runId}/performance/snapshots`)
    : Promise.resolve({ ok: true, data: [] as TeamPerformanceMatchSnapshot[] })
}
