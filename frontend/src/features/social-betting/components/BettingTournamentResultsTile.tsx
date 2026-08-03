import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingStandingRow } from '../types'

export function BettingTournamentResultsTile({ rows }: { rows: BettingStandingRow[] }) {
  return (
    <section className="details-panel social-betting-tile social-betting-results-tile">
      <div className="details-panel-heading">
        <MenuIcon name="ratings" />
        <h2>Tournament results</h2>
      </div>
      <div className="tournament-table-shell compact-table-shell">
        <table className="tournament-table social-betting-table">
          <thead>
            <tr>
              <th>#</th>
              <th>+/-</th>
              <th>Player</th>
              <th>%</th>
              <th>W</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userName}>
                <td>{row.position}</td>
                <td><span className={`social-betting-rank ${row.direction}`}>{row.direction === 'up' ? '+' : row.direction === 'down' ? '-' : '-'}</span></td>
                <td><strong>{row.userName}</strong></td>
                <td>{row.accuracy}%</td>
                <td>{row.successfulBets}</td>
                <td><strong className="social-betting-score">{row.result.toFixed(2)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
