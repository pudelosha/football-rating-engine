import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingPointsGrowthSeries } from '../types'

const lineColors = ['#b0d86b', '#d8c96f', '#8fb9a8', '#d8966f', '#9faec0', '#a67bd7']

function pointsToPath(points: number[], min: number, max: number) {
  const width = 640
  const height = 220
  const left = 34
  const top = 20
  const xStep = width / Math.max(points.length - 1, 1)
  const yRange = Math.max(max - min, 1)

  return points
    .map((point, index) => {
      const x = left + index * xStep
      const y = top + height - ((point - min) / yRange) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function pointPosition(point: number, index: number, count: number, min: number, max: number) {
  const width = 640
  const height = 220
  const left = 34
  const top = 20
  const xStep = width / Math.max(count - 1, 1)
  const yRange = Math.max(max - min, 1)

  return {
    x: left + index * xStep,
    y: top + height - ((point - min) / yRange) * height,
  }
}

export function PointsGrowthChartTile({ series }: { series: BettingPointsGrowthSeries[] }) {
  const allPoints = series.flatMap((item) => item.points)
  const min = Math.min(...allPoints)
  const max = Math.max(...allPoints)
  const ticks = [max, Math.round((max + min) / 2), min]
  const gameCount = Math.max(...series.map((item) => item.points.length))

  return (
    <section className="details-panel social-betting-tile social-betting-growth-tile">
      <div className="details-panel-heading social-betting-growth-heading">
        <div>
          <MenuIcon name="ratings" />
          <h2>Points growth</h2>
          <span>Click a point for details</span>
        </div>
      </div>

      <div className="social-betting-growth-controls">
        <label>
          <span>Participants</span>
          <select value="all" onChange={() => undefined}>
            <option value="all">{series.map((item) => item.playerName).join(', ')}</option>
          </select>
        </label>
        <label>
          <span>Games</span>
          <select value={gameCount} onChange={() => undefined}>
            <option value={gameCount}>{gameCount}</option>
          </select>
        </label>
      </div>

      <div className="social-betting-growth-plot">
        <svg viewBox="0 0 720 280" role="img" aria-label="Points growth chart">
          {ticks.map((tick) => {
            const y = pointPosition(tick, 0, 1, min, max).y
            return (
              <g key={tick}>
                <line x1="34" x2="674" y1={y} y2={y} />
                <text x="6" y={y + 4}>{tick}</text>
              </g>
            )
          })}

          {Array.from({ length: gameCount }, (_, index) => {
            const x = pointPosition(min, index, gameCount, min, max).x
            return <text className="round-label" x={x} y="268" key={index}>{index + 1}</text>
          })}

          {series.map((item, seriesIndex) => (
            <g key={item.playerName}>
              <path d={pointsToPath(item.points, min, max)} style={{ stroke: lineColors[seriesIndex % lineColors.length] }} />
              {item.points.map((point, index) => {
                const position = pointPosition(point, index, item.points.length, min, max)
                return (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r="4"
                    key={`${item.playerName}-${index}`}
                    style={{ fill: lineColors[seriesIndex % lineColors.length] }}
                  />
                )
              })}
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
