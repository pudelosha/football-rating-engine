import { authorizedRequest } from '../../../shared/api/httpClient'
import type {
  BettingCoupon,
  CombinedRatingsResponse,
  MatchSummary,
  TournamentDetails,
  TournamentSummary,
} from '../../../shared/types'

export function fetchCoupons(token: string) {
  return authorizedRequest<BettingCoupon[]>(token, '/api/betting/coupons')
}

export function createCoupon(
  token: string,
  payload: {
    stake: number
    bets: Array<{
      matchId: number
      selection: number
      predictedChance: number
      fairOdds: number
      modelShape: string
      drawRisk: string
    }>
  },
) {
  return authorizedRequest<BettingCoupon>(token, '/api/betting/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteCoupon(token: string, couponId: number) {
  return authorizedRequest(token, `/api/betting/coupons/${couponId}`, {
    method: 'DELETE',
  })
}

export function deleteAllCoupons(token: string) {
  return authorizedRequest(token, '/api/betting/coupons', {
    method: 'DELETE',
  })
}

export function fetchTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchTournamentCandidatePayload(token: string, tournamentId: number) {
  return Promise.all([
    authorizedRequest<TournamentDetails>(token, `/api/tournaments/${tournamentId}`),
    authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`),
    authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`),
  ])
}
