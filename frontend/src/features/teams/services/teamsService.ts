import { authorizedRequest } from '../../../shared/api/httpClient'
import type {
  CombinedRatingsResponse,
  MatchSummary,
  SquadPlayerSnapshot,
  SquadQualitySnapshot,
  TeamSummary,
  TournamentSummary,
} from '../../../shared/types'

export function fetchTeams(token: string) {
  return authorizedRequest<TeamSummary[]>(token, '/api/teams')
}

export function fetchTeam(token: string, teamId: number) {
  return authorizedRequest<TeamSummary>(token, `/api/teams/${teamId}`)
}

export function fetchTournaments(token: string) {
  return authorizedRequest<TournamentSummary[]>(token, '/api/tournaments')
}

export function fetchTournamentTeams(token: string, tournamentId: number) {
  return authorizedRequest<TeamSummary[]>(token, `/api/tournaments/${tournamentId}/teams`)
}

export function fetchTournamentRatings(token: string, tournamentId: number) {
  return authorizedRequest<CombinedRatingsResponse>(token, `/api/tournaments/${tournamentId}/ratings/combined/teams`)
}

export function fetchTournamentMatches(token: string, tournamentId: number) {
  return authorizedRequest<MatchSummary[]>(token, `/api/tournaments/${tournamentId}/matches`)
}

export function fetchSquadSnapshot(token: string, teamId: number) {
  return authorizedRequest<SquadQualitySnapshot>(token, `/api/teams/${teamId}/squad-quality/latest`)
}

export function fetchSquadPlayers(token: string, snapshotId: number) {
  return authorizedRequest<SquadPlayerSnapshot[]>(token, `/api/squad-quality/snapshots/${snapshotId}/players`)
}

export function fetchTeamDirectoryContext(token: string, tournamentId: number) {
  return Promise.all([
    fetchTournamentTeams(token, tournamentId),
    fetchTournamentRatings(token, tournamentId),
  ])
}

export function fetchTeamDetailsContext(token: string, tournamentId: number) {
  return Promise.all([
    fetchTournamentTeams(token, tournamentId),
    fetchTournamentRatings(token, tournamentId),
    fetchTournamentMatches(token, tournamentId),
  ])
}
