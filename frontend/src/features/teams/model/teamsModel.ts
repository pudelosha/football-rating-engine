import type {
  CombinedRatingsResponse,
  SortDirection,
  SquadPlayerSnapshot,
  SquadPlayerSortKey,
  TeamSummary,
  TournamentSummary,
  UserTeamContext,
  UserTeamDirectoryRow,
  UserTeamSortKey,
} from '../../../shared/types'
import { compareText, isPredictableMatch, toRecordByTeamId } from '../../../shared/utils'
import type { TeamMatchWithTournament, UpcomingLimit } from '../types'

export function buildContextsByTeamId(payloads: Array<{
  tournament: TournamentSummary
  ratings?: CombinedRatingsResponse
  teams: TeamSummary[]
}>) {
  const contextsByTeamId: Record<number, UserTeamContext[]> = {}

  payloads.forEach(({ tournament, teams, ratings }) => {
    const ratingsById = toRecordByTeamId(ratings?.teams ?? [])
    teams.forEach((team) => {
      const rating = ratingsById[team.id]
      const context: UserTeamContext = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        season: tournament.season,
        country: tournament.competitionCountry || tournament.competitionName,
        isActive: tournament.isActive,
        baseElo: rating?.baseElo,
        formAdjustment: rating?.formAdjustment,
        performanceAdjustment: rating?.performanceAdjustment,
        squadQualityAdjustment: rating?.squadQualityAdjustment,
        finalRating: rating?.finalRating,
        lastSyncedAtUtc: tournament.lastSyncedAtUtc,
      }

      contextsByTeamId[team.id] = [...(contextsByTeamId[team.id] ?? []), context]
    })
  })

  return contextsByTeamId
}

export function buildTeamDirectoryRows(teams: TeamSummary[], teamContexts: Record<number, UserTeamContext[]>) {
  return teams.map((team) => {
    const contexts = sortTeamContexts(teamContexts[team.id] ?? [])
    const ratedContexts = contexts.filter((context) => context.finalRating !== undefined)
    const latestRatingContext = ratedContexts.sort((left, right) => (right.finalRating ?? 0) - (left.finalRating ?? 0))[0]
    const lastSyncedAtUtc = contexts
      .map((context) => context.lastSyncedAtUtc)
      .filter(Boolean)
      .sort((left, right) => new Date(right ?? 0).getTime() - new Date(left ?? 0).getTime())[0]

    return {
      team,
      countries: [...new Set(contexts.map((context) => context.country).filter(Boolean))],
      contexts,
      latestRating: latestRatingContext?.finalRating,
      latestRatingContext,
      lastSyncedAtUtc,
    }
  })
}

export function getTeamCountryOptions(rows: UserTeamDirectoryRow[]) {
  return [...new Set(rows.flatMap((row) => row.countries))]
    .filter(Boolean)
    .sort(compareText)
}

export function getTeamTournamentOptions(tournaments: TournamentSummary[]) {
  return [...tournaments].sort((left, right) => compareText(left.name, right.name))
}

export function getDisplayedTeamRows({
  countryFilter,
  rows,
  search,
  sortDirection,
  sortKey,
  tournamentFilter,
}: {
  countryFilter: string
  rows: UserTeamDirectoryRow[]
  search: string
  sortDirection: SortDirection
  sortKey: UserTeamSortKey
  tournamentFilter: string
}) {
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    if (countryFilter !== 'all' && !row.countries.includes(countryFilter)) {
      return false
    }

    if (tournamentFilter !== 'all' && !row.contexts.some((context) => String(context.tournamentId) === tournamentFilter)) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return [
      row.team.name,
      row.team.abbreviation,
      ...row.countries,
      ...row.contexts.flatMap((context) => [
        context.tournamentName,
        context.season,
        context.country,
        context.finalRating?.toFixed(2),
      ]),
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch))
  })

  return filtered.sort((left, right) => {
    let comparison = 0
    if (sortKey === 'team') {
      comparison = compareText(left.team.name, right.team.name)
    } else if (sortKey === 'country') {
      comparison = compareText(left.countries[0], right.countries[0])
    } else if (sortKey === 'tournaments') {
      comparison = left.contexts.length - right.contexts.length
    } else if (sortKey === 'rating') {
      comparison = (left.latestRating ?? -1) - (right.latestRating ?? -1)
    } else if (sortKey === 'lastSync') {
      comparison = new Date(left.lastSyncedAtUtc ?? 0).getTime() - new Date(right.lastSyncedAtUtc ?? 0).getTime()
    }

    if (comparison === 0) {
      comparison = compareText(left.team.name, right.team.name)
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })
}

export function sortTeamContexts(contexts: UserTeamContext[]) {
  return [...contexts].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1
    }

    return compareText(left.tournamentName, right.tournamentName)
  })
}

export function buildTeamDetailContext({
  rating,
  tournament,
}: {
  rating?: CombinedRatingsResponse['teams'][number]
  tournament: TournamentSummary
}): UserTeamContext {
  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    season: tournament.season,
    country: tournament.competitionCountry || tournament.competitionName,
    isActive: tournament.isActive,
    baseElo: rating?.baseElo,
    formAdjustment: rating?.formAdjustment,
    performanceAdjustment: rating?.performanceAdjustment,
    squadQualityAdjustment: rating?.squadQualityAdjustment,
    finalRating: rating?.finalRating,
    lastSyncedAtUtc: tournament.lastSyncedAtUtc,
  }
}

export function getLatestTeamContext(contexts: UserTeamContext[]) {
  return contexts
    .filter((context) => context.finalRating !== undefined)
    .sort((left, right) => (right.finalRating ?? 0) - (left.finalRating ?? 0))[0]
}

export function getLatestTeamSync(contexts: UserTeamContext[]) {
  return contexts
    .map((context) => context.lastSyncedAtUtc)
    .filter(Boolean)
    .sort((left, right) => new Date(right ?? 0).getTime() - new Date(left ?? 0).getTime())[0]
}

export function getUpcomingTeamMatches(matches: TeamMatchWithTournament[], limit: UpcomingLimit) {
  const upcomingMatches = matches
    .filter((match) => isPredictableMatch(match))
    .sort((left, right) => new Date(left.kickoffUtc ?? 0).getTime() - new Date(right.kickoffUtc ?? 0).getTime())

  return limit === 'all' ? upcomingMatches : upcomingMatches.slice(0, Number(limit))
}

export function getSortedSquadPlayers({
  players,
  sortDirection,
  sortKey,
}: {
  players: SquadPlayerSnapshot[]
  sortDirection: SortDirection
  sortKey: SquadPlayerSortKey
}) {
  return [...players].sort((left, right) => {
    let comparison = 0
    if (sortKey === 'name') {
      comparison = compareText(left.playerName, right.playerName)
    } else if (sortKey === 'position') {
      comparison = compareText(left.position || left.positionGroup, right.position || right.positionGroup)
    } else if (sortKey === 'age') {
      comparison = (left.age ?? -1) - (right.age ?? -1)
    } else if (sortKey === 'nationality') {
      comparison = compareText(left.nationalities, right.nationalities)
    } else if (sortKey === 'value') {
      comparison = (left.marketValueEur ?? -1) - (right.marketValueEur ?? -1)
    } else if (sortKey === 'contract') {
      comparison = new Date(left.contractUntil ?? 0).getTime() - new Date(right.contractUntil ?? 0).getTime()
    }

    if (comparison === 0) {
      comparison = compareText(left.playerName, right.playerName)
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
