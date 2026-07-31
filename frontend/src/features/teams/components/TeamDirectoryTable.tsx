import type { SortDirection, UserTeamDirectoryRow, UserTeamSortKey } from '../../../shared/types'
import { formatDate } from '../../../shared/utils'
import type { OpenTeamHandler, TeamsTranslation } from '../types'

export function TeamDirectoryTable({
  isLoading,
  rows,
  sortDirection,
  sortKey,
  t,
  onOpen,
  onSort,
}: {
  isLoading: boolean
  rows: UserTeamDirectoryRow[]
  sortDirection: SortDirection
  sortKey: UserTeamSortKey
  t: TeamsTranslation
  onOpen: OpenTeamHandler
  onSort: (key: UserTeamSortKey) => void
}) {
  const headers: Array<{ key: UserTeamSortKey; label: string }> = [
    { key: 'team', label: t.teamName },
    { key: 'country', label: t.tournamentCountry },
    { key: 'tournaments', label: t.activeTournamentContexts },
    { key: 'rating', label: t.latestRating },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  return (
    <div className="tournament-table-shell compact-table-shell">
      <table className="tournament-table team-directory-table">
        <thead>
          <tr>
            {headers.map((header) => (
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
            <th>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && rows.map((row) => (
            <tr key={row.team.id}>
              <td>
                <strong>{row.team.name}</strong>
              </td>
              <td>{row.countries.join(', ') || '-'}</td>
              <td>
                <div className="team-context-list">
                  {row.contexts.map((context) => (
                    <span key={`${row.team.id}-${context.tournamentId}`}>
                      {context.tournamentName}{context.season ? ` ${context.season}` : ''}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                {row.latestRating !== undefined
                  ? (
                    <span className="team-rating-cell">
                      <strong>{row.latestRating.toFixed(2)}</strong>
                    </span>
                  )
                  : '-'}
              </td>
              <td>{formatDate(row.lastSyncedAtUtc, '-')}</td>
              <td>
                <button type="button" onClick={() => onOpen(row.team.id)}>
                  {t.teamDetails}
                </button>
              </td>
            </tr>
          ))}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td className="empty-table" colSpan={6}>{t.noTeams}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
