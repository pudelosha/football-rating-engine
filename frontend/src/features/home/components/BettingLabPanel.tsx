import { MenuIcon } from '../../../shared/components/Icons'
import type { HomeCopy, HomeInsightItem, HomeNavigateHandler } from '../types'

export function BettingLabPanel({
  copy,
  items,
  onNavigate,
}: {
  copy: HomeCopy
  items: HomeInsightItem[]
  onNavigate: HomeNavigateHandler
}) {
  return (
    <section className="details-panel home-betting-panel">
      <div className="details-panel-heading split">
        <div>
        <MenuIcon name="slips" />
        <h2>{copy.bettingLab}</h2>
      </div>
        <button type="button" onClick={() => onNavigate('slips')}>{copy.openBetting}</button>
      </div>
      <p>{copy.bettingCopy}</p>
      <div className="home-betting-grid">
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
