import type {
  BettingCandidate,
  BettingCoupon,
  BettingCouponStatus,
  BettingDrawRiskFilter,
  BettingLeanFilter,
  CombinedRatingsResponse,
  MatchSummary,
  TournamentDetails,
} from '../../../shared/types'
import {
  formatDate,
  getDrawRiskRank,
  getFavoriteOutcomeKey,
  getLeanRank,
  getOutcomeValue,
  getTeamDisplayName,
  isPredictableMatch,
  toRecordByTeamId,
} from '../../../shared/utils'
import { calculateCalibratedPrediction, getPredictionShape } from '../../../shared/utils/predictionModel'
import type { BettingTranslation } from '../types'

export function normalizeCouponStatus(status: BettingCouponStatus) {
  const value = String(status).toLowerCase()
  if (value === '1' || value === 'won') {
    return 'won'
  }
  if (value === '2' || value === 'lost') {
    return 'lost'
  }
  return 'pending'
}

export function formatCouponStatus(status: BettingCouponStatus, t: BettingTranslation) {
  const normalized = normalizeCouponStatus(status)
  if (normalized === 'won') {
    return t.bettingWon
  }
  if (normalized === 'lost') {
    return t.bettingLost
  }
  return t.bettingPending
}

export function getCouponGroups(coupons: BettingCoupon[]) {
  return {
    pendingCoupons: coupons.filter((coupon) => normalizeCouponStatus(coupon.status) === 'pending'),
    closedCoupons: coupons.filter((coupon) => normalizeCouponStatus(coupon.status) !== 'pending'),
  }
}

export function getBettingFilterOptions(t: BettingTranslation) {
  return {
    leanOptions: [
      { value: 'balanced', label: t.bettingBalancedLean },
      { value: 'slight', label: t.bettingSlightLean },
      { value: 'moderate', label: t.bettingModerateLean },
      { value: 'clear', label: t.bettingClearLean },
      { value: 'strong', label: t.bettingStrongLean },
      { value: 'heavy', label: t.bettingHeavyLean },
    ] as Array<{ value: BettingLeanFilter; label: string }>,
    drawOptions: [
      { value: 'very-low', label: t.bettingVeryLowDraw },
      { value: 'low', label: t.bettingLowDraw },
      { value: 'moderate', label: t.bettingModerateDraw },
      { value: 'high', label: t.bettingHighDraw },
      { value: 'very-high', label: t.bettingVeryHighDraw },
    ] as Array<{ value: BettingDrawRiskFilter; label: string }>,
  }
}

export function buildCandidates({
  tournament,
  matches,
  ratings,
  t,
}: {
  tournament: TournamentDetails
  matches: MatchSummary[]
  ratings: CombinedRatingsResponse
  t: BettingTranslation
}) {
  const predictionLabels = { home: t.homeWin, draw: t.draw, away: t.awayWin }
  const ratingsByTeamId = toRecordByTeamId(ratings.teams)

  return matches
    .filter(isPredictableMatch)
    .map((match): BettingCandidate | null => {
      if (!match.homeTeam || !match.awayTeam) {
        return null
      }

      const homeRating = ratingsByTeamId[match.homeTeam.id]
      const awayRating = ratingsByTeamId[match.awayTeam.id]
      if (!homeRating || !awayRating) {
        return null
      }

      const prediction = calculateCalibratedPrediction(homeRating, awayRating, tournament.applyHomeAdvantage, predictionLabels)
      const shape = getPredictionShape(prediction, t)
      const selectionKey = getFavoriteOutcomeKey(prediction)
      const selection = getOutcomeValue(prediction, selectionKey)

      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentSeason: tournament.season,
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
}

export function filterProposalCandidates({
  candidates,
  drawRiskFilters,
  endDate,
  leanFilters,
  startDate,
}: {
  candidates: BettingCandidate[]
  drawRiskFilters: BettingDrawRiskFilter[]
  endDate: Date
  leanFilters: BettingLeanFilter[]
  startDate: Date
}) {
  return candidates
    .filter((candidate) => {
      if (!candidate.match.kickoffUtc) {
        return false
      }

      const kickoff = new Date(candidate.match.kickoffUtc)
      return kickoff >= startDate && kickoff <= endDate
    })
    .filter((candidate) => leanFilters.includes(candidate.shape.shapeTone as BettingLeanFilter))
    .filter((candidate) => drawRiskFilters.includes(candidate.shape.riskTone as BettingDrawRiskFilter))
    .sort((left, right) => {
      const leftScore = left.selectionChance * 100 + getLeanRank(left.shape.shapeTone) * 4 - getDrawRiskRank(left.shape.riskTone) * 2
      const rightScore = right.selectionChance * 100 + getLeanRank(right.shape.shapeTone) * 4 - getDrawRiskRank(right.shape.riskTone) * 2
      return rightScore - leftScore
    })
    .slice(0, 10)
}

export function filterManualSearchCandidates(candidates: BettingCandidate[], search: string) {
  const normalizedSearch = search.trim().toLowerCase()
  if (!normalizedSearch) {
    return []
  }

  return candidates
    .filter((candidate) => [
      candidate.tournamentName,
      candidate.tournamentSeason,
      candidate.match.roundInfo,
      getTeamDisplayName(candidate.match, 'home'),
      getTeamDisplayName(candidate.match, 'away'),
      formatDate(candidate.match.kickoffUtc, ''),
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch)))
    .sort((left, right) => new Date(left.match.kickoffUtc || 0).getTime() - new Date(right.match.kickoffUtc || 0).getTime())
    .slice(0, 10)
}

export function toCouponPayload(stake: string, selectedMatches: BettingCandidate[]) {
  return {
    stake: Math.max(0, Number(stake) || 0),
    bets: selectedMatches.map((item) => ({
      matchId: item.match.id,
      selection: item.selectionKey === 'home' ? 0 : item.selectionKey === 'draw' ? 1 : 2,
      predictedChance: item.selectionChance,
      fairOdds: item.fairOdds,
      modelShape: item.shape.shape,
      drawRisk: item.shape.risk,
    })),
  }
}
