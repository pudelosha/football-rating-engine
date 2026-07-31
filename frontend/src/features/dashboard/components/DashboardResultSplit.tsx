import { MenuIcon } from '../../../shared/components/Icons'
import type { DashboardCopy, ResultSplit } from '../types'

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function DashboardResultSplit({
  copy,
  split,
}: {
  copy: DashboardCopy
  split: ResultSplit
}) {
  const homeCenter = split.homeShare * 50
  const drawCenter = split.homeShare * 100 + split.drawShare * 50
  const awayCenter = (split.homeShare + split.drawShare) * 100 + split.awayShare * 50

  return (
    <section className="details-panel dashboard-result-split">
      <div className="details-panel-heading">
        <MenuIcon name="matches" />
        <h2>{copy.resultSplit}</h2>
      </div>
      <div
        className="dashboard-result-bar"
        style={{
          background: `
            radial-gradient(circle at ${homeCenter}% 50%, rgba(176, 216, 107, 0.66), transparent 42%),
            radial-gradient(circle at ${drawCenter}% 50%, rgba(224, 201, 105, 0.56), transparent 38%),
            radial-gradient(circle at ${awayCenter}% 50%, rgba(124, 153, 178, 0.66), transparent 42%),
            linear-gradient(90deg, rgba(176, 216, 107, 0.34), rgba(224, 201, 105, 0.26), rgba(124, 153, 178, 0.34)),
            rgba(54, 63, 54, 0.72)`,
        }}
      >
        <div>
          <span>Home win</span>
          <strong>{percent(split.homeShare)}</strong>
        </div>
        <div>
          <span>Draw</span>
          <strong>{percent(split.drawShare)}</strong>
        </div>
        <div>
          <span>Away win</span>
          <strong>{percent(split.awayShare)}</strong>
        </div>
      </div>
    </section>
  )
}
