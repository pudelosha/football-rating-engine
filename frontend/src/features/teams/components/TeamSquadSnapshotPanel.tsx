import { MenuIcon } from '../../../shared/components/Icons'
import type { SortDirection, SquadPlayerSnapshot, SquadPlayerSortKey, SquadQualitySnapshot } from '../../../shared/types'
import { formatDate, formatMoney } from '../../../shared/utils'
import type { TeamsTranslation } from '../types'

export function TeamSquadSnapshotPanel({
  playerSortDirection,
  playerSortKey,
  players,
  squadSnapshot,
  t,
  onPlayerSort,
}: {
  playerSortDirection: SortDirection
  playerSortKey: SquadPlayerSortKey
  players: SquadPlayerSnapshot[]
  squadSnapshot: SquadQualitySnapshot | null
  t: TeamsTranslation
  onPlayerSort: (key: SquadPlayerSortKey) => void
}) {
  const playerHeaders: Array<{ key: SquadPlayerSortKey; label: string }> = [
    { key: 'name', label: t.playerName },
    { key: 'position', label: t.position },
    { key: 'age', label: t.age },
    { key: 'nationality', label: t.nationality },
    { key: 'value', label: t.marketValue },
    { key: 'contract', label: t.contractUntil },
  ]

  return (
    <section className="details-panel">
      <div className="details-panel-heading">
        <MenuIcon name="teams" />
        <h2>{t.teamSquadSnapshot}</h2>
      </div>
      {squadSnapshot ? (
        <>
          <div className="details-grid overview-grid squad-snapshot-summary squad-snapshot-trio">
            <div><span>{t.totalTeamValue}</span><strong>{formatMoney(squadSnapshot.totalMarketValueEur)}</strong></div>
            <div><span>{t.averageMarketValue}</span><strong>{formatMoney(squadSnapshot.averageMarketValueEur)}</strong></div>
            <div><span>{t.squadTeamCount}</span><strong>{squadSnapshot.playerCount}</strong></div>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table team-details-table squad-players-table">
              <thead>
                <tr>
                  {playerHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        className="table-sort-button"
                        type="button"
                        aria-sort={playerSortKey === header.key ? (playerSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => onPlayerSort(header.key)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{playerSortKey === header.key ? (playerSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td><strong>{player.playerName}</strong></td>
                    <td>{player.position || player.positionGroup || '-'}</td>
                    <td>{player.age ?? '-'}</td>
                    <td>{player.nationalities || '-'}</td>
                    <td>{formatMoney(player.marketValueEur)}</td>
                    <td>{player.contractUntil ? formatDate(player.contractUntil, '-') : '-'}</td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={6}>{t.teamNoSquad}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="empty-panel-copy">{t.teamNoSquad}</p>
      )}
    </section>
  )
}
