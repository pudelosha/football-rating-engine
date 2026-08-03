import { useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingMatchInsight } from '../types'

function statusClass(status: BettingMatchInsight['status']) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function canRevealDetails(status: BettingMatchInsight['status']) {
  return status === 'Completed' || status === 'In progress'
}

export function MatchInsightsTile({ matches, stages }: { matches: BettingMatchInsight[]; stages: string[] }) {
  const [selectedStage, setSelectedStage] = useState(stages[0] ?? 'All stages')
  const [openMatchId, setOpenMatchId] = useState<number | null>(null)
  const filteredMatches = useMemo(
    () => matches.filter((match) => selectedStage === 'All stages' || match.stage === selectedStage),
    [matches, selectedStage],
  )

  function handleStageChange(stage: string) {
    setSelectedStage(stage)
    setOpenMatchId(null)
  }

  return (
    <section className="details-panel social-betting-tile social-betting-insights-tile">
      <div className="details-panel-heading spread social-betting-insights-heading">
        <div>
          <MenuIcon name="matches" />
          <h2>Match Insights</h2>
        </div>
        <label aria-label="Stage">
          <select value={selectedStage} onChange={(event) => handleStageChange(event.target.value)}>
            {stages.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="social-betting-accordion">
        {filteredMatches.map((match) => {
          const isOpen = openMatchId === match.id
          const canOpen = canRevealDetails(match.status)

          return (
            <article className={`social-betting-insight-row ${isOpen ? 'open' : ''}`} key={match.id}>
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => canOpen && setOpenMatchId(isOpen ? null : match.id)}
              >
                <span>
                  <strong>{match.homeTeam} {match.score ?? '-:-'} {match.awayTeam}</strong>
                  <small>{match.summary}</small>
                  <small>{match.kickoff}</small>
                </span>
                <b className={`social-betting-status ${statusClass(match.status)}`}>{match.status}</b>
                {canOpen ? <i /> : <em />}
              </button>

              {isOpen && (
                <div className="social-betting-insight-details">
                  <div className="social-betting-insight-header">
                    <span>Player</span>
                    <span>Bet</span>
                    <span>1</span>
                    <span>X</span>
                    <span>2</span>
                    <span>Outcome</span>
                    <span>Pts</span>
                  </div>
                  {match.bets.map((bet) => (
                    <div className="social-betting-insight-bet" key={`${match.id}-${bet.playerName}`}>
                      <strong>{bet.playerName}</strong>
                      <span>{bet.prediction}</span>
                      <b className={bet.homeWin ? 'ok' : ''}>{bet.homeWin ? '+' : ''}</b>
                      <b className={bet.draw ? 'ok' : ''}>{bet.draw ? '+' : ''}</b>
                      <b className={bet.awayWin ? 'failed' : ''}>{bet.awayWin ? 'x' : ''}</b>
                      <b className={bet.outcomeMatched ? 'ok' : 'failed'}>{bet.outcomeMatched ? '+' : 'x'}</b>
                      <span>{bet.points.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
