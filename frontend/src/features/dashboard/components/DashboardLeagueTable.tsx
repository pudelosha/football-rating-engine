import { MenuIcon } from '../../../shared/components/Icons'
import type { DashboardCopy, LeagueTableRow } from '../types'

export function DashboardLeagueTable({
  copy,
  rows,
}: {
  copy: DashboardCopy
  rows: LeagueTableRow[]
}) {
  return (
    <section className="details-panel">
      <div className="details-panel-heading">
        <MenuIcon name="tournaments" />
        <h2>{copy.leagueTable}</h2>
      </div>
      <div className="tournament-table-shell compact-table-shell">
        <table className="tournament-table dashboard-league-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>{copy.played}</th>
              <th>{copy.wins}</th>
              <th>{copy.draws}</th>
              <th>{copy.losses}</th>
              <th>{copy.goalsFor}</th>
              <th>{copy.goalsAgainst}</th>
              <th>{copy.goalDifference}</th>
              <th>{copy.avgFor}</th>
              <th>{copy.avgAgainst}</th>
              <th>{copy.points}</th>
              <th>{copy.finalRating}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.teamId}>
                <td>{index + 1}</td>
                <td>
                  <strong>{row.teamName}</strong>
                  <span>{row.abbreviation}</span>
                </td>
                <td>{row.played}</td>
                <td>{row.wins}</td>
                <td>{row.draws}</td>
                <td>{row.losses}</td>
                <td>{row.goalsFor}</td>
                <td>{row.goalsAgainst}</td>
                <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td>{row.averageGoalsFor.toFixed(2)}</td>
                <td>{row.averageGoalsAgainst.toFixed(2)}</td>
                <td><strong>{row.points}</strong></td>
                <td>{row.finalRating ? row.finalRating.toFixed(2) : '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={13}>{copy.noRows}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
