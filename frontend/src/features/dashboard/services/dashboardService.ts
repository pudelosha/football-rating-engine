import { authorizedRequest } from '../../../shared/api/httpClient'
import type { BettingCouponSummary, CombinedRatingsResponse, MatchSummary, TeamSquadQualityRatingDetail, TournamentSummary } from '../../../shared/types'

export function fetchDashboardTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchDashboardMatches(token: string, tournamentId: number) {
  return authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`)
}

export function fetchDashboardRatings(token: string, tournamentId: number) {
  return authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`)
}

export function fetchDashboardSquadRatings(token: string, tournamentId: number) {
  return authorizedRequest<TeamSquadQualityRatingDetail[]>(token, `/api/tournaments/${tournamentId}/ratings/squad-quality/teams`)
}

export function fetchDashboardBettingSummary(token: string) {
  return authorizedRequest<BettingCouponSummary>(token, '/api/betting/coupons/summary')
}
