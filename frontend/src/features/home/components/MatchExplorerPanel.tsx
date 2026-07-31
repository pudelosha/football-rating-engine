import { MenuIcon } from '../../../shared/components/Icons'
import type { HomeCopy, HomeInsightItem, HomeNavigateHandler } from '../types'

export function MatchExplorerPanel({
  copy,
  items,
  onNavigate,
}: {
  copy: HomeCopy
  items: HomeInsightItem[]
  onNavigate: HomeNavigateHandler
}) {
  return (
    <section className="details-panel home-insight-panel">
      <div className="details-panel-heading split">
        <div>
          <MenuIcon name="matches" />
          <h2>{copy.matchExplorer}</h2>
        </div>
        <button type="button" onClick={() => onNavigate('matches')}>{copy.browseMatches}</button>
      </div>
      <div className="home-insight-list">
        {items.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
