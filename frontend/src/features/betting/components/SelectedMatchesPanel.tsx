import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingCandidate } from '../../../shared/types'
import { formatDate, formatOdds, formatPercent, getTeamDisplayName } from '../../../shared/utils'
import type { BettingTranslation } from '../types'

export function SelectedMatchesPanel({
  payout,
  selectedMatches,
  stake,
  t,
  totalOdds,
  onCreateCoupon,
  onManualSearch,
  onRemove,
  onStakeChange,
}: {
  payout: number
  selectedMatches: BettingCandidate[]
  stake: string
  t: BettingTranslation
  totalOdds: number
  onCreateCoupon: () => void
  onManualSearch: () => void
  onRemove: (matchId: number) => void
  onStakeChange: (value: string) => void
}) {
  return (
    <section className="details-panel">
      <div className="details-panel-heading spread betting-selected-heading">
        <div>
          <MenuIcon name="predictions" />
          <h2>{t.bettingSelectedMatches}</h2>
        </div>
        <div className="betting-selected-toolbar">
          <button type="button" onClick={onManualSearch}>
            <MenuIcon name="search" />
            <span>{t.bettingSearchManual}</span>
          </button>
        </div>
      </div>

      {selectedMatches.length > 0 ? (
        <div className="tournament-table-shell compact-table-shell">
          <table className="tournament-table betting-coupon-table">
            <thead>
              <tr>
                <th>{t.bettingKickoff}</th>
                <th>{t.bettingTournament}</th>
                <th>{t.homeTeam}</th>
                <th>{t.awayTeam}</th>
                <th>{t.bettingSelection}</th>
                <th>{t.bettingChance}</th>
                <th>{t.bettingFairOdds}</th>
                <th>{t.bettingModelShape}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {selectedMatches.map((item) => (
                <tr key={`${item.tournamentId}-${item.match.id}`}>
                  <td>{formatDate(item.match.kickoffUtc, '-')}</td>
                  <td>
                    <strong>{item.tournamentName}</strong>
                    <span>{item.tournamentSeason}</span>
                  </td>
                  <td>{getTeamDisplayName(item.match, 'home')}</td>
                  <td>{getTeamDisplayName(item.match, 'away')}</td>
                  <td><strong>{item.selectionLabel}</strong></td>
                  <td>{formatPercent(item.selectionChance)}</td>
                  <td>{formatOdds(item.fairOdds)}</td>
                  <td>
                    <strong>{item.shape.shape}</strong>
                    <span>{item.shape.risk}</span>
                  </td>
                  <td>
                    <button type="button" className="table-row-action danger" onClick={() => onRemove(item.match.id)}>{t.bettingRemoveFromCoupon}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="delete-modal-target betting-empty-state">
          <strong>{t.bettingNoSelectedMatches}</strong>
        </div>
      )}
      <div className="betting-coupon-footer">
        <div className="betting-coupon-summary">
          <label className="betting-stake-control">
            <span>{t.bettingStake}</span>
            <input type="number" min="0" step="0.01" value={stake} onChange={(event) => onStakeChange(event.target.value)} />
          </label>
          <span><small>{t.bettingTotalOdds}</small><strong>{formatOdds(totalOdds)}</strong></span>
          <span><small>{t.bettingPotentialPayout}</small><strong>{payout.toFixed(2)}</strong></span>
        </div>
        <button type="button" className="betting-generate-button" onClick={onCreateCoupon}>{t.bettingSaveCoupon}</button>
      </div>
    </section>
  )
}
