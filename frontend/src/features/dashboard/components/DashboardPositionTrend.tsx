import { useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { MenuIcon } from '../../../shared/components/Icons'
import type { DashboardCopy, PositionTrendRow } from '../types'

type ChartTooltip = {
  x: number
  y: number
  title: string
  details?: string[]
}

export function DashboardPositionTrend({
  copy,
  rows,
}: {
  copy: DashboardCopy
  rows: PositionTrendRow[]
}) {
  const [tooltip, setTooltip] = useState<ChartTooltip | null>(null)
  const [roundWindow, setRoundWindow] = useState('all')
  const fullRounds = rows[0]?.rounds ?? []
  const visibleRoundCount = roundWindow === 'all' ? fullRounds.length : Number(roundWindow)
  const sliceStart = Math.max(0, fullRounds.length - visibleRoundCount)
  const rounds = fullRounds.slice(sliceStart)
  const displayedRows = rows.map((row) => ({
    ...row,
    rounds,
    positions: row.positions.slice(sliceStart),
    points: row.points.slice(sliceStart),
    pointChanges: row.pointChanges.slice(sliceStart),
  }))
  const width = 640
  const height = 540
  const top = 12
  const bottom = 24
  const left = 22
  const right = 16
  const maxPosition = Math.max(...displayedRows.flatMap((row) => row.positions.filter((position): position is number => position !== null)), 1)
  const yForPosition = (position: number) => top + ((position - 1) / Math.max(1, maxPosition - 1)) * (height - top - bottom)
  const xForRound = (index: number) => rounds.length <= 1
    ? left + (width - left - right) / 2
    : left + (index / (rounds.length - 1)) * (width - left - right)
  const colors = ['#b0d86b', '#e0c969', '#8fb4d8', '#d8966f', '#76d5a6', '#d4a6ff', '#c5d2a0', '#9fd0c7', '#d8b08f', '#a9bad5']

  function buildPoints(positions: Array<number | null>) {
    return positions
      .map((position, index) => position === null ? null : `${xForRound(index)},${yForPosition(position)}`)
      .filter((point): point is string => Boolean(point))
      .join(' ')
  }

  function showLineTooltip(event: MouseEvent<SVGPolylineElement>, row: PositionTrendRow) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      title: row.teamName,
    })
  }

  function showPointTooltip(event: MouseEvent<SVGCircleElement>, row: PositionTrendRow, index: number) {
    const position = row.positions[index]
    const points = row.points[index]
    const change = row.pointChanges[index]
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      title: row.teamName,
      details: [
        `Round: ${rounds[index]}`,
        `Position: ${position ?? '-'}`,
        `Points: ${points ?? '-'}`,
        `Point change: ${change === null || change === undefined ? '-' : change >= 0 ? `+${change}` : String(change)}`,
      ],
    })
  }

  return (
    <section className="details-panel dashboard-position-panel">
      <div className="details-panel-heading spread dashboard-chart-heading">
        <div>
          <MenuIcon name="ratings" />
          <h2>{copy.positionTrend}</h2>
        </div>
        <select value={roundWindow} onChange={(event) => setRoundWindow(event.target.value)}>
          <option value="all">All rounds</option>
          <option value="3">Last 3</option>
          <option value="5">Last 5</option>
          <option value="10">Last 10</option>
          <option value="15">Last 15</option>
        </select>
      </div>
      {displayedRows.length === 0 && <p className="empty-panel-copy">{copy.noRows}</p>}
      {displayedRows.length > 0 && (
        <div className="dashboard-position-line-chart" onMouseLeave={() => setTooltip(null)}>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={copy.positionTrend}>
            {[1, Math.ceil(maxPosition / 2), maxPosition].map((position) => (
              <g key={position}>
                <line x1={left} x2={width - right} y1={yForPosition(position)} y2={yForPosition(position)} />
              </g>
            ))}
            {rounds.map((round, index) => (
              <g key={round}>
                <line className="round-grid-line" x1={xForRound(index)} x2={xForRound(index)} y1={top} y2={height - bottom} />
                <text className="round-label" x={xForRound(index)} y={height - 14}>{round}</text>
              </g>
            ))}
            {displayedRows.map((row, index) => (
              <g key={row.teamId}>
                <polyline
                  className="position-team-line"
                  points={buildPoints(row.positions)}
                  style={{ stroke: colors[index % colors.length] }}
                  onMouseMove={(event) => showLineTooltip(event, row)}
                  onMouseLeave={() => setTooltip(null)}
                />
                {row.positions.map((position, pointIndex) => position === null ? null : (
                  <circle
                    cx={xForRound(pointIndex)}
                    cy={yForPosition(position)}
                    fill={colors[index % colors.length]}
                    key={`${row.teamId}-${pointIndex}`}
                    r="5"
                    onMouseMove={(event) => showPointTooltip(event, row, pointIndex)}
                  />
                ))}
              </g>
            ))}
          </svg>
          {tooltip && createPortal(
            <div className="dashboard-chart-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
              <strong>{tooltip.title}</strong>
              {tooltip.details?.map((detail) => <span key={detail}>{detail}</span>)}
            </div>,
            document.body,
          )}
        </div>
      )}
    </section>
  )
}
