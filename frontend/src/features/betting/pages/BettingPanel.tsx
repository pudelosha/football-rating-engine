import { useCallback, useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type {
  BettingCandidate,
  BettingCoupon,
  BettingDrawRiskFilter,
  BettingLeanFilter,
} from '../../../shared/types'
import { getDefaultBettingRange } from '../../../shared/utils'
import { BettingCandidateTable } from '../components/BettingCandidateTable'
import { BettingCouponTable } from '../components/BettingCouponTable'
import { BettingSearchPanel } from '../components/BettingSearchPanel'
import { ManualSearchModal } from '../components/ManualSearchModal'
import { SelectedMatchesPanel } from '../components/SelectedMatchesPanel'
import {
  buildCandidates,
  filterManualSearchCandidates,
  filterProposalCandidates,
  getBettingFilterOptions,
  getCouponGroups,
  hasCandidateStarted,
  toCouponPayload,
} from '../model/bettingModel'
import {
  createCoupon as createCouponRequest,
  deleteCoupon as deleteCouponRequest,
  fetchCoupons,
  fetchTournamentCandidatePayload,
  fetchTournaments,
} from '../services/bettingService'
import type {
  BettingNavigationHandler,
  BettingToastHandler,
  BettingTranslation,
  BettingUser,
} from '../types'

export function BettingPanel({
  t,
  user,
  onToast,
  isCreating,
  onCreate,
  onBack,
}: {
  t: BettingTranslation
  user: BettingUser
  onToast: BettingToastHandler
  isCreating: boolean
  onCreate: BettingNavigationHandler
  onBack: BettingNavigationHandler
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

  const { leanOptions, drawOptions } = useMemo(() => getBettingFilterOptions(t), [t])

  const loadCoupons = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchCoupons(user.token)
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
    const tournamentsResult = await fetchTournaments(user.token)
    if (!tournamentsResult.ok || !tournamentsResult.data) {
      throw new Error(tournamentsResult.message || t.genericError)
    }

    const activeTournaments = tournamentsResult.data.filter((tournament) => tournament.isActive)
    const tournamentPayloads = await Promise.all(activeTournaments.map(async (tournament) => {
      const [detailsResult, matchesResult, ratingsResult] = await fetchTournamentCandidatePayload(user.token, tournament.id)

      if (!detailsResult.ok || !detailsResult.data || !matchesResult.ok || !matchesResult.data || !ratingsResult.ok || !ratingsResult.data) {
        return null
      }

      return buildCandidates({
        tournament: detailsResult.data,
        matches: matchesResult.data,
        ratings: ratingsResult.data,
        t,
      })
    }))

    return tournamentPayloads.flatMap((payload) => payload ?? [])
  }, [t, user.token])

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
      setProposedMatches(filterProposalCandidates({
        candidates,
        drawRiskFilters,
        endDate: end,
        leanFilters,
        startDate: start,
      }))
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCoupon = (candidate: BettingCandidate) => {
    if (hasCandidateStarted(candidate)) {
      return
    }

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

    if (selectedMatches.some(hasCandidateStarted)) {
      onToast(t.bettingCouponCreateFailed, 'error')
      return
    }

    setIsLoading(true)
    try {
      const result = await createCouponRequest(user.token, toCouponPayload(stake, selectedMatches))

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
      const result = await deleteCouponRequest(user.token, couponId)

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
  const { pendingCoupons, closedCoupons } = getCouponGroups(coupons)
  const manualSearchRows = filterManualSearchCandidates(allCandidates, manualSearch)

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
          <BettingListView
            closedCoupons={closedCoupons}
            pendingCoupons={pendingCoupons}
            t={t}
            onCreate={onCreate}
            onDeleteCoupon={deleteCoupon}
          />
        ) : (
          <BettingCreateView
            drawOptions={drawOptions}
            drawRiskFilters={drawRiskFilters}
            endDate={endDate}
            leanFilters={leanFilters}
            leanOptions={leanOptions}
            payout={payout}
            proposedMatches={proposedMatches}
            selectedMatches={selectedMatches}
            stake={stake}
            t={t}
            totalOdds={totalOdds}
            onAddToCoupon={addToCoupon}
            onBack={onBack}
            onCreateCoupon={createCoupon}
            onDrawRiskFiltersChange={setDrawRiskFilters}
            onEndDateChange={setEndDate}
            onGenerate={generateProposals}
            onLeanFiltersChange={setLeanFilters}
            onManualSearch={openManualSearch}
            onRemoveFromCoupon={removeFromCoupon}
            onStakeChange={setStake}
            onStartDateChange={setStartDate}
            startDate={startDate}
          />
        )}

        {isManualSearchOpen && (
          <ManualSearchModal
            candidates={manualSearchRows}
            manualSearch={manualSearch}
            selectedMatches={selectedMatches}
            t={t}
            onAdd={addToCoupon}
            onClose={() => setIsManualSearchOpen(false)}
            onManualSearchChange={setManualSearch}
            onRemove={removeFromCoupon}
          />
        )}
      </div>
    </section>
  )
}

