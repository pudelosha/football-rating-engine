import { MenuIcon } from '../../../shared/components/Icons'
import type { SortDirection, TournamentSortKey, TournamentSummary } from '../../../shared/types'
import { formatDate } from '../../../shared/utils'
import type { MatchesTranslation, OpenTournamentHandler } from '../types'

export function TournamentMatchesTable({
  isLoading,
  search,
  sortDirection,
  sortKey,
  t,
  tournaments,
  onOpen,
  onSearchChange,
  onSort,
}: {
  isLoading: boolean
  search: string
  sortDirection: SortDirection
  sortKey: TournamentSortKey
  t: MatchesTranslation
  tournaments: TournamentSummary[]
  onOpen: OpenTournamentHandler
  onSearchChange: (value: string) => void
  onSort: (key: TournamentSortKey) => void
}) {
  const tournamentHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.teams },
    { key: 'matches', label: t.matches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  return (
    <section className="details-panel">
      <div className="details-panel-heading spread">
        <div>
          <MenuIcon name="matches" />
          <h2>{t.matches}</h2>
        </div>
        <label className="tournament-search compact">
          <span>{t.tournamentSearch}</span>
          <input
            placeholder={t.tournamentSearchPlaceholder}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>
      <div className="tournament-table-shell compact-table-shell">
        <table className="tournament-table ratings-tournament-table">
          <thead>
            <tr>
              {tournamentHeaders.map((header) => (
                <th key={header.key}>
                  <button
                    type="button"
                    className="table-sort-button"
                    aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => onSort(header.key)}
                  >
                    {header.label}
                    <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                  </button>
                </th>
              ))}
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && tournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td><strong>{tournament.name}</strong></td>
                <td>{tournament.season}</td>
                <td>{tournament.competitionCountry}</td>
                <td>{tournament.teamCount}</td>
                <td>{tournament.matchCount}</td>
                <td>{formatDate(tournament.lastSyncedAtUtc, '-')}</td>
                <td>
                  <button type="button" onClick={() => onOpen(tournament.id)}>
                    {t.matchOpenTournament}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && tournaments.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={7}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
