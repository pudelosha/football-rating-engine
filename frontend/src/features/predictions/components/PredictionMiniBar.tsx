import type { HistoricSplitMatch, MiniBarTooltipRow } from '../../../shared/types'
import { formatDate, formatPercent } from '../../../shared/utils'

export function PredictionMiniBar({
  label,
  tone,
  value,
  isDominant = false,
  tooltipMatches,
  tooltipRows,
}: {
  label: string
  tone: 'home' | 'draw' | 'away'
  value: number
  isDominant?: boolean
  tooltipMatches?: HistoricSplitMatch[]
  tooltipRows?: MiniBarTooltipRow[]
}) {
  const hasTooltip = Boolean(tooltipMatches?.length || tooltipRows?.length)

  return (
    <span className={`prediction-mini-bar ${tone} ${isDominant ? 'dominant' : ''}${hasTooltip ? ' has-tooltip' : ''}`} tabIndex={hasTooltip ? 0 : undefined}>
      <small>{label}</small>
      <i><b style={{ width: `${Math.round(value * 100)}%` }} /></i>
      <em>{formatPercent(value)}</em>
      {hasTooltip && (
        <span className="historic-bar-tooltip">
          {tooltipRows?.map((item) => (
            <span className="metric-tooltip-row" key={`${item.label}-${item.value}`}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </span>
          ))}
          {tooltipMatches?.slice(0, 8).map((item, index) => (
            <span key={`${item.date}-${item.homeTeamName}-${item.awayTeamName}-${index}`}>
              <small>{formatDate(item.date, '-')}</small>
              <strong>
                {item.homeTeamName}
                {' '}
                {item.homeScore ?? '-'}:{item.awayScore ?? '-'}
                {' '}
                {item.awayTeamName}
              </strong>
            </span>
          ))}
          {tooltipMatches && tooltipMatches.length > 8 && (
            <em>+{tooltipMatches.length - 8}</em>
          )}
        </span>
      )}
    </span>
  )
}
