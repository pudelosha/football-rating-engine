import { authorizedRequest } from '../../../shared/api/httpClient'
import type { TournamentSummary } from '../../../shared/types'
import type {
  SaveSocialBettingTournamentPayload,
  SocialBettingTournamentDetails,
  BettingTournamentOption,
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

export function resendSocialBettingInvite(token: string, tournamentId: number, participantId: number, language = 'en') {
  return authorizedRequest(token, `/api/social-betting/tournaments/${tournamentId}/participants/${participantId}/resend-invite`, {
    method: 'POST',
    body: JSON.stringify({ language }),
  })
}
