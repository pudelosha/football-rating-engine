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
import {
  bettingStandings,
  bettingTournamentOptions,
  matchInsights,
  myFinishedStageBets,
  myOutstandingStageBets,
  myPlacedStageBets,
  outstandingBets,
  pointsGrowthSeries,
} from '../model/socialBettingModel'
import { fetchSocialBettingTournaments } from '../services/socialBettingService'
import type { SocialBettingProps } from '../types'

type SocialBettingSection = 'results' | 'insights' | 'my-bets'

export function SocialBettingPage({ user, onCreateTournament, onEditTournament, onToast }: SocialBettingProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(0)
  const [activeSection, setActiveSection] = useState<SocialBettingSection>('results')
  const [tournaments, setTournaments] = useState(bettingTournamentOptions)
  const [isLoading, setIsLoading] = useState(true)
  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId),
    [selectedTournamentId, tournaments],
  )
  const insightStages = useMemo(
    () => Array.from(new Set(matchInsights.map((match) => match.stage))),
    [],
  )
  const hasSelectedTournament = Boolean(selectedTournament)

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

        <BettingTournamentToolbar
          tournaments={tournaments}
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
              <BettingTournamentResultsTile rows={bettingStandings} />
              <BettingMatchListTile
                title="Outstanding bets"
                icon="matches"
                items={outstandingBets}
                actionLabel="Place bet"
                compact
              />
              <BettingChartsTile rows={bettingStandings} type="points" />
              <BettingChartsTile rows={bettingStandings} type="accuracy" />
              <PointsGrowthChartTile series={pointsGrowthSeries} />
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
      </div>
    </section>
  )
}
