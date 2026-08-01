import { MenuIcon } from '../../../shared/components/Icons'
import type { DashboardBar, LeagueTableRow } from '../types'

function formatEuro(value: number) {
  return new Intl.NumberFormat(undefined, {
    currency: 'EUR',
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(value)
}

function MiniHorizontalBarChart({
  bars,
  emptyText,
  title,
  valueFormatter = (value) => String(value),
}: {
  bars: DashboardBar[]
  emptyText: string
  title: string
  valueFormatter?: (value: number) => string
}) {
  const max = Math.max(...bars.map((bar) => bar.value), 1)

  return (
    <section className="dashboard-mini-chart">
      <div className="details-panel-heading">
        <MenuIcon name="ratings" />
        <h2>{title}</h2>
      </div>
      <div className="dashboard-mini-bars">
        {bars.length === 0 && <p className="empty-panel-copy">{emptyText}</p>}
        {bars.map((bar) => (
          <div className="dashboard-mini-bar-row" key={bar.label}>
            <span>{bar.label.toUpperCase()}</span>
            <div>
              {bar.value > 0 && <b style={{ width: `${(bar.value / max) * 100}%` }} />}
            </div>
            <strong title={valueFormatter(bar.value)}>{valueFormatter(bar.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function MirroredGoalsChart({
  emptyText,
  rows,
}: {
  emptyText: string
  rows: LeagueTableRow[]
}) {
  const max = Math.max(...rows.flatMap((row) => [row.goalsFor, row.goalsAgainst]), 1)

  return (
    <section className="dashboard-mini-chart">
      <div className="details-panel-heading">
        <MenuIcon name="matches" />
        <h2>Scored / conceded</h2>
      </div>
      <div className="dashboard-mirror-chart">
        {rows.length === 0 && <p className="empty-panel-copy">{emptyText}</p>}
        {rows.map((row) => (
          <div className="dashboard-mirror-row" key={row.teamId}>
            <span>{(row.abbreviation || row.teamName).toUpperCase()}</span>
            <div className="mirror-left">
              {row.goalsAgainst > 0 && <b style={{ width: `${(row.goalsAgainst / max) * 100}%` }}>{row.goalsAgainst}</b>}
            </div>
            <i />
            <div className="mirror-right">
              {row.goalsFor > 0 && <b style={{ width: `${(row.goalsFor / max) * 100}%` }}>{row.goalsFor}</b>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AverageAgeDotChart({
  bars,
  emptyText,
}: {
  bars: DashboardBar[]
  emptyText: string
}) {
  if (bars.length === 0) {
    return (
      <section className="dashboard-mini-chart dashboard-age-chart">
        <div className="details-panel-heading">
          <MenuIcon name="teams" />
          <h2>Average age</h2>
        </div>
        <p className="empty-panel-copy">{emptyText}</p>
      </section>
    )
  }

  const min = Math.floor(Math.min(...bars.map((bar) => bar.value), 20))
  const max = Math.ceil(Math.max(...bars.map((bar) => bar.value), 32))
  const span = Math.max(1, max - min)
  const ticks = Array.from({ length: max - min + 1 }, (_, index) => min + index)

  return (
    <section className="dashboard-mini-chart dashboard-age-chart">
      <div className="details-panel-heading">
        <MenuIcon name="teams" />
        <h2>Average age</h2>
      </div>
      <div className="dashboard-age-plot">
        <div className="dashboard-age-axis" style={{ gridTemplateColumns: `minmax(92px, 0.38fr) repeat(${ticks.length}, 1fr)` }}>
          <span />
          {ticks.map((tick) => <strong key={tick}>{tick}</strong>)}
        </div>
        {bars.map((bar) => (
          <div className="dashboard-age-row" key={bar.label}>
            <span>{bar.label}</span>
            <div style={{ gridTemplateColumns: `repeat(${ticks.length}, 1fr)` }}>
              {ticks.map((tick) => <i key={tick} />)}
              <b style={{ left: `${((bar.value - min) / span) * 100}%` }} title={`${bar.detail}: ${bar.value.toFixed(1)}`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DashboardChartPlaceholders({
  emptyText,
  goalsScoredBars,
  scoredConcededRows,
  teamAgeDots,
  teamValueBars,
}: {
  emptyText: string
  goalsScoredBars: DashboardBar[]
  scoredConcededRows: LeagueTableRow[]
  teamAgeDots: DashboardBar[]
  teamValueBars: DashboardBar[]
}) {
  return (
    <div className="dashboard-chart-row">
      <MiniHorizontalBarChart bars={goalsScoredBars} emptyText={emptyText} title="Goals scored" />
      <MirroredGoalsChart emptyText={emptyText} rows={scoredConcededRows} />
      <MiniHorizontalBarChart bars={teamValueBars} emptyText={emptyText} title="Team value" valueFormatter={formatEuro} />
      <AverageAgeDotChart bars={teamAgeDots} emptyText={emptyText} />
    </div>
  )
}
