import type {
  MatchPrediction,
  MatchSummary,
  MiniBarTooltipRow,
  PredictionMatchSortKey,
  SortDirection,
  TournamentSortKey,
  TournamentSummary,
} from '../../../shared/types'
import {
  compareText,
  formatDate,
  formatOdds,
  formatPercent,
  formatSigned,
  getTeamDisplayName,
  isPredictableMatch,
} from '../../../shared/utils'
import { calculatePrediction } from '../../../shared/utils/predictionModel'
import type { PredictionsTranslation } from '../types'

export function getAgreementLabel(ratio: number, t: PredictionsTranslation) {
  if (ratio >= 0.85) {
    return t.agreementVeryStrong
  }

  if (ratio >= 0.7) {
    return t.agreementStrong
  }

  if (ratio >= 0.55) {
    return t.agreementModerate
  }

  if (ratio >= 0.4) {
    return t.agreementFragile
  }

  return t.agreementConflicted
}

export function buildRatingScenarioMetricBars(
  prediction: MatchPrediction,
  homeRating: number,
  awayRating: number,
  homeAdvantage: number,
  t: PredictionsTranslation,
): Record<'home' | 'draw' | 'away', MiniBarTooltipRow[]> {
  const baseRows = [
    { label: t.scenarioHomeRating, value: homeRating.toFixed(2) },
    { label: t.scenarioAwayRating, value: awayRating.toFixed(2) },
    { label: t.homeAdvantageValue, value: homeAdvantage === 0 ? t.neutralGround : formatSigned(homeAdvantage) },
    { label: t.ratingGap, value: formatSigned(prediction.ratingGap) },
  ]

  return {
    home: [
      { label: t.homeWin, value: formatPercent(prediction.homeWin) },
      { label: t.fairOdds, value: formatOdds(prediction.homeFairOdds) },
      ...baseRows,
    ],
    draw: [
      { label: t.draw, value: formatPercent(prediction.draw) },
      { label: t.fairOdds, value: formatOdds(prediction.drawFairOdds) },
      ...baseRows,
    ],
    away: [
      { label: t.awayWin, value: formatPercent(prediction.awayWin) },
      { label: t.fairOdds, value: formatOdds(prediction.awayFairOdds) },
      ...baseRows,
    ],
  }
}

export function getPredictionSurfaceGradient(prediction: MatchPrediction, intensity = 1) {
  const homeStop = prediction.homeWin * 100
  const drawStop = homeStop + prediction.draw * 100
  const homeCenter = homeStop / 2
  const drawCenter = homeStop + prediction.draw * 50
  const awayCenter = drawStop + prediction.awayWin * 50
  const alpha = (value: number) => Math.min(1, value * intensity).toFixed(3)

  return [
    `radial-gradient(circle at ${homeCenter}% 50%, rgba(176, 216, 107, ${alpha(0.34)}), rgba(176, 216, 107, ${alpha(0.16)}) 34%, transparent 64%)`,
    `radial-gradient(circle at ${drawCenter}% 50%, rgba(228, 206, 107, ${alpha(0.28)}), rgba(228, 206, 107, ${alpha(0.13)}) 28%, transparent 58%)`,
    `radial-gradient(circle at ${awayCenter}% 50%, rgba(96, 132, 158, ${alpha(0.32)}), rgba(96, 132, 158, ${alpha(0.15)}) 30%, transparent 60%)`,
    `linear-gradient(90deg, rgba(176, 216, 107, ${alpha(0.08)}) 0%, rgba(255, 255, 255, ${alpha(0.045)}) ${homeStop}%, rgba(228, 206, 107, ${alpha(0.055)}) ${homeStop}%, rgba(255, 255, 255, ${alpha(0.045)}) ${drawStop}%, rgba(96, 132, 158, ${alpha(0.10)}) 100%)`,
    'rgba(255, 255, 255, 0.07)',
  ].join(', ')
}

export function getPredictionSummaryGradient(prediction: MatchPrediction) {
  const winner = prediction.homeWin >= prediction.awayWin && prediction.homeWin >= prediction.draw
    ? 'home'
    : prediction.awayWin >= prediction.homeWin && prediction.awayWin >= prediction.draw
      ? 'away'
      : 'draw'

  if (winner === 'home') {
    return [
      'radial-gradient(circle at 18% 50%, rgba(176, 216, 107, 0.20), transparent 52%)',
      'linear-gradient(90deg, rgba(176, 216, 107, 0.20) 0%, rgba(176, 216, 107, 0.10) 38%, rgba(255, 255, 255, 0.035) 100%)',
      'rgba(255, 255, 255, 0.055)',
    ].join(', ')
  }

  if (winner === 'away') {
    return [
      'radial-gradient(circle at 82% 50%, rgba(96, 132, 158, 0.22), transparent 52%)',
      'linear-gradient(90deg, rgba(255, 255, 255, 0.035) 0%, rgba(96, 132, 158, 0.09) 58%, rgba(96, 132, 158, 0.22) 100%)',
      'rgba(255, 255, 255, 0.055)',
    ].join(', ')
  }

  return [
    'radial-gradient(circle at 50% 50%, rgba(228, 206, 107, 0.18), transparent 54%)',
    'linear-gradient(90deg, rgba(255, 255, 255, 0.035), rgba(228, 206, 107, 0.11), rgba(255, 255, 255, 0.035))',
    'rgba(255, 255, 255, 0.055)',
  ].join(', ')
}

