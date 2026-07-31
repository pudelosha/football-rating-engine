import type { MatchPrediction, PredictionOutcomeKey, BettingCandidate, MatchSummary } from '../types'
import type { Translation } from '../../i18n'

export function formatDate(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  return new Date(value).toLocaleString()
}

export function matchStatusText(status: string | number, t: Translation) {
  const labels: Record<string, string> = {
    '0': t.matchStatusUnknown,
    Unknown: t.matchStatusUnknown,
    '1': t.matchStatusUpcoming,
    Upcoming: t.matchStatusUpcoming,
    '2': t.matchStatusLive,
    Live: t.matchStatusLive,
    '3': t.matchStatusFinished,
    Finished: t.matchStatusFinished,
    '4': t.matchStatusPostponed,
    Postponed: t.matchStatusPostponed,
    '5': t.matchStatusCancelled,
    Cancelled: t.matchStatusCancelled,
  }

  return labels[String(status)] ?? String(status)
}


export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatOdds(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '-'
}

export function getFavoriteOutcomeKey(prediction: MatchPrediction): PredictionOutcomeKey {
  const outcomes: { key: PredictionOutcomeKey; chance: number }[] = [
    { key: 'home', chance: prediction.homeWin },
    { key: 'draw', chance: prediction.draw },
    { key: 'away', chance: prediction.awayWin },
  ]

  return outcomes.sort((left, right) => right.chance - left.chance)[0].key
}

export function getDefaultBettingRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  end.setHours(23, 59, 0, 0)

  return {
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  }
}

export function toDateTimeLocalValue(value: Date) {
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export function getLeanRank(shapeTone: string) {
  const ranks: Record<string, number> = {
    balanced: 0,
    slight: 1,
    moderate: 2,
    clear: 3,
    strong: 4,
    heavy: 5,
  }

  return ranks[shapeTone] ?? 0
}

export function getDrawRiskRank(riskTone: string) {
  const ranks: Record<string, number> = {
    'very-low': 1,
    low: 2,
    moderate: 3,
    high: 4,
    'very-high': 5,
  }

  return ranks[riskTone] ?? 5
}

export function getOutcomeValue(prediction: MatchPrediction, key: PredictionOutcomeKey) {
  if (key === 'home') {
    return {
      chance: prediction.homeWin,
      odds: prediction.homeFairOdds,
    }
  }

  if (key === 'away') {
    return {
      chance: prediction.awayWin,
      odds: prediction.awayFairOdds,
    }
  }

  return {
    chance: prediction.draw,
    odds: prediction.drawFairOdds,
  }
}

export function withBettingSelection(
  candidate: BettingCandidate,
  selectionKey: PredictionOutcomeKey,
  t: Translation,
): BettingCandidate {
  const selection = getOutcomeValue(candidate.prediction, selectionKey)
  return {
    ...candidate,
    selectionKey,
    selectionLabel: selectionKey === 'home' ? t.homeWin : selectionKey === 'away' ? t.awayWin : t.draw,
    selectionChance: selection.chance,
    fairOdds: selection.odds,
  }
}


export function getTeamDisplayName(match: MatchSummary, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTeam?.name || match.homeTeamNameSnapshot || '-'
  }

  return match.awayTeam?.name || match.awayTeamNameSnapshot || '-'
}

export function isPredictableMatch(match: MatchSummary) {
  const status = String(match.status)
  return status === '1' || status === '2' || status === 'Upcoming' || status === 'Live'
}

export function formatEuroValue(value: number | null | undefined, fallback = '-') {
  if (value === null || value === undefined) {
    return fallback
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} h`
  }

  return `${minutes} min`
}

export function compareText(left: string | null | undefined, right: string | null | undefined) {
  return (left || '').localeCompare(right || '', undefined, { numeric: true, sensitivity: 'base' })
}

export function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

export function nullableNumber(value: string) {
  return value.trim() === '' ? null : Number(value)
}

export function enumValue(value: string | number, fallback: number, labels: Record<string, number>) {
  if (typeof value === 'number') {
    return value
  }

  return labels[value] ?? (Number(value) || fallback)
}


export function toRecordByTeamId<T extends { teamId: number }>(items: T[]): Record<number, T> {
  return Object.fromEntries(items.map((item) => [item.teamId, item]))
}

export function groupByTeamId<T extends { teamId: number }>(items: T[]): Record<number, T[]> {
  return items.reduce<Record<number, T[]>>((groups, item) => {
    groups[item.teamId] = [...(groups[item.teamId] ?? []), item]
    return groups
  }, {})
}

export function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

export function formatNullableScore(value?: number | null): string {
  return value === null || value === undefined ? '-' : value.toFixed(3)
}

export function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

