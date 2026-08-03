import { MenuIcon } from '../../../shared/components/Icons'
import type { MenuIconName } from '../../../shared/types'
import type { BettingMatchPick } from '../types'

function splitKickoff(kickoff: string) {
  const [date = kickoff, time = ''] = kickoff.split(',').map((part) => part.trim())
  return { date, time }
}

export function BettingMatchListTile({
  actionLabel,
  compact = false,
  icon,
  items,
  title,
  variant = 'default',
}: {
  actionLabel?: string
  compact?: boolean
  icon: MenuIconName
  items: BettingMatchPick[]
  title: string
  variant?: 'default' | 'results'
}) {
  return (
    <section className={`details-panel social-betting-tile ${compact ? 'compact' : ''}`}>
      <div className="details-panel-heading">
        <MenuIcon name={icon} />
        <h2>{title}</h2>
      </div>
      <div className="social-betting-match-list">
        {items.map((item) => (
          <article key={item.id}>
            {compact ? (
              <>
                <div className="social-betting-compact-teams">
                  <strong>{item.homeTeam}</strong>
                  <strong>{item.awayTeam}</strong>
                </div>
                <time className="social-betting-compact-time">
                  <span>{splitKickoff(item.kickoff).date}</span>
                  <span>{splitKickoff(item.kickoff).time}</span>
                </time>
                <button className="social-betting-icon-button" type="button" aria-label="Preview match">
                  <MenuIcon name="search" />
                </button>
              </>
            ) : (
              <div>
                <span>{item.kickoff}</span>
                <strong>{item.homeTeam} vs {item.awayTeam}</strong>
                <small>{item.linkedTournament}</small>
              </div>
            )}
            {variant === 'results' ? (
              <div className="social-betting-result">
                <span>{item.prediction} / {item.score}</span>
                <b className={item.result === 'won' ? 'won' : 'lost'}>{item.points ?? 0} pts</b>
              </div>
            ) : (
              <div className="social-betting-pick">
                {item.prediction && <span>{item.prediction}</span>}
                {actionLabel && <button type="button">{actionLabel}</button>}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
