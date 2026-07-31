import { authorizedRequest } from '../../../shared/api/httpClient'
import type {
  BaseEloMatchSnapshot,
  CombinedRatingsResponse,
  MatchSummary,
  TournamentDetails,
  TournamentSummary,
} from '../../../shared/types'

export function fetchPredictionTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchTournamentDetails(token: string, tournamentId: number) {
  return authorizedRequest<TournamentDetails>(token, `/api/tournaments/${tournamentId}`)
}

export function fetchTournamentMatches(token: string, tournamentId: number) {
  return authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`)
}

export function fetchCombinedRatings(token: string, tournamentId: number) {
  return authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`)
}

export function fetchPredictionContext(token: string, tournamentId: number) {
  return Promise.all([
    fetchTournamentDetails(token, tournamentId),
    fetchTournamentMatches(token, tournamentId),
    fetchCombinedRatings(token, tournamentId),
  ])
}

export function fetchBaseEloSnapshots(token: string, runId: number) {
  return authorizedRequest<BaseEloMatchSnapshot[]>(token, `/api/rating-runs/${runId}/base-elo/snapshots`)
}
