import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { authorizedRequest } from '../../../shared/api/httpClient'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import { translations } from '../../../i18n'
import type {
  AuthUser,
  BettingCandidate,
  BettingCandidateSortKey,
  BettingCoupon,
  BettingCouponStatus,
  BettingDrawRiskFilter,
  BettingLeanFilter,
  CombinedRatingsResponse,
  Language,
  MatchSummary,
  PredictionOutcomeKey,
  SortDirection,
  ToastTone,
  TournamentDetails,
  TournamentSummary,
} from '../../../shared/types'
import {
  compareText,
  formatDate,
  formatOdds,
  formatPercent,
  getDefaultBettingRange,
  getDrawRiskRank,
  getFavoriteOutcomeKey,
  getLeanRank,
  getOutcomeValue,
  getTeamDisplayName,
  isPredictableMatch,
  toRecordByTeamId,
  withBettingSelection,
} from '../../../shared/utils'
import { calculateCalibratedPrediction, getPredictionShape } from '../../../shared/utils/predictionModel'
function BettingMultiSelect<TValue extends string>({
  label,
  emptyLabel,
  selectedCountLabel,
  options,
  selectedValues,
  onChange,
}: {
  label: string
  emptyLabel: string
  selectedCountLabel: string
  options: Array<{ value: TValue; label: string }>
  selectedValues: TValue[]
  onChange: (values: TValue[]) => void
}) {
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label)
  const summary = selectedLabels.length <= 2
    ? selectedLabels.join(', ') || emptyLabel
    : `${selectedLabels.length} ${selectedCountLabel}`

  const toggleValue = (value: TValue) => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    )
  }

  return (
    <div className="betting-multi-field">
      <span>{label}</span>
      <details className="betting-multi-select">
        <summary>
          <span>{summary}</span>
          <i aria-hidden="true" />
        </summary>
        <div className="betting-multi-options">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <button
                type="button"
                className={isSelected ? 'active' : ''}
                onClick={() => toggleValue(option.value)}
                key={option.value}
              >
                <b aria-hidden="true">{isSelected ? 'Ă˘Ĺ›â€ś' : ''}</b>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </details>
    </div>
  )
}

