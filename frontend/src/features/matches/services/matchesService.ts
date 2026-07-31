import { authorizedRequest } from '../../../shared/api/httpClient'
import type { MatchPredictionSnapshot, MatchSummary, TournamentDetails, TournamentSummary } from '../../../shared/types'

export function fetchTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchTournamentDetails(token: string, tournamentId: number) {
  return authorizedRequest<TournamentDetails>(token, `/api/tournaments/${tournamentId}`)
}

export function fetchTournamentMatches(token: string, tournamentId: number) {
  return authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`)
}

export function fetchMatchPredictionSnapshot(token: string, tournamentId: number, matchId: number) {
  return authorizedRequest<MatchPredictionSnapshot>(token, `/api/tournaments/${tournamentId}/matches/${matchId}/prediction-snapshot`)
}

export function fetchTournamentWithMatches(token: string, tournamentId: number) {
  return Promise.all([
    fetchTournamentDetails(token, tournamentId),
    fetchTournamentMatches(token, tournamentId),
  ])
}
