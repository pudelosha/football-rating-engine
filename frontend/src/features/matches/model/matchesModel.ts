import type {
  MatchSummary,
  PublicMatchSortKey,
  SortDirection,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import { compareText, matchStatusText } from '../../../shared/utils'
import type { MatchesTranslation } from '../types'

export function getSortedTournaments({
  search,
  sortDirection,
  sortKey,
  tournaments,
}: {
  search: string
  sortDirection: SortDirection
  sortKey: TournamentSortKey
  tournaments: TournamentSummary[]
}) {
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = tournaments.filter((tournament) => {
    if (!normalizedSearch) {
      return true
    }

    return [
      tournament.name,
      tournament.season,
      tournament.competitionName,
      tournament.competitionCountry,
    ].some((value) => value.toLowerCase().includes(normalizedSearch))
  })

  return filtered.sort((left, right) => {
    let comparison = 0
    if (sortKey === 'name') {
      comparison = compareText(left.name, right.name)
    } else if (sortKey === 'season') {
      comparison = compareText(left.season || '', right.season || '')
    } else if (sortKey === 'country') {
      comparison = compareText(left.competitionCountry || left.competitionName, right.competitionCountry || right.competitionName)
    } else if (sortKey === 'teams') {
      comparison = left.teamCount - right.teamCount
    } else if (sortKey === 'matches') {
      comparison = left.matchCount - right.matchCount
    } else if (sortKey === 'lastSync') {
      comparison = new Date(left.lastSyncedAtUtc ?? 0).getTime() - new Date(right.lastSyncedAtUtc ?? 0).getTime()
    }

    if (comparison === 0) {
      comparison = compareText(left.name, right.name)
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })
}

export function getRoundOptions(matches: MatchSummary[]) {
  return [...new Set(matches.map((match) => match.roundInfo).filter(Boolean))]
    .sort((left, right) => compareText(left, right))
}

export function getFirstRound(matches: MatchSummary[]) {
  return getRoundOptions(matches)[0] ?? 'all'
}

export function getDisplayedMatches({
  matches,
  roundFilter,
  search,
  sortDirection,
  sortKey,
  t,
}: {
  matches: MatchSummary[]
  roundFilter: string
  search: string
  sortDirection: SortDirection
  sortKey: PublicMatchSortKey
  t: MatchesTranslation
}) {
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = matches.filter((match) => {
    const statusText = matchStatusText(match.status, t)
    if (roundFilter !== 'all' && match.roundInfo !== roundFilter) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return [
      match.roundInfo,
      match.homeTeam?.name,
      match.awayTeam?.name,
      match.homeTeamNameSnapshot,
      match.awayTeamNameSnapshot,
      statusText,
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch))
  })

  return filtered.sort((left, right) => {
    let comparison = 0
    if (sortKey === 'kickoff') {
      comparison = new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime()
    } else if (sortKey === 'round') {
      comparison = compareText(left.roundInfo, right.roundInfo)
    } else if (sortKey === 'home') {
      comparison = compareText(left.homeTeam?.name || left.homeTeamNameSnapshot, right.homeTeam?.name || right.homeTeamNameSnapshot)
    } else if (sortKey === 'away') {
      comparison = compareText(left.awayTeam?.name || left.awayTeamNameSnapshot, right.awayTeam?.name || right.awayTeamNameSnapshot)
    } else if (sortKey === 'score') {
      comparison = (left.homeScore ?? -1) - (right.homeScore ?? -1) || (left.awayScore ?? -1) - (right.awayScore ?? -1)
    } else if (sortKey === 'status') {
      comparison = compareText(matchStatusText(left.status, t), matchStatusText(right.status, t))
    }

    if (comparison === 0) {
      comparison = new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime()
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })
}

export function getNextSortDirection(currentKey: string, nextKey: string, currentDirection: SortDirection, defaultDirection: SortDirection = 'asc') {
  if (currentKey === nextKey) {
    return currentDirection === 'asc' ? 'desc' : 'asc'
  }

  return defaultDirection
}
