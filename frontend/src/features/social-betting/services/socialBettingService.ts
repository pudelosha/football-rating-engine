import { authorizedRequest } from '../../../shared/api/httpClient'
import type { TournamentSummary } from '../../../shared/types'

export function fetchSourceTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}
