import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingCandidate } from '../../../shared/types'
import { BettingCandidateTable } from './BettingCandidateTable'
import type { BettingTranslation } from '../types'

export function ManualSearchModal({
  candidates,
  manualSearch,
  selectedMatches,
  t,
  onAdd,
  onClose,
  onManualSearchChange,
  onRemove,
}: {
  candidates: BettingCandidate[]
  manualSearch: string
  selectedMatches: BettingCandidate[]
  t: BettingTranslation
  onAdd: (candidate: BettingCandidate) => void
  onClose: () => void
  onManualSearchChange: (value: string) => void
  onRemove: (matchId: number) => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="delete-modal betting-search-modal">
        <button
          type="button"
          className="modal-close-button"
          aria-label={t.cancel}
          onClick={onClose}
        >
          x
        </button>
        <div className="delete-modal-icon">
          <MenuIcon name="matches" />
        </div>
        <p className="eyebrow">{t.bettingSearchManual}</p>
        <h2>{t.bettingManualSearchTitle}</h2>
        <p>{t.bettingManualSearchCopy}</p>
        <input
          className="betting-manual-search"
          type="search"
          value={manualSearch}
          placeholder={t.bettingManualSearchPlaceholder}
          onChange={(event) => onManualSearchChange(event.target.value)}
        />
        <p className="betting-manual-note">{t.bettingManualSearchLimitNote}</p>
        {manualSearch.trim() && (
          <BettingCandidateTable
            t={t}
            candidates={candidates}
            selectedMatches={selectedMatches}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        )}
        <div className="delete-modal-actions">
          <button type="button" onClick={onClose}>{t.cancel}</button>
        </div>
      </div>
    </div>
  )
}
