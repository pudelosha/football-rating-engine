import { useEffect, useMemo, useState } from 'react'
import { authorizedRequest } from '../../../shared/api/httpClient'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import { translations } from '../../../i18n'
import type {
  AuthUser,
  Language,
  MatchSummary,
  PublicMatchSortKey,
  SortDirection,
  ToastTone,
  TournamentDetails,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import { compareText, formatDate, matchStatusText } from '../../../shared/utils'
export function UserMatchesPanel({
  t,
  user,
  onToast,
  onOpen,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onOpen: (id: number) => void
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
        const result = await authorizedRequest<TournamentSummary[]>(user.token, '/api/tournaments')
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

  const sortedTournaments = useMemo(() => {
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
  }, [search, sortDirection, sortKey, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'teams' || key === 'matches' || key === 'lastSync' ? 'desc' : 'asc')
  }

  const tournamentHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.teams },
    { key: 'matches', label: t.matches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

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

        <section className="details-panel">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="matches" />
              <h2>{t.matches}</h2>
            </div>
            <label className="tournament-search compact">
              <span>{t.tournamentSearch}</span>
              <input
                placeholder={t.tournamentSearchPlaceholder}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-tournament-table">
              <thead>
                <tr>
                  {tournamentHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td><strong>{tournament.name}</strong></td>
                    <td>{tournament.season}</td>
                    <td>{tournament.competitionCountry}</td>
                    <td>{tournament.teamCount}</td>
                    <td>{tournament.matchCount}</td>
                    <td>{formatDate(tournament.lastSyncedAtUtc, '-')}</td>
                    <td>
                      <button type="button" onClick={() => onOpen(tournament.id)}>
                        {t.matchOpenTournament}
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedTournaments.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
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
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: number
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
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
        const [tournamentResult, matchesResult] = await Promise.all([
          authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`),
          authorizedRequest<MatchSummary[]>(user.token, `/api/tournaments/${tournamentId}/matches`),
        ])

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

        const loadedMatches = matchesResult.data
        const firstRound = [...new Set(loadedMatches.map((match) => match.roundInfo).filter(Boolean))]
          .sort((left, right) => compareText(left, right))[0]

        setTournament(tournamentResult.data)
        setMatches(loadedMatches)
        setRoundFilter(firstRound ?? 'all')
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

  const roundOptions = useMemo(() => {
    return [...new Set(matches.map((match) => match.roundInfo).filter(Boolean))]
      .sort((left, right) => compareText(left, right))
  }, [matches])
  const selectedRoundIndex = roundOptions.findIndex((round) => round === roundFilter)
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

  const displayedMatches = useMemo(() => {
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
  }, [matches, roundFilter, search, sortDirection, sortKey, t])

  const requestSort = (key: PublicMatchSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const matchHeaders: Array<{ key: PublicMatchSortKey; label: string }> = [
    { key: 'kickoff', label: t.kickoff },
    { key: 'round', label: t.round },
    { key: 'home', label: t.homeTeam },
    { key: 'away', label: t.awayTeam },
    { key: 'score', label: t.score },
    { key: 'status', label: t.status },
  ]

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
            <div className="match-filter-bar rating-checkpoint-controls">
              <label className="tournament-search compact">
                <span>{t.matchSearch}</span>
                <input
                  placeholder={t.matchSearchPlaceholder}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="round-filter-stepper">
                <label className="label-hidden">
                  <span>{t.roundFilter}</span>
                  <select value={roundFilter} onChange={(event) => setRoundFilter(event.target.value)}>
                    <option value="all">{t.allRounds}</option>
                    {roundOptions.map((round) => (
                      <option value={round} key={round}>{round}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="round-step-button"
                  aria-label="Previous round"
                  disabled={selectedRoundIndex <= 0}
                  onClick={goToPreviousRound}
                >
                  <span>-</span>
                </button>
                <button
                  type="button"
                  className="round-step-button"
                  aria-label="Next round"
                  disabled={roundOptions.length === 0 || selectedRoundIndex >= roundOptions.length - 1}
                  onClick={goToNextRound}
                >
                  <span>+</span>
                </button>
              </div>
            </div>
          </div>

          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table matches-table public-matches-table">
              <thead>
                <tr>
                  {matchHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        className="table-sort-button"
                        type="button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedMatches.map((match) => (
                  <tr key={match.id}>
                    <td>{formatDate(match.kickoffUtc, '-')}</td>
                    <td>{match.roundInfo || '-'}</td>
                    <td>{match.homeTeam?.name || match.homeTeamNameSnapshot || '-'}</td>
                    <td>{match.awayTeam?.name || match.awayTeamNameSnapshot || '-'}</td>
                    <td>{match.homeScore ?? '-'} : {match.awayScore ?? '-'}</td>
                    <td>{matchStatusText(match.status, t)}</td>
                  </tr>
                ))}
                {!isLoading && displayedMatches.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={6}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

