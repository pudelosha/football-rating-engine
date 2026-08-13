import { authorizedRequest } from '../../../shared/api/httpClient'
import type { TournamentSummary } from '../../../shared/types'
import type {
  SaveSocialBettingTournamentPayload,
  SocialBettingTournamentDetails,
  BettingTournamentOption,
  SocialBettingMatchSummary,
  SocialBettingOutstandingBet,
  SocialBettingPick,
  SocialBettingResults,
} from '../types'

export function fetchSourceTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchSocialBettingTournaments(token: string) {
  return authorizedRequest<BettingTournamentOption[]>(token, '/api/social-betting/tournaments')
}

export function fetchSocialBettingTournament(token: string, id: number) {
  return authorizedRequest<SocialBettingTournamentDetails>(token, `/api/social-betting/tournaments/${id}`)
}

export function fetchSocialBettingResults(token: string, id: number) {
  return authorizedRequest<SocialBettingResults>(token, `/api/social-betting/tournaments/${id}/results`)
}

export function fetchSocialBettingOutstandingBets(token: string, id: number, limit = 5) {
  return authorizedRequest<SocialBettingOutstandingBet[]>(
    token,
    `/api/social-betting/tournaments/${id}/outstanding-bets?limit=${limit}`,
  )
}

export function fetchSocialBettingMatchSummary(token: string, id: number, matchId: number) {
  return authorizedRequest<SocialBettingMatchSummary>(
    token,
    `/api/social-betting/tournaments/${id}/matches/${matchId}/summary`,
  )
}

export function upsertSocialBettingPick(
  token: string,
  id: number,
  matchId: number,
  payload: { homeScorePrediction: number; awayScorePrediction: number; qualifierTeamId?: number; stake?: number },
) {
  return authorizedRequest<SocialBettingPick>(token, `/api/social-betting/tournaments/${id}/matches/${matchId}/pick`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function createSocialBettingTournament(token: string, payload: SaveSocialBettingTournamentPayload) {
  return authorizedRequest<SocialBettingTournamentDetails>(token, '/api/social-betting/tournaments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSocialBettingTournament(token: string, id: number, payload: SaveSocialBettingTournamentPayload) {
  return authorizedRequest<SocialBettingTournamentDetails>(token, `/api/social-betting/tournaments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function confirmSocialBettingParticipation(token: string, tournamentId: number) {
  return authorizedRequest<BettingTournamentOption>(token, `/api/social-betting/tournaments/${tournamentId}/confirm-participation`, {
    method: 'POST',
  })
}

export function resendSocialBettingInvite(token: string, tournamentId: number, participantId: number, language = 'en') {
  return authorizedRequest(token, `/api/social-betting/tournaments/${tournamentId}/participants/${participantId}/resend-invite`, {
    method: 'POST',
    body: JSON.stringify({ language }),
  })
}
