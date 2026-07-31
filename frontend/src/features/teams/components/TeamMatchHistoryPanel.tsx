import { MenuIcon } from '../../../shared/components/Icons'
import { formatDate, getTeamDisplayName, matchStatusText } from '../../../shared/utils'
import type { TeamMatchWithTournament, TeamsTranslation, UpcomingLimit } from '../types'

export function TeamMatchHistoryPanel({
  matches,
  t,
  upcomingLimit,
  onUpcomingLimitChange,
}: {
  matches: TeamMatchWithTournament[]
  t: TeamsTranslation
  upcomingLimit: UpcomingLimit
  onUpcomingLimitChange: (value: UpcomingLimit) => void
}) {
  return (
    <section className="details-panel">
      <div className="details-panel-heading spread betting-selected-heading">
        <div>
          <MenuIcon name="matches" />
          <h2>{t.teamMatchHistory}</h2>
        </div>
        <div className="tournament-filter team-match-limit-filter">
          {[
            ['5', t.showFive],
            ['10', t.showTen],
            ['25', t.showTwentyFive],
            ['all', t.showAll],
          ].map(([value, label]) => (
            <button
              className={upcomingLimit === value ? 'active' : ''}
              type="button"
              key={value}
              onClick={() => onUpcomingLimitChange(value as UpcomingLimit)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="tournament-table-shell compact-table-shell">
        <table className="tournament-table team-details-table">
          <thead>
            <tr>
              <th>{t.kickoff}</th>
              <th>{t.tournamentName}</th>
              <th>{t.round}</th>
              <th>{t.homeTeam}</th>
              <th>{t.awayTeam}</th>
              <th>{t.score}</th>
              <th>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={`${match.tournamentId}-${match.id}`}>
                <td>{formatDate(match.kickoffUtc, '-')}</td>
                <td>{match.tournamentName}</td>
                <td>{match.roundInfo || '-'}</td>
                <td>{getTeamDisplayName(match, 'home')}</td>
                <td>{getTeamDisplayName(match, 'away')}</td>
                <td>{match.homeScore ?? '-'} : {match.awayScore ?? '-'}</td>
                <td>{matchStatusText(match.status, t)}</td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={7}>{t.teamNoMatches}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
