import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingStandingRow } from '../types'

export function BettingChartsTile({ rows, type }: { rows: BettingStandingRow[]; type: 'points' | 'accuracy' }) {
  const title = type === 'points' ? 'Points split' : 'Betting accuracy'
  const sortedRows = [...rows].sort((left, right) => (
    type === 'points'
      ? right.result - left.result
      : right.accuracy - left.accuracy
  ))

  return (
    <section className="details-panel social-betting-tile social-betting-chart-tile">
      <div className="details-panel-heading">
        <MenuIcon name={type === 'points' ? 'ratings' : 'predictions'} />
        <h2>{title}</h2>
      </div>

      <div className={`social-betting-chart-list ${type}`}>
        {sortedRows.map((row) => (
          <div className="social-betting-chart-row" key={`${type}-${row.userName}`}>
            <strong>{row.userName}</strong>
            {type === 'points' ? (
              <>
                <div className="social-betting-stacked-bar" aria-label={`${row.userName} points split`}>
                  <span className="win" style={{ width: `${row.pointsSplit.win}%` }}>W</span>
                  <span className="draw" style={{ width: `${row.pointsSplit.draw}%` }}>Q</span>
                  <span className="failed" style={{ width: `${row.pointsSplit.failed}%` }}>P</span>
                </div>
                <b>{row.result.toFixed(2)}</b>
              </>
            ) : (
              <>
                <div className="social-betting-accuracy-track" aria-label={`${row.userName} betting accuracy`}>
                  <span style={{ width: `${row.accuracy}%` }} />
                </div>
                <b>{row.accuracy}%</b>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
