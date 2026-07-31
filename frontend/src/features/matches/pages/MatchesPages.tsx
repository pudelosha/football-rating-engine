import { useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type {
  MatchSummary,
  PublicMatchSortKey,
  SortDirection,
  TournamentDetails,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import { MatchFilters } from '../components/MatchFilters'
import { PublicMatchesTable } from '../components/PublicMatchesTable'
import { TournamentMatchesTable } from '../components/TournamentMatchesTable'
import {
  getDisplayedMatches,
  getFirstRound,
  getNextSortDirection,
  getRoundOptions,
  getSortedTournaments,
} from '../model/matchesModel'
import { fetchTournaments, fetchTournamentWithMatches } from '../services/matchesService'
import type {
  BackHandler,
  MatchesToastHandler,
  MatchesTranslation,
  MatchesUser,
  OpenTournamentHandler,
} from '../types'

export function UserMatchesPanel({
  t,
  user,
  onToast,
  onOpen,
}: {
  t: MatchesTranslation
  user: MatchesUser
  onToast: MatchesToastHandler
  onOpen: OpenTournamentHandler
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<TournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const result = await fetchTournaments(user.token)
        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        setTournaments(result.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
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
  }, [onToast, t.genericError, user.token])

  const sortedTournaments = useMemo(() => getSortedTournaments({
    search,
    sortDirection,
    sortKey,
    tournaments,
  }), [search, sortDirection, sortKey, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    setSortDirection((current) => getNextSortDirection(
      sortKey,
      key,
      current,
      key === 'teams' || key === 'matches' || key === 'lastSync' ? 'desc' : 'asc',
    ))
    setSortKey(key)
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.userMatchesPanelEyebrow}</p>
          <h1>{t.userMatchesPanelTitle}</h1>
          <p>{t.userMatchesPanelCopy}</p>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <TournamentMatchesTable
          isLoading={isLoading}
          search={search}
          sortDirection={sortDirection}
          sortKey={sortKey}
          t={t}
          tournaments={sortedTournaments}
          onOpen={onOpen}
          onSearchChange={setSearch}
          onSort={requestSort}
        />
      </div>
    </section>
  )
}

export function UserMatchDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: MatchesTranslation
  user: MatchesUser
  tournamentId: number
  onToast: MatchesToastHandler
  onBack: BackHandler
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roundFilter, setRoundFilter] = useState('all')
  const [sortKey, setSortKey] = useState<PublicMatchSortKey>('kickoff')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [tournamentResult, matchesResult] = await fetchTournamentWithMatches(user.token, tournamentId)

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data) {
          onToast(tournamentResult.message || t.tournamentLoadFailed, 'error')
          return
        }

        if (!matchesResult.ok || !matchesResult.data) {
          onToast(matchesResult.message || t.genericError, 'error')
          return
        }

        setTournament(tournamentResult.data)
        setMatches(matchesResult.data)
        setRoundFilter(getFirstRound(matchesResult.data))
      } catch {
        if (isMounted) {
          onToast(t.tournamentLoadFailed, 'error')
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
  }, [onToast, t.genericError, t.tournamentLoadFailed, tournamentId, user.token])

  const roundOptions = useMemo(() => getRoundOptions(matches), [matches])
  const selectedRoundIndex = roundOptions.findIndex((round) => round === roundFilter)
  const displayedMatches = useMemo(() => getDisplayedMatches({
    matches,
    roundFilter,
    search,
    sortDirection,
    sortKey,
    t,
  }), [matches, roundFilter, search, sortDirection, sortKey, t])

  const goToPreviousRound = () => {
    if (selectedRoundIndex > 0) {
      setRoundFilter(roundOptions[selectedRoundIndex - 1])
    }
  }

  const goToNextRound = () => {
    if (selectedRoundIndex < roundOptions.length - 1) {
      setRoundFilter(roundOptions[Math.max(selectedRoundIndex + 1, 0)])
    }
  }

  const requestSort = (key: PublicMatchSortKey) => {
    setSortDirection((current) => getNextSortDirection(sortKey, key, current))
    setSortKey(key)
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.userMatchDetailsEyebrow}</p>
          <h1>{tournament?.name || t.userMatchDetailsTitle}</h1>
          <p>{t.userMatchDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToMatches}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="matches" />
              <h2>{t.matches}</h2>
            </div>
            <MatchFilters
              roundFilter={roundFilter}
              roundOptions={roundOptions}
              search={search}
              selectedRoundIndex={selectedRoundIndex}
              t={t}
              onNextRound={goToNextRound}
              onPreviousRound={goToPreviousRound}
              onRoundFilterChange={setRoundFilter}
              onSearchChange={setSearch}
            />
          </div>

          <PublicMatchesTable
            isLoading={isLoading}
            matches={displayedMatches}
            sortDirection={sortDirection}
            sortKey={sortKey}
            t={t}
            onSort={requestSort}
          />
        </section>
      </div>
    </section>
  )
}
