import { authorizedRequest } from '../../../shared/api/httpClient'
import type { BettingCoupon, CombinedRatingsResponse, MatchSummary, TournamentSummary } from '../../../shared/types'

export function fetchHomeTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchHomeTournamentMatches(token: string, tournamentId: number) {
  return authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`)
}

export function fetchHomeCombinedRatings(token: string, tournamentId: number) {
  return authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`)
}

export function fetchHomeCoupons(token: string) {
  return authorizedRequest<BettingCoupon[]>(token, '/api/betting/coupons')
}
