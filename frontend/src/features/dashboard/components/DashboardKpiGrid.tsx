import { MenuIcon } from '../../../shared/components/Icons'
import type { DashboardKpi } from '../types'

export function DashboardKpiGrid({ items }: { items: DashboardKpi[] }) {
  return (
    <div className="dashboard-kpi-grid">
      {items.map((item) => (
        <article className="dashboard-kpi-card" key={item.label}>
          <div>
            <MenuIcon name={item.icon} />
            <span>{item.label}</span>
          </div>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  )
}
