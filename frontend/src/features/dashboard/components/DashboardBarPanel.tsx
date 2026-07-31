import { MenuIcon } from '../../../shared/components/Icons'
import type { DashboardBar } from '../types'

export function DashboardBarPanel({
  bars,
  emptyText,
  icon,
  title,
}: {
  bars: DashboardBar[]
  emptyText: string
  icon: 'matches' | 'ratings' | 'predictions' | 'tournaments'
  title: string
}) {
  const max = Math.max(...bars.map((bar) => bar.value), 1)

  return (
    <section className="details-panel dashboard-chart-card">
      <div className="details-panel-heading">
        <MenuIcon name={icon} />
        <h2>{title}</h2>
      </div>
      <div className="dashboard-bar-list">
        {bars.length === 0 && <p className="empty-panel-copy">{emptyText}</p>}
        {bars.map((bar) => (
          <div className="dashboard-bar-row" key={`${bar.label}-${bar.detail}`}>
            <div>
              <strong>{bar.label}</strong>
              <span>{bar.detail}</span>
            </div>
            <div className="dashboard-bar-track" aria-hidden="true">
              <span style={{ width: `${Math.max(6, Math.min(100, (bar.value / max) * 100))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
