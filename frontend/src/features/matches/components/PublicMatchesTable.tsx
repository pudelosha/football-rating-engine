import type { MatchSummary, PublicMatchSortKey, SortDirection } from '../../../shared/types'
import { formatDate, matchStatusText } from '../../../shared/utils'
import type { MatchesTranslation } from '../types'
import { MenuIcon } from '../../../shared/components/Icons'

export function PublicMatchesTable({
  isLoading,
  matches,
  sortDirection,
  sortKey,
  t,
  onSort,
  onOpenPredictionSnapshot,
}: {
  isLoading: boolean
  matches: MatchSummary[]
  sortDirection: SortDirection
  sortKey: PublicMatchSortKey
  t: MatchesTranslation
  onSort: (key: PublicMatchSortKey) => void
  onOpenPredictionSnapshot: (match: MatchSummary) => void
}) {
  const matchHeaders: Array<{ key: PublicMatchSortKey; label: string }> = [
    { key: 'kickoff', label: t.kickoff },
    { key: 'round', label: t.round },
    { key: 'home', label: t.homeTeam },
    { key: 'away', label: t.awayTeam },
    { key: 'score', label: t.score },
    { key: 'status', label: t.status },
  ]

  return (
    <div className="tournament-table-shell compact-table-shell">
      <table className="tournament-table matches-table public-matches-table">
        <thead>
          <tr>
            {matchHeaders.map((header) => (
              <th key={header.key}>
                <button
                  className="table-sort-button"
                  type="button"
                  aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => onSort(header.key)}
                >
                  <span>{header.label}</span>
                  <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                </button>
              </th>
            ))}
            <th aria-label={t.storedPrediction} />
          </tr>
        </thead>
        <tbody>
          {!isLoading && matches.map((match) => (
            <tr key={match.id}>
              <td>{formatDate(match.kickoffUtc, '-')}</td>
              <td>{match.roundInfo || '-'}</td>
              <td>{match.homeTeam?.name || match.homeTeamNameSnapshot || '-'}</td>
              <td>{match.awayTeam?.name || match.awayTeamNameSnapshot || '-'}</td>
              <td>{match.homeScore ?? '-'} : {match.awayScore ?? '-'}</td>
              <td>{matchStatusText(match.status, t)}</td>
              <td>
                {match.hasPredictionSnapshot && (
                  <button
                    className="stored-prediction-button"
                    type="button"
                    title={t.storedPrediction}
                    aria-label={t.storedPrediction}
                    onClick={() => onOpenPredictionSnapshot(match)}
                  >
                    <MenuIcon name="predictions" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!isLoading && matches.length === 0 && (
            <tr>
              <td className="empty-table" colSpan={7}>-</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
