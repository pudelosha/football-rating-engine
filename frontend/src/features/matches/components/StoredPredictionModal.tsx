import { ModalShell } from '../../../shared/components/Modal/ModalShell'
import { MenuIcon } from '../../../shared/components/Icons'
import type { MatchPredictionSnapshot, MatchSummary } from '../../../shared/types'
import { formatOdds, formatPercent } from '../../../shared/utils'
import type { MatchesTranslation } from '../types'

export function StoredPredictionModal({
  match,
  snapshot,
  t,
  onClose,
}: {
  match: MatchSummary
  snapshot: MatchPredictionSnapshot
  t: MatchesTranslation
  onClose: () => void
}) {
  const prediction = {
    homeWin: snapshot.homeWinProbability,
    draw: snapshot.drawProbability,
    awayWin: snapshot.awayWinProbability,
    homeFairOdds: snapshot.homeFairOdds,
    drawFairOdds: snapshot.drawFairOdds,
    awayFairOdds: snapshot.awayFairOdds,
  }
  const actualOutcome = getActualOutcomeLabel(match, t)
  const predictedOutcomeKey = getOutcomeKey(snapshot.favoriteOutcome)
  const actualOutcomeKey = getActualOutcomeKey(match)
  const didPredictionMatch = actualOutcomeKey !== null && actualOutcomeKey === predictedOutcomeKey

  return (
    <ModalShell className="delete-modal stored-prediction-modal" onCancel={onClose}>
      <button className="modal-close-button" type="button" aria-label="Close" onClick={onClose}>x</button>
      <div className="delete-modal-icon">
        <MenuIcon name="predictions" />
      </div>
      <div className="delete-modal-copy">
        <p className="eyebrow">{t.storedPredictionEyebrow}</p>
      </div>

      <div className="stored-prediction-scroll">
        <section className="stored-prediction-overview">
          <div className="stored-prediction-team">
            <strong>{snapshot.homeTeamName}</strong>
          </div>
          <div className="stored-prediction-call">
            <small>{t.predictedOutcome}</small>
            <strong className={`stored-prediction-tone ${predictedOutcomeKey}`}>
              {formatPercent(snapshot.favoriteProbability)} {getOutcomeLabel(snapshot.favoriteOutcome, t).toLowerCase()} {t.chance.toLowerCase()}
            </strong>
          </div>
          <div className="stored-prediction-team right">
            <strong>{snapshot.awayTeamName}</strong>
          </div>
          <div className="stored-prediction-score">
            <strong>{match.homeScore ?? '-'}</strong>
          </div>
          <div className="stored-prediction-call">
            <small>{t.matchShape}</small>
            <strong className={didPredictionMatch ? 'stored-outcome-match' : 'stored-outcome-miss'}>{actualOutcome}</strong>
          </div>
          <div className="stored-prediction-score right">
            <strong>{match.awayScore ?? '-'}</strong>
          </div>
        </section>

        <section className="prediction-probability-stack stored-prediction-stack">
          <section className="prediction-probability-card stored-prediction-bar">
            <div className="prediction-probability-header">
              <PredictionSplitMetric label={t.homeWin} chance={prediction.homeWin} style={{ width: `${prediction.homeWin * 100}%` }} />
              <PredictionSplitMetric label={t.draw} chance={prediction.draw} style={{ width: `${prediction.draw * 100}%` }} />
              <PredictionSplitMetric label={t.awayWin} chance={prediction.awayWin} style={{ width: `${prediction.awayWin * 100}%` }} />
            </div>
          </section>
          <section className="prediction-fair-odds-card">
            <PredictionOddsMetric label={t.homeWin} odds={prediction.homeFairOdds} oddsLabel={t.fairOdds} />
            <PredictionOddsMetric label={t.draw} odds={prediction.drawFairOdds} oddsLabel={t.fairOdds} />
            <PredictionOddsMetric label={t.awayWin} odds={prediction.awayFairOdds} oddsLabel={t.fairOdds} />
          </section>
        </section>

      </div>
    </ModalShell>
  )
}

function PredictionSplitMetric({
  label,
  chance,
  style,
}: {
  label: string
  chance: number
  style?: { width: string }
}) {
  return (
    <span style={style}>
      <small>{label}</small>
      <strong>{formatPercent(chance)}</strong>
    </span>
  )
}

function PredictionOddsMetric({ label, odds, oddsLabel }: { label: string; odds: number; oddsLabel: string }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{formatOdds(odds)}</strong>
      <em>{oddsLabel}</em>
    </span>
  )
}

function getOutcomeLabel(outcome: string, t: MatchesTranslation) {
  if (outcome === 'HomeWin') {
    return t.homeWin
  }

  if (outcome === 'AwayWin') {
    return t.awayWin
  }

  return t.draw
}

function getOutcomeKey(outcome: string) {
  if (outcome === 'HomeWin') {
    return 'home'
  }

  if (outcome === 'AwayWin') {
    return 'away'
  }

  return 'draw'
}

function getActualOutcomeKey(match: MatchSummary) {
  if (match.homeScore === undefined || match.homeScore === null || match.awayScore === undefined || match.awayScore === null) {
    return null
  }

  if (match.homeScore > match.awayScore) {
    return 'home'
  }

  if (match.awayScore > match.homeScore) {
    return 'away'
  }

  return 'draw'
}

function getActualOutcomeLabel(match: MatchSummary, t: MatchesTranslation) {
  if (match.homeScore === undefined || match.homeScore === null || match.awayScore === undefined || match.awayScore === null) {
    return '-'
  }

  if (match.homeScore > match.awayScore) {
    return t.homeWin
  }

  if (match.awayScore > match.homeScore) {
    return t.awayWin
  }

  return t.draw
}
