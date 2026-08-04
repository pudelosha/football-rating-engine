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
  const [selectedStage, setSelectedStage] = useState(stages[0] ?? 'Round 1')
  const [openMatchId, setOpenMatchId] = useState<number | null>(null)
  const selectedStageIndex = stages.findIndex((stage) => stage === selectedStage)
  const filteredMatches = useMemo(
    () => matches.filter((match) => match.stage === selectedStage),
    [matches, selectedStage],
  )

  function handleStageChange(stage: string) {
    setSelectedStage(stage)
    setOpenMatchId(null)
  }

  function goToPreviousStage() {
    if (selectedStageIndex > 0) {
      handleStageChange(stages[selectedStageIndex - 1])
    }
  }

  function goToNextStage() {
    if (selectedStageIndex >= 0 && selectedStageIndex < stages.length - 1) {
      handleStageChange(stages[selectedStageIndex + 1])
    }
  }

  return (
    <section className="details-panel social-betting-tile social-betting-insights-tile">
      <div className="details-panel-heading spread social-betting-insights-heading">
        <div>
          <MenuIcon name="matches" />
          <h2>Match Insights</h2>
        </div>
        <div className="round-filter-stepper social-betting-stage-stepper">
          <label aria-label="Stage">
            <select value={selectedStage} onChange={(event) => handleStageChange(event.target.value)}>
              {stages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="round-step-button"
            aria-label="Previous stage"
            disabled={selectedStageIndex <= 0}
            onClick={goToPreviousStage}
          >
            <span>-</span>
          </button>
          <button
            type="button"
            className="round-step-button"
            aria-label="Next stage"
            disabled={selectedStageIndex < 0 || selectedStageIndex >= stages.length - 1}
            onClick={goToNextStage}
          >
            <span>+</span>
          </button>
        </div>
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