function BettingListView({
  closedCoupons,
  pendingCoupons,
  t,
  onCreate,
  onDeleteCoupon,
}: {
  closedCoupons: BettingCoupon[]
  pendingCoupons: BettingCoupon[]
  t: BettingTranslation
  onCreate: BettingNavigationHandler
  onDeleteCoupon: (couponId: number) => void
}) {
  return (
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
        onDelete={onDeleteCoupon}
      />
      <BettingCouponTable
        t={t}
        title={t.bettingClosedCoupons}
        coupons={closedCoupons}
        emptyText={t.bettingNoClosedCoupons}
      />
    </>
  )
}

function BettingCreateView({
  drawOptions,
  drawRiskFilters,
  endDate,
  leanFilters,
  leanOptions,
  payout,
  proposedMatches,
  selectedMatches,
  stake,
  startDate,
  t,
  totalOdds,
  onAddToCoupon,
  onBack,
  onCreateCoupon,
  onDrawRiskFiltersChange,
  onEndDateChange,
  onGenerate,
  onLeanFiltersChange,
  onManualSearch,
  onRemoveFromCoupon,
  onStakeChange,
  onStartDateChange,
}: {
  drawOptions: Array<{ value: BettingDrawRiskFilter; label: string }>
  drawRiskFilters: BettingDrawRiskFilter[]
  endDate: string
  leanFilters: BettingLeanFilter[]
  leanOptions: Array<{ value: BettingLeanFilter; label: string }>
  payout: number
  proposedMatches: BettingCandidate[]
  selectedMatches: BettingCandidate[]
  stake: string
  startDate: string
  t: BettingTranslation
  totalOdds: number
  onAddToCoupon: (candidate: BettingCandidate) => void
  onBack: BettingNavigationHandler
  onCreateCoupon: () => void
  onDrawRiskFiltersChange: (filters: BettingDrawRiskFilter[]) => void
  onEndDateChange: (value: string) => void
  onGenerate: () => void
  onLeanFiltersChange: (filters: BettingLeanFilter[]) => void
  onManualSearch: () => void
  onRemoveFromCoupon: (matchId: number) => void
  onStakeChange: (value: string) => void
  onStartDateChange: (value: string) => void
}) {
  return (
    <>
      <div className="details-top-actions rating-top-actions">
        <button type="button" onClick={onBack}>
          <MenuIcon name="arrow-left" />
          <span>{t.bettingBackToCoupons}</span>
        </button>
      </div>

      <BettingSearchPanel
        drawOptions={drawOptions}
        drawRiskFilters={drawRiskFilters}
        endDate={endDate}
        leanFilters={leanFilters}
        leanOptions={leanOptions}
        startDate={startDate}
        t={t}
        onDrawRiskFiltersChange={onDrawRiskFiltersChange}
        onEndDateChange={onEndDateChange}
        onGenerate={onGenerate}
        onLeanFiltersChange={onLeanFiltersChange}
        onStartDateChange={onStartDateChange}
      />

      <section className="details-panel">
        <div className="details-panel-heading">
          <MenuIcon name="matches" />
          <h2>{t.bettingProposedMatches}</h2>
        </div>
        <BettingCandidateTable
          t={t}
          candidates={proposedMatches}
          selectedMatches={selectedMatches}
          onAdd={onAddToCoupon}
          onRemove={onRemoveFromCoupon}
        />
      </section>

      <SelectedMatchesPanel
        payout={payout}
        selectedMatches={selectedMatches}
        stake={stake}
        t={t}
        totalOdds={totalOdds}
        onCreateCoupon={onCreateCoupon}
        onManualSearch={onManualSearch}
        onRemove={onRemoveFromCoupon}
        onStakeChange={onStakeChange}
      />
    </>
  )
}
