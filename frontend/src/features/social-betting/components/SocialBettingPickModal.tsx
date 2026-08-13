import { useState } from 'react'
import Picker from 'react-mobile-picker'
import { MenuIcon } from '../../../shared/components/Icons'
import { ModalShell } from '../../../shared/components/Modal/ModalShell'
import { formatPercent } from '../../../shared/utils'
import type { BettingMatchPick } from '../types'

const scoreOptions = Array.from({ length: 11 }, (_, index) => index.toString())

function formatOdds(value?: number) {
  return value ? value.toFixed(2) : '-'
}

function ScoreWheel({
  name,
  value,
  onChange,
}: {
  name: 'homeScore' | 'awayScore'
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Picker
      className="social-betting-score-wheel"
      height={164}
      itemHeight={40}
      value={{ [name]: value }}
      wheelMode="natural"
      onChange={(nextValue) => onChange(nextValue[name])}
    >
      <Picker.Column name={name}>
        {scoreOptions.map((option) => (
          <Picker.Item key={option} value={option}>
            {({ selected }) => (
              <span className={selected ? 'selected' : ''}>
                {option}
              </span>
            )}
          </Picker.Item>
        ))}
      </Picker.Column>
    </Picker>
  )
}

export function SocialBettingPickModal({
  isSaving,
  match,
  onCancel,
  onConfirm,
}: {
  isSaving: boolean
  match: BettingMatchPick
  onCancel: () => void
  onConfirm: (homeScore: number, awayScore: number) => void
}) {
  const [homeScore, setHomeScore] = useState('0')
  const [awayScore, setAwayScore] = useState('0')

  function submit() {
    const home = Number(homeScore)
    const away = Number(awayScore)
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      return
    }

    onConfirm(home, away)
  }

  return (
    <ModalShell className="delete-modal social-betting-pick-modal" isLocked={isSaving} onCancel={onCancel}>
      <button className="modal-close-button" type="button" aria-label="Close" onClick={onCancel}>x</button>
      <div className="delete-modal-icon">
        <MenuIcon name="betting" />
      </div>
      <div className="delete-modal-copy">
        <p className="eyebrow">Place bet</p>
      </div>

      <div className="stored-prediction-scroll">
        <section className="stored-prediction-overview social-betting-pick-overview">
          <div className="stored-prediction-team">
            <strong>{match.homeTeam}</strong>
          </div>
          <div />
          <div className="stored-prediction-team right">
            <strong>{match.awayTeam}</strong>
          </div>
          <div className="stored-prediction-score social-betting-pick-score-input">
            <ScoreWheel name="homeScore" value={homeScore} onChange={setHomeScore} />
          </div>
          <div className="stored-prediction-call">
            <small>Predict the 90-min result</small>
          </div>
          <div className="stored-prediction-score right social-betting-pick-score-input">
            <ScoreWheel name="awayScore" value={awayScore} onChange={setAwayScore} />
          </div>
        </section>

        <section className="prediction-probability-stack stored-prediction-stack">
          <section className="prediction-probability-card stored-prediction-bar">
            <p className="social-betting-prediction-note">Application predictions</p>
            <div className="prediction-probability-header">
              <span style={{ width: `${(match.homeWinProbability ?? 0) * 100}%` }}>
                <small>Home win</small>
                <strong>{formatPercent(match.homeWinProbability ?? 0)}</strong>
              </span>
              <span style={{ width: `${(match.drawProbability ?? 0) * 100}%` }}>
                <small>Draw</small>
                <strong>{formatPercent(match.drawProbability ?? 0)}</strong>
              </span>
              <span style={{ width: `${(match.awayWinProbability ?? 0) * 100}%` }}>
                <small>Away win</small>
                <strong>{formatPercent(match.awayWinProbability ?? 0)}</strong>
              </span>
            </div>
          </section>

          <section className="prediction-fair-odds-card">
            <span>
              <small>Home win</small>
              <strong>{formatOdds(match.homeWinOdds)}</strong>
            </span>
            <span>
              <small>Draw</small>
              <strong>{formatOdds(match.drawOdds)}</strong>
            </span>
            <span>
              <small>Away win</small>
              <strong>{formatOdds(match.awayWinOdds)}</strong>
            </span>
          </section>
        </section>
      </div>

      <div className="delete-modal-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" disabled={isSaving} onClick={submit}>
          {isSaving ? 'Saving...' : 'Place bet'}
        </button>
      </div>
    </ModalShell>
  )
}
