import { useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingMatchPick } from '../types'

function splitKickoff(kickoff: string) {
  const [date = kickoff, time = ''] = kickoff.split(',').map((part) => part.trim())
  return { date, time }
}

function splitPrediction(prediction?: string) {
  const [home = '-', away = '-'] = (prediction ?? '-:-').split(':').map((part) => part.trim())
  return { home, away }
}

function filterByStage(items: BettingMatchPick[], stage: string) {
  return items.filter((item) => item.stage === stage)
}

function MyBetList({
  actionLabel,
  items,
  title,
  variant,
}: {
  actionLabel?: string
  items: BettingMatchPick[]
  title: string
  variant: 'pending' | 'placed' | 'finished'
}) {
  return (
    <section className={`social-betting-my-bets-subtile ${variant}`}>
      <h3>{title}</h3>
      <div className="social-betting-match-list">
        {items.map((item) => {
          const kickoff = splitKickoff(item.kickoff)
          const prediction = splitPrediction(item.prediction)
          const outcomeText = item.prediction
            ? item.result === 'won' ? 'Matched' : 'Not matched / failed'
            : 'No bet was placed'

          return (
            <article className={`social-betting-my-bet-row ${variant}`} key={item.id}>
              <div className="social-betting-compact-teams">
                <strong>{item.homeTeam}</strong>
                <strong>{item.awayTeam}</strong>
              </div>
              {(variant === 'placed' || variant === 'finished') && (
                <div className={`social-betting-compact-score ${variant === 'finished' ? item.result ?? 'pending' : ''}`}>
                  <strong>{prediction.home}</strong>
                  <strong>{prediction.away}</strong>
                  {variant === 'finished' && (
                    <span className={`social-betting-score-tooltip ${item.result ?? 'pending'}`}>
                      <b>Real result: {item.score ?? '-:-'}</b>
                      <small>{outcomeText}</small>
                      <small>Points: {(item.points ?? 0).toFixed(2)}</small>
                    </span>
                  )}
                </div>
              )}
              {variant === 'pending' && <div className="social-betting-empty-score" aria-hidden="true" />}
              <time className="social-betting-compact-time">
                <span>{kickoff.date}</span>
                <span>{kickoff.time}</span>
              </time>
              <button className="social-betting-icon-button" type="button" aria-label="Preview match">
                <MenuIcon name="search" />
              </button>
              {variant !== 'finished' && (
                <div className="social-betting-pick">
                  <button type="button" aria-label={actionLabel}>
                    <MenuIcon name={variant === 'pending' ? 'plus' : 'edit'} />
                  </button>
                </div>
              )}
            </article>
          )
        })}
        {items.length === 0 && <p className="social-betting-empty-list">No matches in this stage.</p>}
      </div>
    </section>
  )
}

export function MyBetsTile({
  finished,
  outstanding,
  placed,
  stages,
}: {
  finished: BettingMatchPick[]
  outstanding: BettingMatchPick[]
  placed: BettingMatchPick[]
  stages: string[]
}) {
  const [selectedStage, setSelectedStage] = useState(stages[0] ?? 'Round 1')
  const selectedStageIndex = stages.findIndex((stage) => stage === selectedStage)
  const filteredOutstanding = useMemo(() => filterByStage(outstanding, selectedStage), [outstanding, selectedStage])
  const filteredPlaced = useMemo(() => filterByStage(placed, selectedStage), [placed, selectedStage])
  const filteredFinished = useMemo(() => filterByStage(finished, selectedStage), [finished, selectedStage])

  function handleStageChange(stage: string) {
    setSelectedStage(stage)
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
    <section className="details-panel social-betting-tile social-betting-my-bets-tile">
      <div className="details-panel-heading spread social-betting-insights-heading">
        <div>
          <MenuIcon name="betting" />
          <h2>My bets</h2>
        </div>
        <div className="round-filter-stepper social-betting-stage-stepper">
          <label aria-label="Round">
            <select value={selectedStage} onChange={(event) => handleStageChange(event.target.value)}>
              {stages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="round-step-button"
            aria-label="Previous round"
            disabled={selectedStageIndex <= 0}
            onClick={goToPreviousStage}
          >
            <span>-</span>
          </button>
          <button
            type="button"
            className="round-step-button"
            aria-label="Next round"
            disabled={selectedStageIndex < 0 || selectedStageIndex >= stages.length - 1}
            onClick={goToNextStage}
          >
            <span>+</span>
          </button>
        </div>
      </div>

      <div className="social-betting-my-bets-grid">
        <MyBetList actionLabel="Place bet" items={filteredOutstanding} title="Not placed" variant="pending" />
        <MyBetList actionLabel="Edit" items={filteredPlaced} title="Placed bets" variant="placed" />
        <MyBetList items={filteredFinished} title="Finished" variant="finished" />
      </div>
    </section>
  )
}
