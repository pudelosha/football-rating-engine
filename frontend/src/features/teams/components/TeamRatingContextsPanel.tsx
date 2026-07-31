import { MenuIcon } from '../../../shared/components/Icons'
import type { UserTeamContext } from '../../../shared/types'
import { formatSigned } from '../../../shared/utils'
import type { OpenRatingsHandler, TeamsTranslation } from '../types'

export function TeamRatingContextsPanel({
  contexts,
  isLoading,
  t,
  onOpenRatings,
}: {
  contexts: UserTeamContext[]
  isLoading: boolean
  t: TeamsTranslation
  onOpenRatings: OpenRatingsHandler
}) {
  return (
    <section className="details-panel">
      <div className="details-panel-heading">
        <MenuIcon name="ratings" />
        <h2>{t.teamRatingContexts}</h2>
      </div>
      <div className="tournament-table-shell compact-table-shell">
        <table className="tournament-table team-details-table">
          <thead>
            <tr>
              <th>{t.tournamentName}</th>
              <th>{t.tournamentSeason}</th>
              <th>{t.tournamentCountry}</th>
              <th>{t.ratingBaseElo}</th>
              <th>{t.ratingForm}</th>
              <th>{t.ratingPerformance}</th>
              <th>{t.ratingSquad}</th>
              <th>{t.ratingFinal}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && contexts.map((context) => (
              <tr key={context.tournamentId}>
                <td><strong>{context.tournamentName}</strong></td>
                <td>{context.season || '-'}</td>
                <td>{context.country || '-'}</td>
                <td>{context.baseElo !== undefined ? context.baseElo.toFixed(2) : '-'}</td>
                <td>{context.formAdjustment !== undefined ? formatSigned(context.formAdjustment) : '-'}</td>
                <td>{context.performanceAdjustment !== undefined ? formatSigned(context.performanceAdjustment) : '-'}</td>
                <td>{context.squadQualityAdjustment !== undefined ? formatSigned(context.squadQualityAdjustment) : '-'}</td>
                <td>{context.finalRating !== undefined ? context.finalRating.toFixed(2) : '-'}</td>
                <td>
                  <button type="button" onClick={() => onOpenRatings(context.tournamentId)}>
                    {t.openRatings}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && contexts.length === 0 && (
              <tr>
                <td className="empty-table" colSpan={9}>{t.teamNoContexts}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
