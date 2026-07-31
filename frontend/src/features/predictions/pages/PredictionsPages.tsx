import { useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { TooltipMetric } from '../../../shared/components/Rating/TooltipMetric'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type {
  BaseEloMatchSnapshot,
  CombinedRatingsResponse,
  MatchSummary,
  PredictionMatchSortKey,
  SortDirection,
  TournamentDetails,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import {
  formatDate,
  formatPercent,
  formatSigned,
  getFavoriteOutcomeKey,
  getTeamDisplayName,
  toRecordByTeamId,
} from '../../../shared/utils'
import {
  CALIBRATED_HOME_ADVANTAGE,
  DEFAULT_HOME_ADVANTAGE,
  calculateCalibratedPrediction,
  calculateGoalOutputScenario,
  calculateHistoricHeadToHeadSplit,
  calculatePrediction,
  getPredictionShape,
} from '../../../shared/utils/predictionModel'
import { PredictionMiniBar } from '../components/PredictionMiniBar'
import { PredictionCell, PredictionProbabilityCard } from '../components/PredictionProbability'
import { PredictionsTournamentTable } from '../components/PredictionsTournamentTable'
import {
  buildRatingScenarioMetricBars,
  getAgreementLabel,
  getDisplayedPredictionMatches,
  getFirstPredictionRound,
  getNextSortDirection,
  getPredictionRoundOptions,
  getPredictionSummaryGradient,
  getSortedPredictionTournaments,
} from '../model/predictionsModel'
import {
  fetchBaseEloSnapshots,
  fetchPredictionContext,
  fetchPredictionTournaments,
} from '../services/predictionsService'
import type {
  BackHandler,
  BackToPredictionTournamentHandler,
  OpenPredictionMatchHandler,
  OpenPredictionTournamentHandler,
  PredictionsToastHandler,
  PredictionsTranslation,
  PredictionsUser,
} from '../types'

export function PredictionsPanel({
  t,
  user,
  onToast,
  onOpen,
}: {
  t: PredictionsTranslation
  user: PredictionsUser
  onToast: PredictionsToastHandler
  onOpen: OpenPredictionTournamentHandler
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
        const result = await fetchPredictionTournaments(user.token)
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

  const sortedTournaments = useMemo(() => getSortedPredictionTournaments({
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
          <p className="eyebrow">{t.predictionsPanelEyebrow}</p>
          <h1>{t.predictionsPanelTitle}</h1>
          <p>{t.predictionsPanelCopy}</p>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <PredictionsTournamentTable
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

export function TournamentPredictionsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
  onOpenMatch,
}: {
  t: PredictionsTranslation
  user: PredictionsUser
  tournamentId: number
  onToast: PredictionsToastHandler
  onBack: BackHandler
  onOpenMatch: OpenPredictionMatchHandler
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [combinedRatings, setCombinedRatings] = useState<CombinedRatingsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roundFilter, setRoundFilter] = useState('all')
  const [sortKey, setSortKey] = useState<PredictionMatchSortKey>('kickoff')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [tournamentResult, matchesResult, ratingsResult] = await fetchPredictionContext(user.token, tournamentId)

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data || !matchesResult.ok || !matchesResult.data || !ratingsResult.ok || !ratingsResult.data) {
          onToast(t.genericError, 'error')
          return
        }

        const loadedTournament = tournamentResult.data
        const loadedMatches = matchesResult.data
        const loadedRatings = ratingsResult.data
        const ratingsById = toRecordByTeamId(loadedRatings.teams)
        const firstPredictionRound = getFirstPredictionRound(loadedMatches, ratingsById)

        setTournament(loadedTournament)
        setMatches(loadedMatches)
        setCombinedRatings(loadedRatings)
        setRoundFilter(firstPredictionRound ?? 'all')
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

  const ratingsByTeamId = useMemo(() => toRecordByTeamId(combinedRatings?.teams ?? []), [combinedRatings])
  const roundOptions = useMemo(() => getPredictionRoundOptions(matches), [matches])
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
  const predictionLabels = { home: t.homeWin, draw: t.draw, away: t.awayWin }

  const displayedMatches = useMemo(() => getDisplayedPredictionMatches({
    matches,
    predictionLabels,
    ratingsByTeamId,
    roundFilter,
    search,
    sortDirection,
    sortKey,
    tournamentAppliesHomeAdvantage: tournament?.applyHomeAdvantage,
  }), [matches, predictionLabels, ratingsByTeamId, roundFilter, search, sortDirection, sortKey, tournament?.applyHomeAdvantage])

  const requestSort = (key: PredictionMatchSortKey) => {
    setSortDirection((current) => getNextSortDirection(
      sortKey,
      key,
      current,
      key === 'kickoff' || key === 'round' || key === 'home' || key === 'away' ? 'asc' : 'desc',
    ))
    setSortKey(key)
  }

  const headers: Array<{ key: PredictionMatchSortKey; label: string }> = [
    { key: 'kickoff', label: t.kickoff },
    { key: 'round', label: t.round },
    { key: 'home', label: t.homeTeam },
    { key: 'away', label: t.awayTeam },
    { key: 'homeWin', label: t.homeWin },
    { key: 'draw', label: t.draw },
    { key: 'awayWin', label: t.awayWin },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.predictionsDetailsEyebrow}</p>
          <h1 className="stacked-page-title">
            <span>{tournament?.name || t.predictionsDetailsTitle}</span>
            {tournament?.season && <small>{tournament.season}</small>}
          </h1>
          <p>{t.predictionsDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToPredictions}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel prediction-board">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="predictions" />
              <h2>{t.predictionsDetailsTitle}</h2>
            </div>
            <div className="match-filter-bar rating-checkpoint-controls">
              <label className="tournament-search compact">
                <span>{t.predictionSearch}</span>
                <input
                  placeholder={t.predictionSearchPlaceholder}
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
            <table className="tournament-table predictions-table">
              <thead>
                <tr>
                  {headers.map((header) => (
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
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedMatches.map(({ match, prediction }) => (
                  <tr key={match.id}>
                    <td>{formatDate(match.kickoffUtc, '-')}</td>
                    <td>{match.roundInfo || '-'}</td>
                    <td><strong>{getTeamDisplayName(match, 'home')}</strong></td>
                    <td><strong>{getTeamDisplayName(match, 'away')}</strong></td>
                    <td>{prediction ? <PredictionCell value={prediction.homeWin} odds={prediction.homeFairOdds} /> : '-'}</td>
                    <td>{prediction ? <PredictionCell value={prediction.draw} odds={prediction.drawFairOdds} /> : '-'}</td>
                    <td>{prediction ? <PredictionCell value={prediction.awayWin} odds={prediction.awayFairOdds} /> : '-'}</td>
                    <td>
                      <button type="button" onClick={() => onOpenMatch(match.id)}>
                        {t.predictionOpenMatch}
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && displayedMatches.length === 0 && (
                  <tr>
                    <td className="empty-table prediction-empty-table" colSpan={8}>
                      <strong>{t.noFuturePredictions}</strong>
                      <span>{t.noFuturePredictionsCopy}</span>
                    </td>
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

export function PredictionDetailsPanel({
  t,
  user,
  tournamentId,
  matchId,
  onToast,
  onBack,
}: {
  t: PredictionsTranslation
  user: PredictionsUser
  tournamentId: number
  matchId: number
  onToast: PredictionsToastHandler
  onBack: BackToPredictionTournamentHandler
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [combinedRatings, setCombinedRatings] = useState<CombinedRatingsResponse | null>(null)
  const [baseEloSnapshots, setBaseEloSnapshots] = useState<BaseEloMatchSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [tournamentResult, matchesResult, ratingsResult] = await fetchPredictionContext(user.token, tournamentId)

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data || !matchesResult.ok || !matchesResult.data || !ratingsResult.ok || !ratingsResult.data) {
          onToast(t.genericError, 'error')
          return
        }

        let loadedBaseEloSnapshots: BaseEloMatchSnapshot[] = []
        const baseEloRunId = ratingsResult.data.runContext.baseEloRunId
        const usesHistoricalWindow = (ratingsResult.data.runContext.snapshotStartSeasonOffset ?? 0) <= -3

        if (usesHistoricalWindow && baseEloRunId) {
          const snapshotsResult = await fetchBaseEloSnapshots(user.token, baseEloRunId)

          if (!isMounted) {
            return
          }

          if (snapshotsResult.ok && snapshotsResult.data) {
            loadedBaseEloSnapshots = snapshotsResult.data
          }
        }

        setTournament(tournamentResult.data)
        setMatches(matchesResult.data)
        setCombinedRatings(ratingsResult.data)
        setBaseEloSnapshots(loadedBaseEloSnapshots)
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
  }, [matchId, onToast, t.genericError, tournamentId, user.token])

  const match = matches.find((item) => item.id === matchId)
  const ratingsByTeamId = useMemo(() => toRecordByTeamId(combinedRatings?.teams ?? []), [combinedRatings])
  const homeTeam = match?.homeTeam ? ratingsByTeamId[match.homeTeam.id] : undefined
  const awayTeam = match?.awayTeam ? ratingsByTeamId[match.awayTeam.id] : undefined
  const predictionLabels = { home: t.homeWin, draw: t.draw, away: t.awayWin }
  const prediction = homeTeam && awayTeam && tournament
    ? calculatePrediction(homeTeam, awayTeam, tournament.applyHomeAdvantage, predictionLabels)
    : null

  const hasHistoricalSnapshot = (combinedRatings?.runContext.snapshotStartSeasonOffset ?? 0) <= -3
  const historicHeadToHead = hasHistoricalSnapshot && match?.homeTeam && match.awayTeam
    ? calculateHistoricHeadToHeadSplit(baseEloSnapshots, match.homeTeam.id, match.awayTeam.id, predictionLabels)
    : null
  const goalOutputScenario = hasHistoricalSnapshot && match?.homeTeam && match.awayTeam
    ? calculateGoalOutputScenario(baseEloSnapshots, match.homeTeam.id, match.awayTeam.id, predictionLabels)
    : null
  const scenarioHomeAdvantage = tournament?.applyHomeAdvantage ? DEFAULT_HOME_ADVANTAGE : 0
  const actualScenarioPrediction = homeTeam && awayTeam && tournament
    ? calculatePrediction(homeTeam, awayTeam, tournament.applyHomeAdvantage, predictionLabels)
    : null
  const baseEloScenarioPrediction = homeTeam && awayTeam && tournament
    ? calculatePrediction(homeTeam, awayTeam, tournament.applyHomeAdvantage, predictionLabels, {
        homeRating: homeTeam.baseElo,
        awayRating: awayTeam.baseElo,
      })
    : null
  const formHomeRating = homeTeam ? homeTeam.baseElo + homeTeam.formAdjustment : 0
  const formAwayRating = awayTeam ? awayTeam.baseElo + awayTeam.formAdjustment : 0
  const formScenarioPrediction = homeTeam && awayTeam && tournament
    ? calculatePrediction(homeTeam, awayTeam, tournament.applyHomeAdvantage, predictionLabels, {
        homeRating: formHomeRating,
        awayRating: formAwayRating,
      })
    : null
  const squadHomeRating = homeTeam ? homeTeam.baseElo + homeTeam.squadQualityAdjustment : 0
  const squadAwayRating = awayTeam ? awayTeam.baseElo + awayTeam.squadQualityAdjustment : 0
  const squadScenarioPrediction = homeTeam && awayTeam && tournament
    ? calculatePrediction(homeTeam, awayTeam, tournament.applyHomeAdvantage, predictionLabels, {
        homeRating: squadHomeRating,
        awayRating: squadAwayRating,
      })
    : null
  const calibratedNeutralGap = homeTeam && awayTeam ? (homeTeam.finalRating - awayTeam.finalRating) * 0.82 : 0
  const calibratedHomeRating = calibratedNeutralGap / 2
  const calibratedAwayRating = -calibratedNeutralGap / 2
  const calibratedHomeAdvantage = tournament?.applyHomeAdvantage ? CALIBRATED_HOME_ADVANTAGE : 0
  const calibratedScenarioPrediction = homeTeam && awayTeam && tournament
    ? calculateCalibratedPrediction(homeTeam, awayTeam, tournament.applyHomeAdvantage, predictionLabels)
    : null
  const modelScenarios = homeTeam && awayTeam && tournament
    ? [
      {
        title: t.actualModelScenario,
        ingredients: tournament.applyHomeAdvantage ? t.actualModelHomeAdvantageIngredients : t.actualModelIngredients,
        prediction: actualScenarioPrediction,
        summary: actualScenarioPrediction ? `${formatPercent(actualScenarioPrediction.favoriteChance)} | ${t.ratingGap} ${formatSigned(actualScenarioPrediction.ratingGap)}` : '-',
        isHistoric: false,
        metricBars: actualScenarioPrediction
          ? buildRatingScenarioMetricBars(actualScenarioPrediction, homeTeam.finalRating, awayTeam.finalRating, scenarioHomeAdvantage, t)
          : undefined,
      },
      {
        title: t.baseEloOnly,
        ingredients: tournament.applyHomeAdvantage ? t.baseEloHomeAdvantageIngredients : t.baseEloIngredients,
        prediction: baseEloScenarioPrediction,
        summary: baseEloScenarioPrediction ? `${formatPercent(baseEloScenarioPrediction.favoriteChance)} | ${t.ratingGap} ${formatSigned(baseEloScenarioPrediction.ratingGap)}` : '-',
        isHistoric: false,
        metricBars: baseEloScenarioPrediction
          ? buildRatingScenarioMetricBars(baseEloScenarioPrediction, homeTeam.baseElo, awayTeam.baseElo, scenarioHomeAdvantage, t)
          : undefined,
      },
      {
        title: t.formMomentum,
        ingredients: tournament.applyHomeAdvantage ? t.formMomentumHomeAdvantageIngredients : t.formMomentumIngredients,
        prediction: formScenarioPrediction,
        summary: formScenarioPrediction ? `${formatPercent(formScenarioPrediction.favoriteChance)} | ${t.ratingGap} ${formatSigned(formScenarioPrediction.ratingGap)}` : '-',
        isHistoric: false,
        metricBars: formScenarioPrediction
          ? buildRatingScenarioMetricBars(formScenarioPrediction, formHomeRating, formAwayRating, scenarioHomeAdvantage, t)
          : undefined,
      },
      {
        title: t.squadAdjusted,
        ingredients: tournament.applyHomeAdvantage ? t.squadAdjustedHomeAdvantageIngredients : t.squadAdjustedIngredients,
        prediction: squadScenarioPrediction,
        summary: squadScenarioPrediction ? `${formatPercent(squadScenarioPrediction.favoriteChance)} | ${t.ratingGap} ${formatSigned(squadScenarioPrediction.ratingGap)}` : '-',
        isHistoric: false,
        metricBars: squadScenarioPrediction
          ? buildRatingScenarioMetricBars(squadScenarioPrediction, squadHomeRating, squadAwayRating, scenarioHomeAdvantage, t)
          : undefined,
      },
      ...(hasHistoricalSnapshot
        ? [{
            title: t.historicSplit,
            ingredients: t.historicSplitIngredients,
            prediction: historicHeadToHead?.prediction ?? null,
            summary: historicHeadToHead ? `${t.historicSample}: ${historicHeadToHead.sampleSize}` : t.noHistoricHeadToHead,
            isHistoric: true,
            historicBars: historicHeadToHead?.sourceMatches,
          },
          {
            title: t.goalOutput,
            ingredients: t.goalOutputIngredients,
            prediction: goalOutputScenario?.prediction ?? null,
            summary: goalOutputScenario
              ? `${t.goalOutputSample}: ${goalOutputScenario.homeGoalsPerMatch.toFixed(2)} / ${goalOutputScenario.awayGoalsPerMatch.toFixed(2)}`
              : t.noGoalOutputSample,
            isHistoric: true,
            metricBars: goalOutputScenario
              ? {
                  home: [
                    { label: t.goalOutputHomeEdge, value: formatPercent(goalOutputScenario.prediction.homeWin) },
                    { label: t.goalOutputHomeGpm, value: goalOutputScenario.homeGoalsPerMatch.toFixed(2) },
                    { label: t.goalOutputAwayGpm, value: goalOutputScenario.awayGoalsPerMatch.toFixed(2) },
                    { label: t.goalOutputGap, value: formatSigned(goalOutputScenario.goalGap) },
                    { label: t.goalOutputSampleSize, value: `${goalOutputScenario.homeSampleSize} / ${goalOutputScenario.awaySampleSize}` },
                  ],
                  draw: [
                    { label: t.goalOutputDrawPressure, value: formatPercent(goalOutputScenario.prediction.draw) },
                    { label: t.goalOutputGap, value: Math.abs(goalOutputScenario.goalGap).toFixed(2) },
                    { label: t.goalOutputDrawBase, value: formatPercent(goalOutputScenario.drawBase) },
                    { label: t.goalOutputAdjustedDraw, value: formatPercent(goalOutputScenario.adjustedDraw) },
                    { label: t.goalOutputSampleSize, value: `${goalOutputScenario.homeSampleSize} / ${goalOutputScenario.awaySampleSize}` },
                  ],
                  away: [
                    { label: t.goalOutputAwayEdge, value: formatPercent(goalOutputScenario.prediction.awayWin) },
                    { label: t.goalOutputAwayGpm, value: goalOutputScenario.awayGoalsPerMatch.toFixed(2) },
                    { label: t.goalOutputHomeGpm, value: goalOutputScenario.homeGoalsPerMatch.toFixed(2) },
                    { label: t.goalOutputGap, value: formatSigned(-goalOutputScenario.goalGap) },
                    { label: t.goalOutputSampleSize, value: `${goalOutputScenario.awaySampleSize} / ${goalOutputScenario.homeSampleSize}` },
                  ],
                }
              : undefined,
          }]
        : []),
      {
        title: t.calibratedModel,
        ingredients: tournament.applyHomeAdvantage ? t.calibratedModelHomeAdvantageIngredients : t.calibratedModelIngredients,
        prediction: calibratedScenarioPrediction,
        summary: calibratedScenarioPrediction ? `${formatPercent(calibratedScenarioPrediction.favoriteChance)} | ${t.ratingGap} ${formatSigned(calibratedScenarioPrediction.ratingGap)}` : '-',
        isHistoric: false,
        metricBars: calibratedScenarioPrediction
          ? buildRatingScenarioMetricBars(calibratedScenarioPrediction, calibratedHomeRating, calibratedAwayRating, calibratedHomeAdvantage, t)
          : undefined,
      },
    ]
    : []
  const agreementPrediction = modelScenarios[0]?.prediction
  const agreementOutcome = agreementPrediction ? getFavoriteOutcomeKey(agreementPrediction) : null
  const agreementScenarios = agreementOutcome
    ? modelScenarios.filter((scenario) => scenario.prediction)
    : []
  const agreementSupport = agreementOutcome
    ? agreementScenarios.filter((scenario) => scenario.prediction && getFavoriteOutcomeKey(scenario.prediction) === agreementOutcome).length
    : 0
  const agreementSupporters = agreementOutcome
    ? agreementScenarios
        .filter((scenario) => scenario.prediction && getFavoriteOutcomeKey(scenario.prediction) === agreementOutcome)
        .map((scenario) => scenario.title)
    : []
  const agreementTotal = agreementScenarios.length
  const agreementRatio = agreementTotal > 0 ? agreementSupport / agreementTotal : 0
  const scenarios = agreementPrediction && agreementTotal > 0
    ? [
        ...modelScenarios,
        {
          title: t.modelAgreement,
          ingredients: t.modelAgreementIngredients,
          prediction: null,
          summary: `${agreementSupport} / ${agreementTotal} ${t.modelAgreementSupported} ${agreementPrediction.favoriteLabel}`,
          isHistoric: false,
          agreement: {
            label: getAgreementLabel(agreementRatio, t),
            support: agreementSupport,
            total: agreementTotal,
            supporters: agreementSupporters,
          },
        },
      ]
    : modelScenarios

  const strongestSignal = homeTeam && awayTeam
    ? [
      { label: t.ratingBaseElo, value: Math.abs(homeTeam.baseElo - awayTeam.baseElo) },
      { label: t.ratingForm, value: Math.abs(homeTeam.formAdjustment - awayTeam.formAdjustment) },
      { label: t.ratingPerformance, value: Math.abs(homeTeam.performanceAdjustment - awayTeam.performanceAdjustment) },
      { label: t.ratingSquad, value: Math.abs(homeTeam.squadQualityAdjustment - awayTeam.squadQualityAdjustment) },
    ].sort((left, right) => right.value - left.value)[0]
    : null
  const predictionShape = prediction ? getPredictionShape(prediction, t) : null
  const neutralRatingGap = homeTeam && awayTeam ? homeTeam.finalRating - awayTeam.finalRating : 0
  const homeAdvantageValue = prediction ? prediction.ratingGap - neutralRatingGap : 0
  const appliesHomeAdvantage = Boolean(tournament?.applyHomeAdvantage)

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero prediction-hero">
          <p className="eyebrow">{t.predictionMatchEyebrow}</p>
          {match ? (
            <h1 className="prediction-match-title">
              <span>{getTeamDisplayName(match, 'home')}</span>
              <span>{getTeamDisplayName(match, 'away')}</span>
            </h1>
          ) : (
            <h1>{t.predictionMatchTitle}</h1>
          )}
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={() => onBack(tournamentId)}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToPredictionList}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {!isLoading && (!match || !prediction || !homeTeam || !awayTeam) && (
          <section className="details-panel prediction-empty">
            <div className="details-panel-heading">
              <MenuIcon name="predictions" />
              <h2>{t.noPrediction}</h2>
            </div>
            <p>{t.noPredictionCopy}</p>
          </section>
        )}

        {!isLoading && match && prediction && homeTeam && awayTeam && (
          <>
            <section className="prediction-scoreboard">
              <div className="prediction-team-card">
                <span>{t.homeTeam}</span>
                <strong>{getTeamDisplayName(match, 'home')}</strong>
                <small>{homeTeam.finalRating.toFixed(2)} FTSR</small>
              </div>
              <div className="prediction-main-call" style={{ background: getPredictionSummaryGradient(prediction) }}>
                <span className="prediction-main-title">{t.predictionSummary}</span>
                <div className="prediction-main-outcome">
                  <strong>{prediction.favoriteLabel}</strong>
                  <strong>{formatPercent(prediction.favoriteChance)} chance</strong>
                </div>
                <div className="prediction-main-shape">
                  <strong className={`shape-tone ${predictionShape?.shapeSide ?? 'balanced'}-${predictionShape?.shapeTone ?? 'balanced'}`}>{predictionShape?.shape}</strong>
                  <strong className={`risk-tone ${predictionShape?.riskTone ?? 'moderate'}`}>{predictionShape?.risk}</strong>
                </div>
                <p>{predictionShape?.copy}</p>
              </div>
              <div className="prediction-team-card right">
                <span>{t.awayTeam}</span>
                <strong>{getTeamDisplayName(match, 'away')}</strong>
                <small>{awayTeam.finalRating.toFixed(2)} FTSR</small>
              </div>
            </section>

            <PredictionProbabilityCard
              prediction={prediction}
              labels={{ home: t.homeWin, draw: t.draw, away: t.awayWin, odds: t.fairOdds }}
            />

            <section className="details-panel">
              <div className="details-panel-heading">
                <MenuIcon name="ratings" />
                <h2>{t.modelBreakdown}</h2>
              </div>
              <div className="prediction-breakdown-grid">
                <TooltipMetric label={t.ratingGap} value={formatSigned(prediction.ratingGap)} />
                <TooltipMetric label={t.homeAdvantageValue} value={appliesHomeAdvantage ? formatSigned(homeAdvantageValue) : t.homeAdvantageDisabled} />
                <TooltipMetric label={t.neutralRatingGap} value={formatSigned(neutralRatingGap)} />
                <TooltipMetric label={t.modelConfidence} value={formatPercent(prediction.confidence)} />
                <TooltipMetric label={t.strongestSignal} value={strongestSignal ? `${strongestSignal.label} (${strongestSignal.value.toFixed(2)})` : '-'} />
                <TooltipMetric label={t.ratingUpdated} value={combinedRatings ? formatDate(combinedRatings.runContext.calculatedAtUtc, '-') : '-'} />
              </div>
              <div className="prediction-layer-table">
                <span />
                <strong>{getTeamDisplayName(match, 'home')}</strong>
                <strong>{getTeamDisplayName(match, 'away')}</strong>
                <span>{t.ratingBaseElo}</span>
                <b>{homeTeam.baseElo.toFixed(2)}</b>
                <b>{awayTeam.baseElo.toFixed(2)}</b>
                <span>{t.ratingForm}</span>
                <b>{formatSigned(homeTeam.formAdjustment)}</b>
                <b>{formatSigned(awayTeam.formAdjustment)}</b>
                <span>{t.ratingPerformance}</span>
                <b>{formatSigned(homeTeam.performanceAdjustment)}</b>
                <b>{formatSigned(awayTeam.performanceAdjustment)}</b>
                <span>{t.ratingSquad}</span>
                <b>{formatSigned(homeTeam.squadQualityAdjustment)}</b>
                <b>{formatSigned(awayTeam.squadQualityAdjustment)}</b>
                <span>{t.ratingFinal}</span>
                <b>{homeTeam.finalRating.toFixed(2)}</b>
                <b>{awayTeam.finalRating.toFixed(2)}</b>
              </div>
            </section>

            <section className="details-panel">
              <div className="details-panel-heading">
                <MenuIcon name="predictions" />
                <h2>{t.scenarioBoard}</h2>
              </div>
              <div className="prediction-scenario-grid">
                {scenarios.map((scenario) => {
                  const scenarioPrediction = scenario.prediction
                  const dominant = [
                    ['1', scenarioPrediction?.homeWin ?? 0],
                    ['X', scenarioPrediction?.draw ?? 0],
                    ['2', scenarioPrediction?.awayWin ?? 0],
                  ].sort((left, right) => Number(right[1]) - Number(left[1]))[0][0]

                  return (
                    <div className={`prediction-scenario-card${scenario.isHistoric ? ' historic-split-card' : ''}`} key={scenario.title}>
                      <strong>{scenario.title}</strong>
                      <p>{scenario.ingredients}</p>
                      {'agreement' in scenario ? (
                        <>
                          <span>{scenario.agreement.label}</span>
                          <small>{scenario.summary}</small>
                          <div className="model-agreement-meter" tabIndex={0}>
                            <i>
                              <b style={{ width: `${scenario.agreement.total > 0 ? (scenario.agreement.support / scenario.agreement.total) * 100 : 0}%` }} />
                            </i>
                            <strong>{scenario.agreement.support}/{scenario.agreement.total}</strong>
                            <span className="model-agreement-tooltip">
                              {scenario.agreement.supporters.map((item) => (
                                <span key={item}>{item}</span>
                              ))}
                            </span>
                          </div>
                        </>
                      ) : scenarioPrediction ? (
                        <>
                          <span>{scenarioPrediction.favoriteLabel}</span>
                          <small>{scenario.summary}</small>
                          <div>
                            <PredictionMiniBar label="1" tone="home" value={scenarioPrediction.homeWin} isDominant={dominant === '1'} tooltipMatches={'historicBars' in scenario ? scenario.historicBars?.home : undefined} tooltipRows={'metricBars' in scenario ? scenario.metricBars?.home : undefined} />
                            <PredictionMiniBar label="X" tone="draw" value={scenarioPrediction.draw} isDominant={dominant === 'X'} tooltipMatches={'historicBars' in scenario ? scenario.historicBars?.draw : undefined} tooltipRows={'metricBars' in scenario ? scenario.metricBars?.draw : undefined} />
                            <PredictionMiniBar label="2" tone="away" value={scenarioPrediction.awayWin} isDominant={dominant === '2'} tooltipMatches={'historicBars' in scenario ? scenario.historicBars?.away : undefined} tooltipRows={'metricBars' in scenario ? scenario.metricBars?.away : undefined} />
                          </div>
                        </>
                      ) : (
                        <span className="historic-split-empty">{scenario.summary}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  )
}
