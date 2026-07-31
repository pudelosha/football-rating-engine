import { MenuIcon } from '../../../shared/components/Icons'
import type { TeamLastFiveRow } from '../types'

const formSlots = 5

export function DashboardLastFiveForm({
  emptyText,
  rows,
}: {
  emptyText: string
  rows: TeamLastFiveRow[]
}) {
  return (
    <section className="details-panel dashboard-last-five-panel">
      <div className="details-panel-heading">
        <MenuIcon name="matches" />
        <h2>Last 5 results</h2>
      </div>
      <div className="dashboard-last-five-table">
        <div className="dashboard-last-five-header">
          <span>Team</span>
          <span>Last 5</span>
        </div>
        {rows.length === 0 && <p className="empty-panel-copy">{emptyText}</p>}
        {rows.map((row) => (
          <div className="dashboard-last-five-row" key={row.teamId}>
            <strong title={row.teamName}>{row.abbreviation}</strong>
            <div>
              {Array.from({ length: formSlots }, (_, index) => {
                const result = row.results[index]
                return result ? (
                  <b className={result.toLowerCase()} key={`${row.teamId}-${index}`}>{result}</b>
                ) : (
                  <small key={`${row.teamId}-${index}`}>-</small>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
