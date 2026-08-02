import type {
  CombinedTeamRating,
  RatingTeamSortKey,
  SortDirection,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import { compareText } from '../../../shared/utils'

export function getSortedRatingTournaments({
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

export function getSortedTeamRatings({
  sortDirection,
  sortKey,
  teams,
}: {
  sortDirection: SortDirection
  sortKey: RatingTeamSortKey
  teams: CombinedTeamRating[]
}) {
  return [...teams].sort((left, right) => {
    let comparison = 0

    if (sortKey === 'team') {
      comparison = compareText(left.teamName, right.teamName)
    } else if (sortKey === 'baseElo') {
      comparison = left.baseElo - right.baseElo
    } else if (sortKey === 'form') {
      comparison = left.formAdjustment - right.formAdjustment
    } else if (sortKey === 'performance') {
      comparison = left.performanceAdjustment - right.performanceAdjustment
    } else if (sortKey === 'squad') {
      comparison = left.squadQualityAdjustment - right.squadQualityAdjustment
    } else if (sortKey === 'finalRating') {
      comparison = left.finalRating - right.finalRating
    } else if (sortKey === 'change') {
      comparison = (left.finalRatingChange ?? Number.NEGATIVE_INFINITY) - (right.finalRatingChange ?? Number.NEGATIVE_INFINITY)
    } else if (sortKey === 'confidence') {
      comparison = left.ratingConfidence - right.ratingConfidence
    }

    if (comparison === 0) {
      comparison = compareText(left.teamName, right.teamName)
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
