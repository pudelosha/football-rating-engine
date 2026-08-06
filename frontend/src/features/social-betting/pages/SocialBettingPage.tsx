import { useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
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
import type { SocialBettingProps } from '../types'

type SocialBettingSection = 'results' | 'insights' | 'my-bets'

export function SocialBettingPage({ user }: SocialBettingProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(0)
  const [activeSection, setActiveSection] = useState<SocialBettingSection>('results')
  const selectedTournament = useMemo(
    () => bettingTournamentOptions.find((tournament) => tournament.id === selectedTournamentId),
    [selectedTournamentId],
  )
  const insightStages = useMemo(
    () => Array.from(new Set(matchInsights.map((match) => match.stage))),
    [],
  )
  const hasSelectedTournament = Boolean(selectedTournament)

  return (
    <section className="admin-dashboard social-betting-page">
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
          <button type="button" className="positive-action-button" onClick={() => undefined}>
            Create new tournament
          </button>
        </div>

        <BettingTournamentToolbar
          tournaments={bettingTournamentOptions}
          selectedTournamentId={selectedTournamentId}
          selectedTournament={selectedTournament}
          playerName={user.displayName || user.email}
          onTournamentChange={setSelectedTournamentId}
          onEdit={() => undefined}
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
