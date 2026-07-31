import { MenuIcon } from '../../../shared/components/Icons'
import type { HomeCopy, HomeNavigateHandler, HomeTranslation } from '../types'

export function HomeHero({
  copy,
  displayName,
  t,
  today,
  onNavigate,
}: {
  copy: HomeCopy
  displayName: string
  t: HomeTranslation
  today: string
  onNavigate: HomeNavigateHandler
}) {
  return (
    <section className="dashboard-hero modern-home-hero">
      <div>
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>{t.dashboardHomeTitle}, {displayName}</h1>
        <p>{copy.copy}</p>
      </div>
      <div className="home-command-card">
        <span>{today}</span>
        <strong>{copy.ready}</strong>
        <small>{copy.readyCopy}</small>
      </div>
      <div className="home-action-row">
        <button type="button" onClick={() => onNavigate('ratings')}>
          <MenuIcon name="ratings" />
          <span>{copy.actions[0]}</span>
        </button>
        <button type="button" onClick={() => onNavigate('predictions')}>
          <MenuIcon name="predictions" />
          <span>{copy.actions[1]}</span>
        </button>
        <button type="button" onClick={() => onNavigate('betting-create')}>
          <MenuIcon name="betting" />
          <span>{copy.actions[2]}</span>
        </button>
      </div>
    </section>
  )
}
