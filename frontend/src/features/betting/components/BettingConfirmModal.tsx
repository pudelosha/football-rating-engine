import { createPortal } from 'react-dom'
import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingCandidate, PredictionOutcomeKey } from '../../../shared/types'
import { formatOdds, formatPercent, getTeamDisplayName } from '../../../shared/utils'
import type { BettingTranslation } from '../types'

export function BettingConfirmModal({
  candidate,
  pendingSelection,
  t,
  onCancel,
  onConfirm,
  onSelectionChange,
}: {
  candidate: BettingCandidate
  pendingSelection: PredictionOutcomeKey
  t: BettingTranslation
  onCancel: () => void
  onConfirm: () => void
  onSelectionChange: (selection: PredictionOutcomeKey) => void
}) {
  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="delete-modal betting-confirm-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="delete-modal-icon">
          <MenuIcon name="betting" />
        </div>
        <p className="eyebrow">{t.bettingConfirmBet}</p>
        <div className="betting-confirm-teams">
          <span>
            <small>{t.homeTeam}</small>
            <strong>{getTeamDisplayName(candidate.match, 'home')}</strong>
          </span>
          <span>
            <small>{t.awayTeam}</small>
            <strong>{getTeamDisplayName(candidate.match, 'away')}</strong>
          </span>
        </div>
        <div className="betting-segment-control" role="group" aria-label={t.bettingSelection}>
          {([
            ['home', t.homeWin, candidate.prediction.homeWin, candidate.prediction.homeFairOdds],
            ['draw', t.draw, candidate.prediction.draw, candidate.prediction.drawFairOdds],
            ['away', t.awayWin, candidate.prediction.awayWin, candidate.prediction.awayFairOdds],
          ] as const).map(([value, label, chance, odds]) => (
            <button
              type="button"
              className={pendingSelection === value ? 'active' : ''}
              onClick={() => onSelectionChange(value)}
              key={value}
            >
              <strong>{label}</strong>
              <b>{formatPercent(chance)}</b>
              <small>{formatOdds(odds)}</small>
            </button>
          ))}
        </div>
        <div className="delete-modal-actions">
          <button type="button" onClick={onCancel}>{t.cancel}</button>
          <button type="button" onClick={onConfirm}>{t.bettingAddToCoupon}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
