import { MenuIcon } from '../../../shared/components/Icons'
import type { HomeCopy, HomeNavigateHandler, HomeTranslation, RatingsSnapshotRow } from '../types'

export function RatingsSnapshotPanel({
  copy,
  rows,
  t,
  onNavigate,
}: {
  copy: HomeCopy
  rows: RatingsSnapshotRow[]
  t: HomeTranslation
  onNavigate: HomeNavigateHandler
}) {
  return (
    <section className="details-panel home-table-panel">
      <div className="details-panel-heading split">
        <div>
          <MenuIcon name="ratings" />
          <h2>{copy.ratingsSnapshot}</h2>
        </div>
        <button type="button" onClick={() => onNavigate('ratings')}>{copy.openRatings}</button>
      </div>
      <div className="home-table-shell">
        <table className="tournament-table home-table compact">
          <thead>
            <tr>
              <th>{t.teamName}</th>
              <th>{t.bettingTournament}</th>
              <th>{t.ratingBaseElo}</th>
              <th>{t.ratingForm}</th>
              <th>{t.ratingSquad}</th>
              <th>{t.ratingFinal}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team}>
                <td><strong>{row.team}</strong></td>
                <td>{row.tournament}</td>
                <td>{row.base}</td>
                <td>{row.form}</td>
                <td>{row.squad}</td>
                <td><strong>{row.final}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
