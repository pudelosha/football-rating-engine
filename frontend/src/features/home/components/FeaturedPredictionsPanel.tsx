import { MenuIcon } from '../../../shared/components/Icons'
import type { FeaturedPredictionRow, HomeCopy, HomeNavigateHandler, HomeTranslation } from '../types'

export function FeaturedPredictionsPanel({
  copy,
  rows,
  t,
  onNavigate,
}: {
  copy: HomeCopy
  rows: FeaturedPredictionRow[]
  t: HomeTranslation
  onNavigate: HomeNavigateHandler
}) {
  return (
    <section className="details-panel home-table-panel">
      <div className="details-panel-heading split">
        <div>
          <MenuIcon name="predictions" />
          <h2>{copy.featuredPredictions}</h2>
        </div>
        <button type="button" onClick={() => onNavigate('predictions')}>{copy.openPredictions}</button>
      </div>
      <div className="home-table-shell">
        <table className="tournament-table home-table">
          <thead>
            <tr>
              <th>{t.kickoff}</th>
              <th>{t.bettingTournament}</th>
              <th>{t.homeTeam}</th>
              <th>{t.awayTeam}</th>
              <th>{t.predictedOutcome}</th>
              <th>{t.bettingChance}</th>
              <th>{t.bettingDrawRiskLevel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.tournament}-${row.home}-${row.away}`}>
                <td>{row.time}</td>
                <td>{row.tournament}</td>
                <td>{row.home}</td>
                <td>{row.away}</td>
                <td><strong>{row.outcome}</strong></td>
                <td>{row.chance}</td>
                <td>{row.drawRisk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
