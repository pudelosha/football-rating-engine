import { MenuIcon } from '../../../shared/components/Icons'
import type { SquadQualitySnapshot, TeamSummary, UserTeamContext } from '../../../shared/types'
import { formatDate, formatMoney } from '../../../shared/utils'
import { getLatestTeamContext, getLatestTeamSync } from '../model/teamsModel'
import type { TeamsTranslation } from '../types'

export function TeamOverviewPanel({
  contexts,
  squadSnapshot,
  t,
  team,
}: {
  contexts: UserTeamContext[]
  squadSnapshot: SquadQualitySnapshot | null
  t: TeamsTranslation
  team: TeamSummary | null
}) {
  const latestContext = getLatestTeamContext(contexts)
  const latestSync = getLatestTeamSync(contexts)
  const country = contexts.map((context) => context.country).filter(Boolean)[0] ?? '-'

  return (
    <section className="details-panel">
      <div className="details-panel-heading">
        <MenuIcon name="teams" />
        <h2>{t.teamOverview}</h2>
      </div>
      <div className="details-grid overview-grid team-overview-grid">
        <div><span>{t.teamName}</span><strong>{team?.name || '-'}</strong></div>
        <div><span>{t.abbreviation}</span><strong>{team?.abbreviation || '-'}</strong></div>
        <div><span>{t.tournamentCountry}</span><strong>{country}</strong></div>
        <div><span>{t.latestRating}</span><strong>{latestContext?.finalRating !== undefined ? latestContext.finalRating.toFixed(2) : '-'}</strong></div>
        <div><span>{t.latestSquadValue}</span><strong>{formatMoney(squadSnapshot?.totalMarketValueEur)}</strong></div>
        <div><span>{t.tournamentLastSync}</span><strong>{formatDate(latestSync, '-')}</strong></div>
      </div>
    </section>
  )
}
