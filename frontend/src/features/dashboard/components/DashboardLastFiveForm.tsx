import { useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { MenuIcon } from '../../../shared/components/Icons'
import { formatDate } from '../../../shared/utils'
import type { TeamLastFiveRow } from '../types'

const formSlots = 5
type LastFiveTooltip = {
  x: number
  y: number
  title: string
  details: string[]
  result: 'W' | 'D' | 'L'
}

export function DashboardLastFiveForm({
  emptyText,
  rows,
}: {
  emptyText: string
  rows: TeamLastFiveRow[]
}) {
  const [tooltip, setTooltip] = useState<LastFiveTooltip | null>(null)

  function showTooltip(event: MouseEvent<HTMLElement>, row: TeamLastFiveRow, result: TeamLastFiveRow['results'][number]) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      title: `${result.homeTeamName} ${result.homeScore}:${result.awayScore} ${result.awayTeamName}`,
      result: result.result,
      details: [
        `Team: ${row.teamName}`,
        `Date: ${formatDate(result.kickoffUtc, '-')}`,
        `Result: ${result.result === 'W' ? 'Win' : result.result === 'D' ? 'Draw' : 'Loss'}`,
      ],
    })
  }

  return (
    <section className="details-panel dashboard-last-five-panel" onMouseLeave={() => setTooltip(null)}>
      <div className="details-panel-heading">
        <MenuIcon name="matches" />
        <h2>Last 5 results</h2>
      </div>
      <div className="dashboard-last-five-table">
        <div className="dashboard-last-five-header">
          <span>Team</span>
        </div>
        {rows.length === 0 && <p className="empty-panel-copy">{emptyText}</p>}
        {rows.map((row) => (
          <div className="dashboard-last-five-row" key={row.teamId}>
            <strong title={row.teamName}>{row.abbreviation.toUpperCase()}</strong>
            <div>
              {Array.from({ length: formSlots }, (_, index) => {
                const result = row.results[index]
                return result ? (
                  <b
                    className={result.result.toLowerCase()}
                    key={`${row.teamId}-${index}`}
                    onMouseMove={(event) => showTooltip(event, row, result)}
                  >
                    {result.result}
                  </b>
                ) : (
                  <small key={`${row.teamId}-${index}`}>-</small>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {tooltip && createPortal(
        <div className={`dashboard-chart-tooltip dashboard-last-five-tooltip ${tooltip.result.toLowerCase()}`} style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
          <strong>{tooltip.title}</strong>
          {tooltip.details.map((detail) => <span key={detail}>{detail}</span>)}
        </div>,
        document.body,
      )}
    </section>
  )
}