export function getSortedPredictionTournaments({
  search,
  sortDirection,
  sortKey,
  tournaments,
}: {
  search: string
  sortDirection: SortDirection
  sortKey: TournamentSortKey
  tournaments: TournamentSummary[]
}) {
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = tournaments.filter((tournament) => {
    if (!normalizedSearch) {
      return true
    }

    return [
      tournament.name,
      tournament.season,
      tournament.competitionName,
      tournament.competitionCountry,
    ].some((value) => value.toLowerCase().includes(normalizedSearch))
  })

  return filtered.sort((left, right) => {
    let comparison = 0
    if (sortKey === 'name') {
      comparison = compareText(left.name, right.name)
    } else if (sortKey === 'season') {
      comparison = compareText(left.season || '', right.season || '')
    } else if (sortKey === 'country') {
      comparison = compareText(left.competitionCountry || left.competitionName, right.competitionCountry || right.competitionName)
    } else if (sortKey === 'teams') {
      comparison = left.teamCount - right.teamCount
    } else if (sortKey === 'matches') {
      comparison = left.matchCount - right.matchCount
    } else if (sortKey === 'lastSync') {
      comparison = new Date(left.lastSyncedAtUtc ?? 0).getTime() - new Date(right.lastSyncedAtUtc ?? 0).getTime()
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })
}

export function getFirstPredictionRound(matches: MatchSummary[], ratingsByTeamId: Record<number, unknown>) {
  return [...new Set(matches.map((match) => match.roundInfo).filter(Boolean))]
    .sort(compareText)
    .find((round) => matches.some((match) => {
      if (match.roundInfo !== round || !isPredictableMatch(match) || !match.homeTeam || !match.awayTeam) {
        return false
      }

      return Boolean(ratingsByTeamId[match.homeTeam.id] && ratingsByTeamId[match.awayTeam.id])
    })) ?? 'all'
}

export function getPredictionRoundOptions(matches: MatchSummary[]) {
  return [...new Set(matches.map((match) => match.roundInfo).filter(Boolean))].sort(compareText)
}

export function getNextSortDirection(currentKey: string, nextKey: string, currentDirection: SortDirection, defaultDirection: SortDirection = 'asc') {
  if (currentKey === nextKey) {
    return currentDirection === 'asc' ? 'desc' : 'asc'
  }

  return defaultDirection
}

export function getDisplayedPredictionMatches({
  matches,
  predictionLabels,
  ratingsByTeamId,
  roundFilter,
  search,
  sortDirection,
  sortKey,
  tournamentAppliesHomeAdvantage,
}: {
  matches: MatchSummary[]
  predictionLabels: { home: string; draw: string; away: string }
  ratingsByTeamId: Record<number, any>
  roundFilter: string
  search: string
  sortDirection: SortDirection
  sortKey: PredictionMatchSortKey
  tournamentAppliesHomeAdvantage?: boolean
}) {
  const normalizedSearch = search.trim().toLowerCase()
  const rows = matches
    .filter(isPredictableMatch)
    .filter((match) => {
      if (roundFilter !== 'all' && match.roundInfo !== roundFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        match.roundInfo,
        getTeamDisplayName(match, 'home'),
        getTeamDisplayName(match, 'away'),
        formatDate(match.kickoffUtc, ''),
        match.kickoffUtc,
      ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch))
    })
    .map((match) => {
      const homeRating = match.homeTeam ? ratingsByTeamId[match.homeTeam.id] : undefined
      const awayRating = match.awayTeam ? ratingsByTeamId[match.awayTeam.id] : undefined
      const prediction = homeRating && awayRating && tournamentAppliesHomeAdvantage !== undefined
        ? calculatePrediction(homeRating, awayRating, tournamentAppliesHomeAdvantage, predictionLabels)
        : null

      return { match, prediction }
    })

  return rows.sort((left, right) => {
    let comparison = 0
    if (sortKey === 'kickoff') {
      comparison = new Date(left.match.kickoffUtc || 0).getTime() - new Date(right.match.kickoffUtc || 0).getTime()
    } else if (sortKey === 'round') {
      comparison = compareText(left.match.roundInfo, right.match.roundInfo)
    } else if (sortKey === 'home') {
      comparison = compareText(getTeamDisplayName(left.match, 'home'), getTeamDisplayName(right.match, 'home'))
    } else if (sortKey === 'away') {
      comparison = compareText(getTeamDisplayName(left.match, 'away'), getTeamDisplayName(right.match, 'away'))
    } else if (sortKey === 'homeWin') {
      comparison = (left.prediction?.homeWin ?? -1) - (right.prediction?.homeWin ?? -1)
    } else if (sortKey === 'draw') {
      comparison = (left.prediction?.draw ?? -1) - (right.prediction?.draw ?? -1)
    } else if (sortKey === 'awayWin') {
      comparison = (left.prediction?.awayWin ?? -1) - (right.prediction?.awayWin ?? -1)
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })
}
