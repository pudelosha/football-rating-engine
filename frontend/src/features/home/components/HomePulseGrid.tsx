import { MenuIcon } from '../../../shared/components/Icons'
import type { HomePulseCard } from '../types'

export function HomePulseGrid({ cards }: { cards: HomePulseCard[] }) {
  return (
    <section className="home-pulse-grid">
      {cards.map((card) => (
        <article className="home-pulse-card" key={card.label}>
          <MenuIcon name={card.icon} />
          <span>{card.value}</span>
          <strong>{card.label}</strong>
          <p>{card.detail}</p>
        </article>
      ))}
    </section>
  )
}
