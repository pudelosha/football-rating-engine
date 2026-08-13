import { useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import { BettingChartsTile } from '../components/BettingChartsTile'
import { BettingMatchListTile } from '../components/BettingMatchListTile'
import { BettingTournamentResultsTile } from '../components/BettingTournamentResultsTile'
import { BettingTournamentToolbar } from '../components/BettingTournamentToolbar'
import { MatchInsightsTile } from '../components/MatchInsightsTile'
import { MyBetsTile } from '../components/MyBetsTile'
import { PointsGrowthChartTile } from '../components/PointsGrowthChartTile'
import { SocialBettingMatchSummaryModal } from '../components/SocialBettingMatchSummaryModal'
import { SocialBettingPickModal } from '../components/SocialBettingPickModal'
import {
  bettingStandings,
  bettingTournamentOptions,
  matchInsights,
  myFinishedStageBets,
  myOutstandingStageBets,
  myPlacedStageBets,
  pointsGrowthSeries,
} from '../model/socialBettingModel'
import {
  confirmSocialBettingParticipation,
  fetchSocialBettingMatchSummary,
  fetchSocialBettingOutstandingBets,
  fetchSocialBettingResults,
  fetchSocialBettingTournaments,
  upsertSocialBettingPick,
} from '../services/socialBettingService'
import type {
  BettingMatchPick,
  BettingPointsGrowthSeries,
  BettingStandingRow,
  SocialBettingMatchSummary,
  SocialBettingOutstandingBet,
  SocialBettingProps,
} from '../types'

type SocialBettingSection = 'results' | 'insights' | 'my-bets'

export function SocialBettingPage({ user, onCreateTournament, onEditTournament, onToast }: SocialBettingProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(0)
  const [activeSection, setActiveSection] = useState<SocialBettingSection>('results')
  const [tournaments, setTournaments] = useState(bettingTournamentOptions)
  const [resultsRows, setResultsRows] = useState<BettingStandingRow[]>(bettingStandings)
  const [resultsGrowth, setResultsGrowth] = useState<BettingPointsGrowthSeries[]>(pointsGrowthSeries)
  const [resultsOutstandingBets, setResultsOutstandingBets] = useState<SocialBettingOutstandingBet[]>([])
  const [selectedPickMatch, setSelectedPickMatch] = useState<BettingMatchPick | null>(null)
  const [summaryMatch, setSummaryMatch] = useState<BettingMatchPick | null>(null)
  const [matchSummary, setMatchSummary] = useState<SocialBettingMatchSummary | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [isResultsLoading, setIsResultsLoading] = useState(false)
  const [isPickSaving, setIsPickSaving] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const selectableTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.participantStatus !== 'Pending'),
    [tournaments],
  )
  const selectedTournament = useMemo(
    () => selectableTournaments.find((tournament) => tournament.id === selectedTournamentId),
    [selectedTournamentId, selectableTournaments],
  )
  const insightStages = useMemo(
    () => Array.from(new Set(matchInsights.map((match) => match.stage))),
    [],
  )
  const hasSelectedTournament = Boolean(selectedTournament)
  const pendingTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.participantStatus === 'Pending'),
    [tournaments],
  )

  useEffect(() => {
    let isMounted = true

    async function loadTournaments() {
      setIsLoading(true)
      const result = await fetchSocialBettingTournaments(user.token)
      if (!isMounted) {
        return
      }

      if (result.ok && result.data) {
        setTournaments(result.data)
      } else {
        onToast(result.message || 'Could not load betting tournaments.', 'error')
      }
      setIsLoading(false)
    }

    loadTournaments()

    return () => {
      isMounted = false
    }
  }, [onToast, user.token])

  useEffect(() => {
    let isMounted = true

    async function loadResults() {
      if (!selectedTournament) {
        return
      }

      setIsResultsLoading(true)
      const [resultsResult, outstandingResult] = await Promise.all([
        fetchSocialBettingResults(user.token, selectedTournament.id),
        fetchSocialBettingOutstandingBets(user.token, selectedTournament.id, 5),
      ])
      if (!isMounted) {
        return
      }

      if (resultsResult.ok && resultsResult.data) {
        setResultsRows(resultsResult.data.standings)
        setResultsGrowth(resultsResult.data.pointsGrowth)
      } else {
        onToast(resultsResult.message || 'Could not load tournament results.', 'error')
        setResultsRows([])
        setResultsGrowth([])
      }
      if (outstandingResult.ok && outstandingResult.data) {
        setResultsOutstandingBets(outstandingResult.data)
      } else {
        onToast(outstandingResult.message || 'Could not load outstanding bets.', 'error')
        setResultsOutstandingBets([])
      }
      setIsResultsLoading(false)
    }

    loadResults()

    return () => {
      isMounted = false
    }
  }, [onToast, selectedTournament, user.token])

  async function confirmParticipation(tournamentId: number) {
    setIsLoading(true)
    const result = await confirmSocialBettingParticipation(user.token, tournamentId)

    if (!result.ok || !result.data) {
      onToast(result.message || 'Could not confirm participation.', 'error')
      setIsLoading(false)
      return
    }

    setTournaments((current) => current.map((tournament) =>
      tournament.id === tournamentId ? result.data! : tournament))
    setSelectedTournamentId(result.data.id)
    onToast('Tournament participation confirmed.', 'success')
    setIsLoading(false)
  }

  async function openMatchSummary(match: BettingMatchPick) {
    if (!selectedTournament) {
      return
    }

    setSummaryMatch(match)
    setMatchSummary(undefined)
    setIsSummaryLoading(true)
    const result = await fetchSocialBettingMatchSummary(user.token, selectedTournament.id, match.id)
    if (result.ok && result.data) {
      setMatchSummary(result.data)
    } else {
      onToast(result.message || 'Could not load match summary.', 'error')
      setSummaryMatch(null)
    }
    setIsSummaryLoading(false)
  }

  async function placePick(homeScore: number, awayScore: number) {
    if (!selectedTournament || !selectedPickMatch) {
      return
    }

    setIsPickSaving(true)
    const result = await upsertSocialBettingPick(user.token, selectedTournament.id, selectedPickMatch.id, {
      homeScorePrediction: homeScore,
      awayScorePrediction: awayScore,
    })

    if (!result.ok) {
      onToast(result.message || 'Could not place bet.', 'error')
      setIsPickSaving(false)
      return
    }

    const [resultsResult, outstandingResult] = await Promise.all([
      fetchSocialBettingResults(user.token, selectedTournament.id),
      fetchSocialBettingOutstandingBets(user.token, selectedTournament.id, 5),
    ])

    if (resultsResult.ok && resultsResult.data) {
      setResultsRows(resultsResult.data.standings)
      setResultsGrowth(resultsResult.data.pointsGrowth)
    }
    if (outstandingResult.ok && outstandingResult.data) {
      setResultsOutstandingBets(outstandingResult.data)
    }

    onToast('Bet placed.', 'success')
    setSelectedPickMatch(null)
    setIsPickSaving(false)
  }

  return (
    <section className="admin-dashboard social-betting-page">
      {isLoading && <FullPageProcessingOverlay label="Loading betting tournaments." />}
      <div className="admin-dashboard-content social-betting-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">Betting</p>
          <h1>Social Betting</h1>
          <p>
            Join private prediction tournaments, place match scores before kickoff, and compare points with friends
            after each round.
          </p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" className="positive-action-button" onClick={onCreateTournament}>
            Create new tournament
          </button>
        </div>

        {pendingTournaments.length > 0 && (
          <section className="details-panel social-betting-confirmation-panel">
            <div className="details-panel-heading">
              <MenuIcon name="betting" />
              <h2>Confirm participation</h2>
            </div>
            <div className="social-betting-confirmation-list">
              {pendingTournaments.map((tournament) => (
                <div className="social-betting-confirmation-row" key={tournament.id}>
                  <span>
                    <strong>{tournament.name}</strong>
                    <small>{tournament.linkedTournament} {tournament.season}</small>
                  </span>
                  <button type="button" onClick={() => confirmParticipation(tournament.id)}>
                    Confirm
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <BettingTournamentToolbar
          tournaments={selectableTournaments}
          selectedTournamentId={selectedTournamentId}
          selectedTournament={selectedTournament}
          playerName={user.displayName || user.email}
          onTournamentChange={setSelectedTournamentId}
          onEdit={() => selectedTournament && onEditTournament(selectedTournament.id)}
        />

        <div className="social-betting-section-tabs" aria-label="Social betting section">
          <button
            className={activeSection === 'results' ? 'active' : ''}
            disabled={!hasSelectedTournament}
            type="button"
            onClick={() => setActiveSection('results')}
          >
            Results
          </button>
          <button
            className={activeSection === 'insights' ? 'active' : ''}
            disabled={!hasSelectedTournament}
            type="button"
            onClick={() => setActiveSection('insights')}
          >
            Match Insights
          </button>
          <button
            className={activeSection === 'my-bets' ? 'active' : ''}
            disabled={!hasSelectedTournament}
            type="button"
            onClick={() => setActiveSection('my-bets')}
          >
            My bets
          </button>
        </div>

        {!hasSelectedTournament ? (
          <section className="details-panel social-betting-empty-tournament">
            <div className="details-panel-heading">
              <MenuIcon name="betting" />
              <h2>Select tournament</h2>
            </div>
            <p>
              Choose a tournament from the dropdown to open results, match insights, and your bets.
              You can also create your own tournament and invite friends to join the prediction table.
            </p>
          </section>
        ) : (
          <div className="social-betting-grid">
            {activeSection === 'results' && (
            <>
              {isResultsLoading && <FullPageProcessingOverlay label="Loading tournament results." />}
              <BettingTournamentResultsTile rows={resultsRows} />
              <BettingMatchListTile
                title="Outstanding bets"
                icon="matches"
                items={resultsOutstandingBets}
                actionLabel="Place bet"
                compact
                onAction={setSelectedPickMatch}
                onPreview={openMatchSummary}
              />
              <BettingChartsTile rows={resultsRows} type="points" />
              <BettingChartsTile rows={resultsRows} type="accuracy" />
              <PointsGrowthChartTile series={resultsGrowth} />
            </>
            )}

            {activeSection === 'insights' && (
              <MatchInsightsTile matches={matchInsights} stages={insightStages} />
            )}

            {activeSection === 'my-bets' && (
              <MyBetsTile
                finished={myFinishedStageBets}
                outstanding={myOutstandingStageBets}
                placed={myPlacedStageBets}
                stages={insightStages}
              />
            )}
          </div>
        )}
        {selectedPickMatch && (
          <SocialBettingPickModal
            isSaving={isPickSaving}
            match={selectedPickMatch}
            onCancel={() => !isPickSaving && setSelectedPickMatch(null)}
            onConfirm={placePick}
          />
        )}
        {summaryMatch && (
          <SocialBettingMatchSummaryModal
            isLoading={isSummaryLoading}
            summary={matchSummary}
            onCancel={() => {
              setSummaryMatch(null)
              setMatchSummary(undefined)
            }}
          />
        )}
      </div>
    </section>
  )
}
