import { useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type {
  MatchSummary,
  SortDirection,
  SquadPlayerSnapshot,
  SquadPlayerSortKey,
  SquadQualitySnapshot,
  TeamSummary,
  TournamentSummary,
  UserTeamContext,
  UserTeamSortKey,
} from '../../../shared/types'
import { TeamDirectoryPanel } from '../components/TeamDirectoryPanel'
import { TeamMatchHistoryPanel } from '../components/TeamMatchHistoryPanel'
import { TeamOverviewPanel } from '../components/TeamOverviewPanel'
import { TeamRatingContextsPanel } from '../components/TeamRatingContextsPanel'
import { TeamSquadSnapshotPanel } from '../components/TeamSquadSnapshotPanel'
import {
  buildContextsByTeamId,
  buildTeamDetailContext,
  buildTeamDirectoryRows,
  getDisplayedTeamRows,
  getNextSortDirection,
  getSortedSquadPlayers,
  getTeamCountryOptions,
  getTeamTournamentOptions,
  getUpcomingTeamMatches,
  sortTeamContexts,
} from '../model/teamsModel'
import {
  fetchSquadPlayers,
  fetchSquadSnapshot,
  fetchTeam,
  fetchTeamDetailsContext,
  fetchTeamDirectoryContext,
  fetchTeams,
  fetchTournaments,
} from '../services/teamsService'
import type {
  BackToTeamsHandler,
  OpenRatingsHandler,
  OpenTeamHandler,
  TeamMatchWithTournament,
  TeamsToastHandler,
  TeamsTranslation,
  TeamsUser,
  UpcomingLimit,
} from '../types'

export function UserTeamsPanel({
  t,
  user,
  onToast,
  onOpen,
}: {
  t: TeamsTranslation
  user: TeamsUser
  onToast: TeamsToastHandler
  onOpen: OpenTeamHandler
}) {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [teamContexts, setTeamContexts] = useState<Record<number, UserTeamContext[]>>({})
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [tournamentFilter, setTournamentFilter] = useState('all')
  const [sortKey, setSortKey] = useState<UserTeamSortKey>('team')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [teamsResult, tournamentsResult] = await Promise.all([
          fetchTeams(user.token),
          fetchTournaments(user.token),
        ])

        if (!isMounted) {
          return
        }

        if (!teamsResult.ok || !teamsResult.data || !tournamentsResult.ok || !tournamentsResult.data) {
          onToast(t.teamsLoadFailed, 'error')
          return
        }

        const loadedTournaments = tournamentsResult.data
        const contextResults = await Promise.all(loadedTournaments.map(async (tournament) => {
          const [tournamentTeamsResult, ratingsResult] = await fetchTeamDirectoryContext(user.token, tournament.id)

          return {
            tournament,
            teams: tournamentTeamsResult.ok && tournamentTeamsResult.data ? tournamentTeamsResult.data : [],
            ratings: ratingsResult.ok && ratingsResult.data ? ratingsResult.data : undefined,
          }
        }))

        if (!isMounted) {
          return
        }

        setTeams(teamsResult.data)
        setTournaments(loadedTournaments)
        setTeamContexts(buildContextsByTeamId(contextResults))
      } catch {
        if (isMounted) {
          onToast(t.teamsLoadFailed, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [onToast, t.teamsLoadFailed, user.token])

  const rows = useMemo(() => buildTeamDirectoryRows(teams, teamContexts), [teamContexts, teams])
  const countryOptions = useMemo(() => getTeamCountryOptions(rows), [rows])
  const tournamentOptions = useMemo(() => getTeamTournamentOptions(tournaments), [tournaments])
  const displayedRows = useMemo(() => getDisplayedTeamRows({
    countryFilter,
    rows,
    search,
    sortDirection,
    sortKey,
    tournamentFilter,
  }), [countryFilter, rows, search, sortDirection, sortKey, tournamentFilter])

  const requestSort = (key: UserTeamSortKey) => {
    setSortDirection((current) => getNextSortDirection(sortKey, key, current, key === 'team' || key === 'country' ? 'asc' : 'desc'))
    setSortKey(key)
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.teamsPanelEyebrow}</p>
          <h1>{t.teamsPanelTitle}</h1>
          <p>{t.teamsPanelCopy}</p>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <TeamDirectoryPanel
          countries={countryOptions}
          countryFilter={countryFilter}
          displayedRows={displayedRows}
          isLoading={isLoading}
          search={search}
          sortDirection={sortDirection}
          sortKey={sortKey}
          t={t}
          tournamentFilter={tournamentFilter}
          tournaments={tournamentOptions}
          onCountryFilterChange={setCountryFilter}
          onOpen={onOpen}
          onSearchChange={setSearch}
          onSort={requestSort}
          onTournamentFilterChange={setTournamentFilter}
        />
      </div>
    </section>
  )
}

export function UserTeamDetailsPanel({
  t,
  user,
  teamId,
  onToast,
  onBack,
  onOpenRatings,
}: {
  t: TeamsTranslation
  user: TeamsUser
  teamId: number
  onToast: TeamsToastHandler
  onBack: BackToTeamsHandler
  onOpenRatings: OpenRatingsHandler
}) {
  const [team, setTeam] = useState<TeamSummary | null>(null)
  const [contexts, setContexts] = useState<UserTeamContext[]>([])
  const [matches, setMatches] = useState<TeamMatchWithTournament[]>([])
  const [squadSnapshot, setSquadSnapshot] = useState<SquadQualitySnapshot | null>(null)
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayerSnapshot[]>([])
  const [upcomingLimit, setUpcomingLimit] = useState<UpcomingLimit>('5')
  const [playerSortKey, setPlayerSortKey] = useState<SquadPlayerSortKey>('value')
  const [playerSortDirection, setPlayerSortDirection] = useState<SortDirection>('desc')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [teamResult, tournamentsResult, squadResult] = await Promise.all([
          fetchTeam(user.token, teamId),
          fetchTournaments(user.token),
          fetchSquadSnapshot(user.token, teamId),
        ])

        if (!isMounted) {
          return
        }

        if (!teamResult.ok || !teamResult.data || !tournamentsResult.ok || !tournamentsResult.data) {
          onToast(t.teamLoadFailed, 'error')
          return
        }

        const loadedTournaments = tournamentsResult.data
        const loadedSquadSnapshot = squadResult.ok && squadResult.data ? squadResult.data : null
        const playersResult = loadedSquadSnapshot
          ? await fetchSquadPlayers(user.token, loadedSquadSnapshot.id)
          : null
        const contextResults = await Promise.all(loadedTournaments.map(async (tournament) => {
          const [teamsResult, ratingsResult, matchesResult] = await fetchTeamDetailsContext(user.token, tournament.id)

          const hasTeam = teamsResult.ok && teamsResult.data
            ? teamsResult.data.some((item) => item.id === teamId)
            : false
          const rating = ratingsResult.ok && ratingsResult.data
            ? ratingsResult.data.teams.find((item) => item.teamId === teamId)
            : undefined
          const teamMatches = matchesResult.ok && matchesResult.data
            ? matchesResult.data.filter((match) => match.homeTeam?.id === teamId || match.awayTeam?.id === teamId)
            : []

          return { tournament, hasTeam, rating, teamMatches }
        }))

        if (!isMounted) {
          return
        }

        const loadedContexts = sortTeamContexts(contextResults
          .filter((result) => result.hasTeam)
          .map(({ tournament, rating }) => buildTeamDetailContext({ tournament, rating })))

        const loadedMatches = contextResults
          .flatMap(({ tournament, teamMatches }) => teamMatches.map((match: MatchSummary) => ({ ...match, tournamentName: tournament.name })))
          .sort((left, right) => new Date(right.kickoffUtc ?? 0).getTime() - new Date(left.kickoffUtc ?? 0).getTime())

        setTeam(teamResult.data)
        setContexts(loadedContexts)
        setMatches(loadedMatches)
        setSquadSnapshot(loadedSquadSnapshot)
        setSquadPlayers(playersResult?.ok && playersResult.data ? playersResult.data : [])
      } catch {
        if (isMounted) {
          onToast(t.teamLoadFailed, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [onToast, t.teamLoadFailed, teamId, user.token])

  const displayedUpcomingMatches = useMemo(
    () => getUpcomingTeamMatches(matches, upcomingLimit),
    [matches, upcomingLimit],
  )
  const sortedSquadPlayers = useMemo(() => getSortedSquadPlayers({
    players: squadPlayers,
    sortDirection: playerSortDirection,
    sortKey: playerSortKey,
  }), [playerSortDirection, playerSortKey, squadPlayers])

  const requestPlayerSort = (key: SquadPlayerSortKey) => {
    setPlayerSortDirection((current) => getNextSortDirection(playerSortKey, key, current, key === 'value' ? 'desc' : 'asc'))
    setPlayerSortKey(key)
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout team-profile-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.teamDetailsEyebrow}</p>
          <h1>{team?.name || t.teamDetailsTitle}</h1>
          <p>{t.teamDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToTeams}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <TeamOverviewPanel contexts={contexts} squadSnapshot={squadSnapshot} t={t} team={team} />
        <TeamRatingContextsPanel contexts={contexts} isLoading={isLoading} t={t} onOpenRatings={onOpenRatings} />
        <TeamMatchHistoryPanel
          matches={displayedUpcomingMatches}
          t={t}
          upcomingLimit={upcomingLimit}
          onUpcomingLimitChange={setUpcomingLimit}
        />
        <TeamSquadSnapshotPanel
          playerSortDirection={playerSortDirection}
          playerSortKey={playerSortKey}
          players={sortedSquadPlayers}
          squadSnapshot={squadSnapshot}
          t={t}
          onPlayerSort={requestPlayerSort}
        />
      </div>
    </section>
  )
}
