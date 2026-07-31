import type { MatchPrediction } from '../../../shared/types'
import { formatOdds, formatPercent } from '../../../shared/utils'
import { getPredictionSurfaceGradient } from '../model/predictionsModel'

export function PredictionCell({ value, odds }: { value: number; odds: number }) {
  return (
    <span className="prediction-cell">
      <strong>{formatPercent(value)}</strong>
      <small>{formatOdds(odds)}</small>
    </span>
  )
}

export function PredictionProbabilityCard({
  prediction,
  labels,
}: {
  prediction: MatchPrediction
  labels: { home: string; draw: string; away: string; odds: string }
}) {
  const gradient = getPredictionSurfaceGradient(prediction)

  return (
    <div className="prediction-probability-stack">
      <section className="prediction-probability-card" style={{ background: gradient }}>
        <div className="prediction-probability-header">
          <PredictionProbabilityMetric label={labels.home} chance={prediction.homeWin} style={{ width: `${prediction.homeWin * 100}%` }} />
          <PredictionProbabilityMetric label={labels.draw} chance={prediction.draw} style={{ width: `${prediction.draw * 100}%` }} />
          <PredictionProbabilityMetric label={labels.away} chance={prediction.awayWin} style={{ width: `${prediction.awayWin * 100}%` }} />
        </div>
      </section>
      <section className="prediction-fair-odds-card">
        <PredictionFairOddsMetric label={labels.home} odds={prediction.homeFairOdds} oddsLabel={labels.odds} />
        <PredictionFairOddsMetric label={labels.draw} odds={prediction.drawFairOdds} oddsLabel={labels.odds} />
        <PredictionFairOddsMetric label={labels.away} odds={prediction.awayFairOdds} oddsLabel={labels.odds} />
      </section>
    </div>
  )
}

function PredictionProbabilityMetric({
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

function PredictionFairOddsMetric({
  label,
  odds,
  oddsLabel,
}: {
  label: string
  odds: number
  oddsLabel: string
}) {
  return (
    <span>
      <small>{label}</small>
      <strong>{formatOdds(odds)}</strong>
      <em>{oddsLabel}</em>
    </span>
  )
}
