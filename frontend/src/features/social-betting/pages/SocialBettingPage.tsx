import { useMemo, useState } from 'react'
import { BettingMatchListTile } from '../components/BettingMatchListTile'
import { BettingTournamentResultsTile } from '../components/BettingTournamentResultsTile'
import { BettingTournamentToolbar } from '../components/BettingTournamentToolbar'
import { MatchInsightsTile } from '../components/MatchInsightsTile'
import {
  bettingStandings,
  bettingTournamentOptions,
  matchInsights,
  myLatestResults,
  myUpcomingBets,
  outstandingBets,
} from '../model/socialBettingModel'
import type { SocialBettingProps } from '../types'

export function SocialBettingPage({ user }: SocialBettingProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(bettingTournamentOptions[0]?.id ?? 0)
  const selectedTournament = useMemo(
    () => bettingTournamentOptions.find((tournament) => tournament.id === selectedTournamentId) ?? bettingTournamentOptions[0],
    [selectedTournamentId],
  )
  const insightStages = useMemo(
    () => ['All stages', ...Array.from(new Set(matchInsights.map((match) => match.stage)))],
    [],
  )

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

        <BettingTournamentToolbar
          tournaments={bettingTournamentOptions}
          selectedTournamentId={selectedTournamentId}
          selectedTournament={selectedTournament}
          playerName={user.displayName || user.email}
          onTournamentChange={setSelectedTournamentId}
          onCreate={() => undefined}
        />

        <div className="social-betting-grid">
          <BettingTournamentResultsTile rows={bettingStandings} />
          <BettingMatchListTile
            title="Outstanding bets"
            icon="matches"
            items={outstandingBets}
            actionLabel="Place bet"
            compact
          />
          <BettingMatchListTile
            title="My bets"
            icon="betting"
            items={myUpcomingBets}
            actionLabel="Edit"
          />
          <BettingMatchListTile
            title="My results"
            icon="predictions"
            items={myLatestResults}
            variant="results"
          />
          <MatchInsightsTile matches={matchInsights} stages={insightStages} />
        </div>
      </div>
    </section>
  )
}
