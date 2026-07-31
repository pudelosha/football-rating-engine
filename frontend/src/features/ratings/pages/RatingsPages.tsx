import { useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { RatingValue } from '../../../shared/components/Rating/RatingValue'
import { TooltipMetric } from '../../../shared/components/Rating/TooltipMetric'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type {
  CombinedRatingsResponse,
  CombinedTeamRating,
  RatingTeamSortKey,
  SortDirection,
  TeamFormMatchSnapshot,
  TeamFormRatingDetail,
  TeamPerformanceMatchSnapshot,
  TeamPerformanceRatingDetail,
  TeamSquadQualityRatingDetail,
  TournamentDetails,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import {
  formatDate,
  formatMoney,
  formatNullableScore,
  formatSigned,
  groupByTeamId,
  toRecordByTeamId,
} from '../../../shared/utils'
import { RatingsTournamentTable } from '../components/RatingsTournamentTable'
import { getNextSortDirection, getSortedRatingTournaments, getSortedTeamRatings } from '../model/ratingsModel'
import {
  fetchCombinedRatings,
  fetchFormRatings,
  fetchFormSnapshots,
  fetchPerformanceRatings,
  fetchPerformanceSnapshots,
  fetchRatingTournaments,
  fetchSquadRatings,
  fetchTournamentDetails,
} from '../services/ratingsService'
import type { BackToRatingsHandler, OpenRatingTournamentHandler, RatingsToastHandler, RatingsTranslation, RatingsUser } from '../types'
export function UserRatingsPanel({
  t,
  user,
  onToast,
  onOpen,
}: {
  t: RatingsTranslation
  user: RatingsUser
  onToast: RatingsToastHandler
  onOpen: OpenRatingTournamentHandler
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
        const result = await fetchRatingTournaments(user.token)
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

  const sortedTournaments = useMemo(() => getSortedRatingTournaments({
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
          <p className="eyebrow">{t.userRatingsPanelEyebrow}</p>
          <h1>{t.userRatingsPanelTitle}</h1>
          <p>{t.userRatingsPanelCopy}</p>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <RatingsTournamentTable
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

export function UserRatingDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: RatingsTranslation
  user: RatingsUser
  tournamentId: number
  onToast: RatingsToastHandler
  onBack: BackToRatingsHandler
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [combinedRatings, setCombinedRatings] = useState<CombinedRatingsResponse | null>(null)
  const [formDetailsByTeamId, setFormDetailsByTeamId] = useState<Record<number, TeamFormRatingDetail>>({})
  const [formSnapshotsByTeamId, setFormSnapshotsByTeamId] = useState<Record<number, TeamFormMatchSnapshot[]>>({})
  const [performanceDetailsByTeamId, setPerformanceDetailsByTeamId] = useState<Record<number, TeamPerformanceRatingDetail>>({})
  const [performanceSnapshotsByTeamId, setPerformanceSnapshotsByTeamId] = useState<Record<number, TeamPerformanceMatchSnapshot[]>>({})
  const [squadDetailsByTeamId, setSquadDetailsByTeamId] = useState<Record<number, TeamSquadQualityRatingDetail>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<RatingTeamSortKey>('finalRating')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [checkpoint, setCheckpoint] = useState('latest')
  const [comparison, setComparison] = useState('previous')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [tournamentResult, ratingsResult] = await Promise.all([
          fetchTournamentDetails(user.token, tournamentId),
          fetchCombinedRatings(user.token, tournamentId),
        ])

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data) {
          onToast(tournamentResult.message || t.genericError, 'error')
          return
        }

        if (!ratingsResult.ok || !ratingsResult.data) {
          onToast(ratingsResult.message || t.genericError, 'error')
          return
        }

        const [formResult, performanceResult, squadResult, formSnapshotsResult, performanceSnapshotsResult] = await Promise.all([
          fetchFormRatings(user.token, tournamentId),
          fetchPerformanceRatings(user.token, tournamentId),
          fetchSquadRatings(user.token, tournamentId),
          fetchFormSnapshots(user.token, ratingsResult.data.runContext.formRatingRunId),
          fetchPerformanceSnapshots(user.token, ratingsResult.data.runContext.performanceRatingRunId),
        ])

        setTournament(tournamentResult.data)
        setCombinedRatings(ratingsResult.data)
        setFormDetailsByTeamId(toRecordByTeamId(formResult.ok && formResult.data ? formResult.data : []))
        setPerformanceDetailsByTeamId(toRecordByTeamId(performanceResult.ok && performanceResult.data ? performanceResult.data : []))
        setSquadDetailsByTeamId(toRecordByTeamId(squadResult.ok && squadResult.data ? squadResult.data : []))
        setFormSnapshotsByTeamId(groupByTeamId(formSnapshotsResult.ok && formSnapshotsResult.data ? formSnapshotsResult.data : []))
        setPerformanceSnapshotsByTeamId(groupByTeamId(performanceSnapshotsResult.ok && performanceSnapshotsResult.data ? performanceSnapshotsResult.data : []))
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
  }, [onToast, t.genericError, tournamentId, user.token])

  const displayedTeams = useMemo(() => {
    return getSortedTeamRatings({
      sortDirection,
      sortKey,
      teams: combinedRatings?.teams ?? [],
    })
  }, [combinedRatings, sortDirection, sortKey])

  const requestSort = (key: RatingTeamSortKey) => {
    setSortDirection((current) => getNextSortDirection(sortKey, key, current, key === 'team' ? 'asc' : 'desc'))
    setSortKey(key)
  }

  const ratingHeaders: Array<{ key: RatingTeamSortKey; label: string }> = [
    { key: 'team', label: t.ratingTeam },
    { key: 'baseElo', label: t.ratingBaseElo },
    { key: 'form', label: t.ratingForm },
    { key: 'performance', label: t.ratingPerformance },
    { key: 'squad', label: t.ratingSquad },
    { key: 'finalRating', label: t.ratingFinal },
    { key: 'confidence', label: t.ratingConfidence },
  ]

  const renderBaseTooltip = (team: CombinedTeamRating) => (
    <>
      <strong className="rating-tooltip-title">{team.teamName} - {t.ratingBaseElo}</strong>
      <span className="rating-tooltip-grid">
        <TooltipMetric label="Rating" value={team.baseElo.toFixed(2)} />
        <TooltipMetric label="Last match" value={formatDate(team.lastBaseEloMatchUtc, '-')} />
      </span>
    </>
  )

  const renderFormTooltip = (team: CombinedTeamRating) => {
    const detail = formDetailsByTeamId[team.teamId]
    const snapshots = formSnapshotsByTeamId[team.teamId] ?? []

    return (
      <>
        <strong className="rating-tooltip-title">{team.teamName} - {t.ratingForm}</strong>
        <span className="rating-tooltip-grid">
          <TooltipMetric label="Adjustment" value={formatSigned(team.formAdjustment)} />
          <TooltipMetric label="Matches" value={detail?.matchCount ?? team.formMatchesPlayed} />
          <TooltipMetric label="Weighted actual" value={detail ? detail.weightedActual.toFixed(4) : '-'} />
          <TooltipMetric label="Weighted expected" value={detail ? detail.weightedExpected.toFixed(4) : '-'} />
          <TooltipMetric label="Weighted delta" value={detail ? formatSigned(detail.weightedDelta) : '-'} />
          <TooltipMetric label="Average delta" value={detail ? formatSigned(detail.averageDelta) : '-'} />
        </span>
        {snapshots.length > 0 && (
          <span className="rating-tooltip-list">
            {snapshots.map((snapshot) => (
              <span key={`${snapshot.kickoffUtc}-${snapshot.opponentTeamName}`}>
                vs <strong>{snapshot.opponentTeamName}</strong>: actual {snapshot.actual.toFixed(2)}, expected {snapshot.expected.toFixed(2)}, weighted {formatSigned(snapshot.weightedDelta)}
              </span>
            ))}
          </span>
        )}
      </>
    )
  }

  const renderPerformanceTooltip = (team: CombinedTeamRating) => {
    const detail = performanceDetailsByTeamId[team.teamId]
    const snapshots = performanceSnapshotsByTeamId[team.teamId] ?? []

    return (
      <>
        <strong className="rating-tooltip-title">{team.teamName} - {t.ratingPerformance}</strong>
        <span className="rating-tooltip-grid">
          <TooltipMetric label="Adjustment" value={formatSigned(team.performanceAdjustment)} />
          <TooltipMetric label="Matches" value={detail?.matchCount ?? team.performanceMatchesPlayed} />
          <TooltipMetric label="Data coverage" value={detail ? `${Math.round(detail.dataCoverage * 100)}%` : '-'} />
          <TooltipMetric label="Raw score" value={detail ? detail.rawPerformanceScore.toFixed(4) : '-'} />
        </span>
        {snapshots.length > 0 && (
          <span className="rating-tooltip-list">
            {snapshots.map((snapshot) => (
              <span key={`${snapshot.kickoffUtc}-${snapshot.opponentTeamName}`}>
                vs <strong>{snapshot.opponentTeamName}</strong>: xG {formatNullableScore(snapshot.xgScore)}, shots {formatNullableScore(snapshot.shotScore)}, possession {formatNullableScore(snapshot.possessionScore)}, weighted {formatSigned(snapshot.weightedPerformanceScore)}
              </span>
            ))}
          </span>
        )}
      </>
    )
  }

  const renderSquadTooltip = (team: CombinedTeamRating) => {
    const detail = squadDetailsByTeamId[team.teamId]

    return (
      <>
        <strong className="rating-tooltip-title">{team.teamName} - {t.ratingSquad}</strong>
        <span className="rating-tooltip-grid">
          <TooltipMetric label="Adjustment" value={formatSigned(team.squadQualityAdjustment)} />
          <TooltipMetric label="Players" value={detail?.playerCount ?? team.squadPlayerCount} />
          <TooltipMetric label="Total value" value={formatMoney(detail?.totalMarketValueEur)} />
          <TooltipMetric label="Top XI value" value={formatMoney(detail?.topElevenMarketValueEur)} />
          <TooltipMetric label="Top 15 value" value={formatMoney(detail?.topFifteenMarketValueEur)} />
          <TooltipMetric label="Squad score" value={detail ? detail.squadQualityScore.toFixed(4) : '-'} />
          <TooltipMetric label="Top XI score" value={formatNullableScore(detail?.topElevenScore)} />
          <TooltipMetric label="Depth score" value={formatNullableScore(detail?.topFifteenScore)} />
          <TooltipMetric label="Prime age" value={formatNullableScore(detail?.primeAgeScore)} />
          <TooltipMetric label="Balance score" value={formatNullableScore(detail?.positionalBalanceScore)} />
        </span>
      </>
    )
  }

  const renderFinalTooltip = (team: CombinedTeamRating) => (
    <>
      <strong className="rating-tooltip-title">{team.teamName} - {t.ratingFinal}</strong>
      <span className="rating-tooltip-grid">
        <TooltipMetric label={t.ratingBaseElo} value={team.baseElo.toFixed(2)} />
        <TooltipMetric label={t.ratingForm} value={formatSigned(team.formAdjustment)} />
        <TooltipMetric label={t.ratingPerformance} value={formatSigned(team.performanceAdjustment)} />
        <TooltipMetric label={t.ratingSquad} value={formatSigned(team.squadQualityAdjustment)} />
        <TooltipMetric label="Total adjustment" value={formatSigned(team.totalAdjustment)} />
        <TooltipMetric label={t.ratingFinal} value={team.finalRating.toFixed(2)} />
      </span>
    </>
  )

  const renderConfidenceTooltip = (team: CombinedTeamRating) => (
    <>
      <strong className="rating-tooltip-title">{team.teamName} - {t.ratingConfidence}</strong>
      <span className="rating-tooltip-grid">
        <TooltipMetric label="Confidence" value={`${Math.round(team.ratingConfidence * 100)}%`} />
        <TooltipMetric label="Form sample" value={`${team.formMatchesPlayed} matches`} />
        <TooltipMetric label="Performance sample" value={`${team.performanceMatchesPlayed} matches`} />
        <TooltipMetric label="Squad snapshot" value={team.hasSquadQualityRating ? formatDate(team.squadSnapshotFetchedAtUtc, '-') : '-'} />
      </span>
    </>
  )

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.userRatingDetailsEyebrow}</p>
          <h1 className="stacked-page-title">
            <span>{tournament?.name || t.userRatingDetailsTitle}</span>
            {tournament?.season && <small>{tournament.season}</small>}
          </h1>
          <p>{t.userRatingDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToRatings}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="teams" />
              <h2>{t.ratingTeamRatings}</h2>
            </div>
            <div className="rating-checkpoint-controls" aria-label="Rating checkpoint controls">
              <label>
                <span>{t.ratingCheckpoint}</span>
                <select value={checkpoint} onChange={(event) => setCheckpoint(event.target.value)}>
                  <option value="latest">{t.ratingCheckpointLatest}</option>
                  <option value="round-1">{t.ratingCheckpointRoundOne}</option>
                  <option value="round-2">{t.ratingCheckpointRoundTwo}</option>
                </select>
              </label>
              <label>
                <span>{t.ratingCompare}</span>
                <select value={comparison} onChange={(event) => setComparison(event.target.value)}>
                  <option value="previous">{t.ratingComparePrevious}</option>
                  <option value="season-start">{t.ratingCompareSeasonStart}</option>
                </select>
              </label>
              <div className="rating-updated-control">
                <span>{t.ratingUpdated}</span>
                <strong>{combinedRatings ? formatDate(combinedRatings.runContext.calculatedAtUtc, '-') : '-'}</strong>
              </div>
            </div>
          </div>
          <div className="tournament-table-shell compact-table-shell rating-tooltip-table-shell">
            <table className="tournament-table ratings-team-table">
              <thead>
                <tr>
                  {ratingHeaders.map((header) => (
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
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td>
                      <strong>{team.teamName}</strong>
                      <span>{team.teamAbbreviation}</span>
                    </td>
                    <td>
                      <RatingValue value={team.baseElo.toFixed(2)}>
                        {renderBaseTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={formatSigned(team.formAdjustment)}>
                        {renderFormTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={formatSigned(team.performanceAdjustment)}>
                        {renderPerformanceTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={formatSigned(team.squadQualityAdjustment)}>
                        {renderSquadTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={<strong>{team.finalRating.toFixed(2)}</strong>}>
                        {renderFinalTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={`${Math.round(team.ratingConfidence * 100)}%`}>
                        {renderConfidenceTooltip(team)}
                      </RatingValue>
                    </td>
                  </tr>
                ))}
                {!isLoading && displayedTeams.length === 0 && (
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
