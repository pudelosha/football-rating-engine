import type { translations } from '../../../i18n'
import type { AuthUser, Language, MenuIconName, View } from '../../../shared/types'

export type HomeTranslation = (typeof translations)[Language]
export type HomeUserSession = AuthUser
export type HomeNavigateHandler = (view: View) => void

export type HomePulseCard = {
  icon: MenuIconName
  value: string
  label: string
  detail: string
}

export type FeaturedPredictionRow = {
  time: string
  tournament: string
  home: string
  away: string
  outcome: string
  chance: string
  drawRisk: string
}

export type RatingsSnapshotRow = {
  team: string
  tournament: string
  base: string
  form: string
  squad: string
  final: string
}

export type HomeInsightItem = {
  label: string
  value: string
  copy: string
}

export type HomeCopy = {
  copy: string
  ready: string
  readyCopy: string
  actions: [string, string, string]
  pulse: Array<[string, string]>
  featuredPredictions: string
  openPredictions: string
  ratingsSnapshot: string
  openRatings: string
  matchExplorer: string
  browseMatches: string
  explorer: Array<[string, string]>
  bettingLab: string
  bettingCopy: string
  openBetting: string
  betting: Array<[string, string]>
}

export type HomeDashboardData = {
  pulseCards: HomePulseCard[]
  featuredPredictions: FeaturedPredictionRow[]
  ratingsSnapshot: RatingsSnapshotRow[]
  matchExplorerItems: HomeInsightItem[]
  bettingItems: HomeInsightItem[]
}