export function BettingPanel({
  t,
  user,
  onToast,
  isCreating,
  onCreate,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  isCreating: boolean
  onCreate: () => void
  onBack: () => void
}) {
  const defaultRange = useMemo(getDefaultBettingRange, [])
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const [leanFilters, setLeanFilters] = useState<BettingLeanFilter[]>(['strong', 'heavy'])
  const [drawRiskFilters, setDrawRiskFilters] = useState<BettingDrawRiskFilter[]>(['very-low', 'low', 'moderate'])
  const [stake, setStake] = useState('10')
  const [coupons, setCoupons] = useState<BettingCoupon[]>([])
  const [proposedMatches, setProposedMatches] = useState<BettingCandidate[]>([])
  const [selectedMatches, setSelectedMatches] = useState<BettingCandidate[]>([])
  const [manualSearch, setManualSearch] = useState('')
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [allCandidates, setAllCandidates] = useState<BettingCandidate[]>([])

  const predictionLabels = { home: t.homeWin, draw: t.draw, away: t.awayWin }

  const loadCoupons = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await authorizedRequest<BettingCoupon[]>(user.token, '/api/betting/coupons')
      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setCoupons(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [onToast, t.genericError, user.token])

  const loadCandidates = useCallback(async () => {
    const tournamentsResult = await authorizedRequest<TournamentSummary[]>(user.token, '/api/tournaments')
    if (!tournamentsResult.ok || !tournamentsResult.data) {
      throw new Error(tournamentsResult.message || t.genericError)
    }

    const activeTournaments = tournamentsResult.data.filter((tournament) => tournament.isActive)
    const tournamentPayloads = await Promise.all(activeTournaments.map(async (tournament) => {
      const [detailsResult, matchesResult, ratingsResult] = await Promise.all([
        authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournament.id}`),
        authorizedRequest<MatchSummary[]>(user.token, `/api/tournaments/${tournament.id}/matches`),
        authorizedRequest<CombinedRatingsResponse>(user.token, `/api/tournaments/${tournament.id}/ratings/combined/teams`),
      ])

      if (!detailsResult.ok || !detailsResult.data || !matchesResult.ok || !matchesResult.data || !ratingsResult.ok || !ratingsResult.data) {
        return null
      }

      return {
        tournament: detailsResult.data,
        matches: matchesResult.data,
        ratingsByTeamId: toRecordByTeamId(ratingsResult.data.teams),
      }
    }))

    return tournamentPayloads.flatMap((payload) => {
      if (!payload) {
        return []
      }

      return payload.matches
        .filter(isPredictableMatch)
        .map((match): BettingCandidate | null => {
          if (!match.homeTeam || !match.awayTeam) {
            return null
          }

          const homeRating = payload.ratingsByTeamId[match.homeTeam.id]
          const awayRating = payload.ratingsByTeamId[match.awayTeam.id]
          if (!homeRating || !awayRating) {
            return null
          }

          const prediction = calculateCalibratedPrediction(homeRating, awayRating, payload.tournament.applyHomeAdvantage, predictionLabels)
          const shape = getPredictionShape(prediction, t)
          const selectionKey = getFavoriteOutcomeKey(prediction)
          const selection = getOutcomeValue(prediction, selectionKey)

          return {
            tournamentId: payload.tournament.id,
            tournamentName: payload.tournament.name,
            tournamentSeason: payload.tournament.season,
            match,
            prediction,
            shape,
            selectionKey,
            selectionLabel: selectionKey === 'home' ? t.homeWin : selectionKey === 'away' ? t.awayWin : t.draw,
            selectionChance: selection.chance,
            fairOdds: selection.odds,
          }
        })
        .filter((candidate): candidate is BettingCandidate => Boolean(candidate))
    })
  }, [predictionLabels, t, user.token])

  useEffect(() => {
    void loadCoupons()
  }, [loadCoupons])

  const generateProposals = async () => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsLoading(true)
    try {
      const candidates = await loadCandidates()
      setAllCandidates(candidates)
      const filteredCandidates = candidates
        .filter((candidate) => {
          if (!candidate.match.kickoffUtc) {
            return false
          }

          const kickoff = new Date(candidate.match.kickoffUtc)
          return kickoff >= start && kickoff <= end
        })
        .filter((candidate) => leanFilters.includes(candidate.shape.shapeTone as BettingLeanFilter))
        .filter((candidate) => drawRiskFilters.includes(candidate.shape.riskTone as BettingDrawRiskFilter))
        .sort((left, right) => {
          const leftScore = left.selectionChance * 100 + getLeanRank(left.shape.shapeTone) * 4 - getDrawRiskRank(left.shape.riskTone) * 2
          const rightScore = right.selectionChance * 100 + getLeanRank(right.shape.shapeTone) * 4 - getDrawRiskRank(right.shape.riskTone) * 2
          return rightScore - leftScore
        })
        .slice(0, 10)

      setProposedMatches(filteredCandidates)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCoupon = (candidate: BettingCandidate) => {
    setSelectedMatches((current) => current.some((item) => item.match.id === candidate.match.id) || current.length >= 20
      ? current
      : [...current, candidate])
  }

  const removeFromCoupon = (matchId: number) => {
    setSelectedMatches((current) => current.filter((item) => item.match.id !== matchId))
  }

  const createCoupon = async () => {
    if (selectedMatches.length === 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsLoading(true)
    try {
      const result = await authorizedRequest<BettingCoupon>(user.token, '/api/betting/coupons', {
        method: 'POST',
        body: JSON.stringify({
          stake: Math.max(0, Number(stake) || 0),
          bets: selectedMatches.map((item) => ({
            matchId: item.match.id,
            selection: item.selectionKey === 'home' ? 0 : item.selectionKey === 'draw' ? 1 : 2,
            predictedChance: item.selectionChance,
            fairOdds: item.fairOdds,
            modelShape: item.shape.shape,
            drawRisk: item.shape.risk,
          })),
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.bettingCouponCreateFailed, 'error')
        return
      }

      setCoupons((current) => [result.data!, ...current])
      setSelectedMatches([])
      setProposedMatches([])
      onBack()
      onToast(t.bettingCouponCreated, 'success')
    } catch {
      onToast(t.bettingCouponCreateFailed, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCoupon = async (couponId: number) => {
    setIsLoading(true)
    try {
      const result = await authorizedRequest(user.token, `/api/betting/coupons/${couponId}`, {
        method: 'DELETE',
      })

      if (!result.ok) {
        onToast(result.message || t.bettingCouponDeleteFailed, 'error')
        return
      }

      setCoupons((current) => current.filter((coupon) => coupon.id !== couponId))
      onToast(t.bettingCouponDeleted, 'success')
    } catch {
      onToast(t.bettingCouponDeleteFailed, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const openManualSearch = async () => {
    setIsManualSearchOpen(true)
    if (allCandidates.length > 0) {
      return
    }

    setIsLoading(true)
    try {
      setAllCandidates(await loadCandidates())
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const totalOdds = selectedMatches.reduce((total, item) => total * item.fairOdds, selectedMatches.length > 0 ? 1 : 0)
  const stakeValue = Math.max(0, Number(stake) || 0)
  const payout = totalOdds * stakeValue
  const pendingCoupons = coupons.filter((coupon) => normalizeCouponStatus(coupon.status) === 'pending')
  const closedCoupons = coupons.filter((coupon) => normalizeCouponStatus(coupon.status) !== 'pending')
  const normalizedManualSearch = manualSearch.trim().toLowerCase()
  const manualSearchRows = allCandidates
    .filter((candidate) => {
      if (!normalizedManualSearch) {
        return false
      }

      return [
        candidate.tournamentName,
        candidate.tournamentSeason,
        candidate.match.roundInfo,
        getTeamDisplayName(candidate.match, 'home'),
        getTeamDisplayName(candidate.match, 'away'),
        formatDate(candidate.match.kickoffUtc, ''),
      ].some((value) => (value ?? '').toLowerCase().includes(normalizedManualSearch))
    })
    .sort((left, right) => new Date(left.match.kickoffUtc || 0).getTime() - new Date(right.match.kickoffUtc || 0).getTime())
    .slice(0, 10)

  const leanOptions: Array<{ value: BettingLeanFilter; label: string }> = [
    { value: 'balanced', label: t.bettingBalancedLean },
    { value: 'slight', label: t.bettingSlightLean },
    { value: 'moderate', label: t.bettingModerateLean },
    { value: 'clear', label: t.bettingClearLean },
    { value: 'strong', label: t.bettingStrongLean },
    { value: 'heavy', label: t.bettingHeavyLean },
  ]
  const drawOptions: Array<{ value: BettingDrawRiskFilter; label: string }> = [
    { value: 'very-low', label: t.bettingVeryLowDraw },
    { value: 'low', label: t.bettingLowDraw },
    { value: 'moderate', label: t.bettingModerateDraw },
    { value: 'high', label: t.bettingHighDraw },
    { value: 'very-high', label: t.bettingVeryHighDraw },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout betting-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.bettingPanelEyebrow}</p>
          <h1>{isCreating ? t.bettingCreateCoupon : t.bettingPanelTitle}</h1>
          <p>{t.bettingPanelCopy}</p>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {!isCreating ? (
          <>
            <div className="details-top-actions rating-top-actions">
              <button type="button" className="positive-action-button" onClick={onCreate}>
                {t.bettingCreateCoupon}
              </button>
            </div>
            <BettingCouponTable
              t={t}
              title={t.bettingPendingCoupons}
              coupons={pendingCoupons}
              emptyText={t.bettingNoPendingCoupons}
              filterable
              onDelete={deleteCoupon}
            />
            <BettingCouponTable t={t} title={t.bettingClosedCoupons} coupons={closedCoupons} emptyText={t.bettingNoClosedCoupons} />
          </>
        ) : (
          <>
            <div className="details-top-actions rating-top-actions">
              <button type="button" onClick={onBack}>
                <MenuIcon name="arrow-left" />
                <span>{t.bettingBackToCoupons}</span>
              </button>
            </div>

        <section className="details-panel betting-generator-panel">
          <div className="details-panel-heading">
            <MenuIcon name="betting" />
            <h2>{t.bettingCreateTitle}</h2>
          </div>
          <p className="panel-muted-copy">{t.bettingCreateCopy}</p>
          <div className="betting-form-grid">
            <label>
              <span>{t.bettingWindowStart}</span>
              <input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              <span>{t.bettingWindowEnd}</span>
              <input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <BettingMultiSelect
              label={t.bettingLeanLevel}
              emptyLabel={t.bettingNoneSelected}
              selectedCountLabel={t.bettingSelectedCount}
              options={leanOptions}
              selectedValues={leanFilters}
              onChange={setLeanFilters}
            />
            <BettingMultiSelect
              label={t.bettingDrawRiskLevel}
              emptyLabel={t.bettingNoneSelected}
              selectedCountLabel={t.bettingSelectedCount}
              options={drawOptions}
              selectedValues={drawRiskFilters}
              onChange={setDrawRiskFilters}
            />
          </div>
          <button type="button" className="betting-generate-button" onClick={generateProposals}>
            {t.bettingGenerate}
          </button>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="matches" />
            <h2>{t.bettingProposedMatches}</h2>
          </div>
          <BettingCandidateTable
            t={t}
            candidates={proposedMatches}
            selectedMatches={selectedMatches}
            onAdd={addToCoupon}
            onRemove={removeFromCoupon}
          />
        </section>

        <section className="details-panel">
          <div className="details-panel-heading spread betting-selected-heading">
            <div>
              <MenuIcon name="predictions" />
              <h2>{t.bettingSelectedMatches}</h2>
            </div>
            <div className="betting-selected-toolbar">
              <button type="button" onClick={openManualSearch}>
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
                        <button type="button" className="table-row-action danger" onClick={() => removeFromCoupon(item.match.id)}>{t.bettingRemoveFromCoupon}</button>
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
                <input type="number" min="0" step="0.01" value={stake} onChange={(event) => setStake(event.target.value)} />
              </label>
              <span><small>{t.bettingTotalOdds}</small><strong>{formatOdds(totalOdds)}</strong></span>
              <span><small>{t.bettingPotentialPayout}</small><strong>{payout.toFixed(2)}</strong></span>
            </div>
            <button type="button" className="betting-generate-button" onClick={createCoupon}>{t.bettingSaveCoupon}</button>
          </div>
        </section>

        {isManualSearchOpen && (
          <div className="modal-backdrop">
            <div className="delete-modal betting-search-modal">
              <button
                type="button"
                className="modal-close-button"
                aria-label={t.cancel}
                onClick={() => setIsManualSearchOpen(false)}
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
                onChange={(event) => setManualSearch(event.target.value)}
              />
              <p className="betting-manual-note">{t.bettingManualSearchLimitNote}</p>
              {normalizedManualSearch && (
                <BettingCandidateTable
                  t={t}
                  candidates={manualSearchRows}
                  selectedMatches={selectedMatches}
                  onAdd={addToCoupon}
                  onRemove={removeFromCoupon}
                />
              )}
              <div className="delete-modal-actions">
                <button type="button" onClick={() => setIsManualSearchOpen(false)}>{t.cancel}</button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </section>
  )
}

function BettingCandidateTable({
  t,
  candidates,
  selectedMatches,
  onAdd,
  onRemove,
}: {
  t: (typeof translations)[Language]
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
  const confirmModal = pendingCandidate ? createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => setPendingCandidate(null)}>
      <div className="delete-modal betting-confirm-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="delete-modal-icon">
          <MenuIcon name="betting" />
        </div>
        <p className="eyebrow">{t.bettingConfirmBet}</p>
        <div className="betting-confirm-teams">
          <span>
            <small>{t.homeTeam}</small>
            <strong>{getTeamDisplayName(pendingCandidate.match, 'home')}</strong>
          </span>
          <span>
            <small>{t.awayTeam}</small>
            <strong>{getTeamDisplayName(pendingCandidate.match, 'away')}</strong>
          </span>
        </div>
        <div className="betting-segment-control" role="group" aria-label={t.bettingSelection}>
          {([
            ['home', t.homeWin, pendingCandidate.prediction.homeWin, pendingCandidate.prediction.homeFairOdds],
            ['draw', t.draw, pendingCandidate.prediction.draw, pendingCandidate.prediction.drawFairOdds],
            ['away', t.awayWin, pendingCandidate.prediction.awayWin, pendingCandidate.prediction.awayFairOdds],
          ] as const).map(([value, label, chance, odds]) => (
            <button
              type="button"
              className={pendingSelection === value ? 'active' : ''}
              onClick={() => setPendingSelection(value)}
              key={value}
            >
              <strong>{label}</strong>
              <b>{formatPercent(chance)}</b>
              <small>{formatOdds(odds)}</small>
            </button>
          ))}
        </div>
        <div className="delete-modal-actions">
          <button type="button" onClick={() => setPendingCandidate(null)}>{t.cancel}</button>
          <button type="button" onClick={confirmSelection}>{t.bettingAddToCoupon}</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null

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
                    onClick={() => isSelected ? onRemove(item.match.id) : openConfirm(item)}
                  >
                    {isSelected ? t.bettingRemoveFromCoupon : t.bettingAddToCoupon}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {confirmModal}
    </div>
  )
}

function BettingCouponTable({
  t,
  title,
  coupons,
  emptyText,
  filterable = false,
  onDelete,
}: {
  t: (typeof translations)[Language]
  title: string
  coupons: BettingCoupon[]
  emptyText: string
  filterable?: boolean
  onDelete?: (couponId: number) => void
}) {
  const [search, setSearch] = useState('')
  const filteredCoupons = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) {
      return coupons
    }

    return coupons.filter((coupon) => [
      `#${coupon.id}`,
      coupon.id.toString(),
      formatDate(coupon.createdAtUtc, ''),
      formatCouponStatus(coupon.status, t),
      ...coupon.bets.flatMap((bet) => [
        bet.tournamentName,
        bet.tournamentSeason,
        bet.homeTeamName,
        bet.awayTeamName,
        bet.roundInfo,
      ]),
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch)))
  }, [coupons, search, t])

  return (
    <section className="details-panel">
      <div className="details-panel-heading spread">
        <div>
          <MenuIcon name="betting" />
          <h2>{title}</h2>
        </div>
        {filterable && (
          <label className="tournament-search compact betting-coupon-search">
            <span>{t.bettingSearchCoupons}</span>
            <input
              placeholder={t.bettingSearchCouponsPlaceholder}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        )}
      </div>
      {filteredCoupons.length > 0 ? (
        <div className="tournament-table-shell compact-table-shell">
          <table className="tournament-table betting-coupon-table">
            <thead>
              <tr>
                <th>{t.bettingCouponId}</th>
                <th>{t.bettingBetCount}</th>
                <th>{t.bettingBets}</th>
                <th>{t.bettingTotalOdds}</th>
                <th>{t.bettingStake}</th>
                <th>{t.bettingPotentialPayout}</th>
                <th>{t.bettingCreated}</th>
                <th>{t.bettingResult}</th>
                {onDelete && <th aria-label={t.delete}></th>}
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td><strong>#{coupon.id}</strong></td>
                  <td><strong>{coupon.bets.length}</strong></td>
                  <td>
                    <span className="coupon-bet-list">
                      {coupon.bets.map((bet) => (
                        <b key={bet.id}>{bet.homeTeamName} - {bet.awayTeamName}</b>
                      ))}
                    </span>
                  </td>
                  <td>{formatOdds(coupon.totalOdds)}</td>
                  <td>{coupon.stake.toFixed(2)}</td>
                  <td>{coupon.potentialPayout.toFixed(2)}</td>
                  <td>{formatDate(coupon.createdAtUtc, '-')}</td>
                  <td><span className={`coupon-status ${normalizeCouponStatus(coupon.status)}`}>{formatCouponStatus(coupon.status, t)}</span></td>
                  {onDelete && (
                    <td>
                      <button
                        type="button"
                        className="coupon-delete-button"
                        aria-label={`${t.delete} #${coupon.id}`}
                        title={`${t.delete} #${coupon.id}`}
                        onClick={() => onDelete(coupon.id)}
                      >
                        <MenuIcon name="trash" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="delete-modal-target betting-empty-state">
          <strong>{coupons.length === 0 ? emptyText : t.bettingNoCoupon}</strong>
        </div>
      )}
    </section>
  )
}

function normalizeCouponStatus(status: BettingCouponStatus) {
  const value = String(status).toLowerCase()
  if (value === '1' || value === 'won') {
    return 'won'
  }
  if (value === '2' || value === 'lost') {
    return 'lost'
  }
  return 'pending'
}

function formatCouponStatus(status: BettingCouponStatus, t: (typeof translations)[Language]) {
  const normalized = normalizeCouponStatus(status)
  if (normalized === 'won') {
    return t.bettingWon
  }
  if (normalized === 'lost') {
    return t.bettingLost
  }
  return t.bettingPending
}
