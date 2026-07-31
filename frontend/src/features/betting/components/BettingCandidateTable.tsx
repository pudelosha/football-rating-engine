import { useState } from 'react'
import type { BettingCandidate, BettingCandidateSortKey, PredictionOutcomeKey, SortDirection } from '../../../shared/types'
import { compareText, formatDate, formatOdds, formatPercent, getTeamDisplayName, withBettingSelection } from '../../../shared/utils'
import type { BettingTranslation } from '../types'
import { hasCandidateStarted } from '../model/bettingModel'
import { BettingConfirmModal } from './BettingConfirmModal'

export function BettingCandidateTable({
  t,
  candidates,
  selectedMatches,
  onAdd,
  onRemove,
}: {
  t: BettingTranslation
  candidates: BettingCandidate[]
  selectedMatches: BettingCandidate[]
  onAdd: (candidate: BettingCandidate) => void
  onRemove: (matchId: number) => void
}) {
  const [sortKey, setSortKey] = useState<BettingCandidateSortKey>('kickoff')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [pendingCandidate, setPendingCandidate] = useState<BettingCandidate | null>(null)
  const [pendingSelection, setPendingSelection] = useState<PredictionOutcomeKey>('home')
  const selectedIds = new Set(selectedMatches.map((item) => item.match.id))

  const openConfirm = (candidate: BettingCandidate) => {
    setPendingCandidate(candidate)
    setPendingSelection(candidate.selectionKey)
  }

  const confirmSelection = () => {
    if (!pendingCandidate) {
      return
    }

    onAdd(withBettingSelection(pendingCandidate, pendingSelection, t))
    setPendingCandidate(null)
  }

  const requestSort = (key: BettingCandidateSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'chance' ? 'desc' : 'asc')
  }

  const sortedCandidates = [...candidates].sort((left, right) => {
    let comparison = 0
    if (sortKey === 'kickoff') {
      comparison = new Date(left.match.kickoffUtc || 0).getTime() - new Date(right.match.kickoffUtc || 0).getTime()
    } else if (sortKey === 'tournament') {
      comparison = compareText(left.tournamentName, right.tournamentName)
    } else if (sortKey === 'home') {
      comparison = compareText(getTeamDisplayName(left.match, 'home'), getTeamDisplayName(right.match, 'home'))
    } else if (sortKey === 'away') {
      comparison = compareText(getTeamDisplayName(left.match, 'away'), getTeamDisplayName(right.match, 'away'))
    } else if (sortKey === 'selection') {
      comparison = compareText(left.selectionLabel, right.selectionLabel)
    } else if (sortKey === 'chance') {
      comparison = left.selectionChance - right.selectionChance
    } else if (sortKey === 'odds') {
      comparison = left.fairOdds - right.fairOdds
    } else if (sortKey === 'shape') {
      comparison = compareText(left.shape.shape, right.shape.shape)
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })
  const headers: Array<{ key: BettingCandidateSortKey; label: string }> = [
    { key: 'kickoff', label: t.bettingKickoff },
    { key: 'tournament', label: t.bettingTournament },
    { key: 'home', label: t.homeTeam },
    { key: 'away', label: t.awayTeam },
    { key: 'selection', label: t.bettingSelection },
    { key: 'chance', label: t.bettingChance },
    { key: 'odds', label: t.bettingFairOdds },
    { key: 'shape', label: t.bettingModelShape },
  ]

  if (candidates.length === 0) {
    return (
      <div className="delete-modal-target betting-empty-state">
        <strong>{t.bettingNoCoupon}</strong>
      </div>
    )
  }

  return (
    <div className="tournament-table-shell compact-table-shell">
      <table className="tournament-table betting-coupon-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header.key}>
                <button
                  className="table-sort-button"
                  type="button"
                  aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => requestSort(header.key)}
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
          {sortedCandidates.map((item) => {
            const isSelected = selectedIds.has(item.match.id)
            const hasStarted = hasCandidateStarted(item)
            return (
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
                  <button
                    type="button"
                    className={isSelected ? 'table-row-action subtle' : 'table-row-action'}
                    disabled={hasStarted && !isSelected}
                    onClick={() => isSelected ? onRemove(item.match.id) : openConfirm(item)}
                  >
                    {isSelected ? t.bettingRemoveFromCoupon : hasStarted ? t.bettingLocked : t.bettingAddToCoupon}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {pendingCandidate && (
        <BettingConfirmModal
          candidate={pendingCandidate}
          pendingSelection={pendingSelection}
          t={t}
          onCancel={() => setPendingCandidate(null)}
          onConfirm={confirmSelection}
          onSelectionChange={setPendingSelection}
        />
      )}
    </div>
  )
}
