import { MenuIcon } from '../../../shared/components/Icons'
import type { MenuIconName } from '../../../shared/types'
import type { BettingMatchPick } from '../types'

function splitKickoff(kickoff: string) {
  const [date = kickoff, time = ''] = kickoff.split(',').map((part) => part.trim())
  return { date, time }
}

function splitPrediction(prediction?: string) {
  const [home = '-', away = '-'] = (prediction ?? '-:-').split(':').map((part) => part.trim())
  return { home, away }
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
    <section className={`details-panel social-betting-tile ${compact ? 'compact' : ''} ${variant === 'results' ? 'results' : ''}`}>
      <div className="details-panel-heading">
        <MenuIcon name={icon} />
        <h2>{title}</h2>
      </div>
      <div className="social-betting-match-list">
        {items.map((item) => {
          const predictedScore = splitPrediction(item.prediction)
          const outcomeText = item.result === 'won' ? 'Matched' : 'Not matched / failed'

          return (
            <article key={item.id}>
              {compact || item.prediction ? (
              <>
                <div className="social-betting-compact-teams">
                  <strong>{item.homeTeam}</strong>
                  <strong>{item.awayTeam}</strong>
                </div>
                {item.prediction && (
                  <div className={`social-betting-compact-score ${variant === 'results' ? item.result ?? 'pending' : ''}`}>
                    <strong>{predictedScore.home}</strong>
                    <strong>{predictedScore.away}</strong>
                    {variant === 'results' && (
                      <span className={`social-betting-score-tooltip ${item.result ?? 'pending'}`}>
                        <b>Real result: {item.score ?? '-:-'}</b>
                        <small>{outcomeText}</small>
                      </span>
                    )}
                  </div>
                )}
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
            {variant !== 'results' && (
              <div className="social-betting-pick">
                {actionLabel && <button type="button">{actionLabel}</button>}
              </div>
            )}
          </article>
          )
        })}
      </div>
    </section>
  )
}
