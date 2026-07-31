import { MenuIcon } from '../../../shared/components/Icons'
import type { MenuIconName } from '../../../shared/types'

export function AdminOverviewGrid({
  cards,
}: {
  cards: Array<{
    icon: MenuIconName
    title: string
    description: string
    action?: () => void
    active?: boolean
  }>
}) {
  return (
    <div className="admin-overview-grid">
      {cards.map((card) => {
        const content = (
          <>
            <MenuIcon name={card.icon} />
            <strong>{card.title}</strong>
            <p>{card.description}</p>
          </>
        )

        return card.action ? (
          <button
            className={`admin-overview-card action ${card.active ? 'active' : ''}`}
            type="button"
            aria-expanded={card.active}
            key={card.title}
            onClick={card.action}
          >
            {content}
          </button>
        ) : (
          <article className="admin-overview-card clean" key={card.title}>
            {content}
          </article>
        )
      })}
    </div>
  )
}
