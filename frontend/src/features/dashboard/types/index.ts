import type { AuthUser, Language, MenuIconName, MatchSummary, TeamSquadQualityRatingDetail, TournamentSummary } from '../../../shared/types'
import type { Translation } from '../../../i18n'

export type DashboardUser = AuthUser
export type DashboardToastHandler = (message: string, tone: 'success' | 'error' | 'info') => void

export type DashboardCopy = {
  eyebrow: string
  title: string
  copy: string
  tournament: string
  round: string
  allRounds: string
  teamScope: string
  allTeams: string
  refresh: string
  loading: string
  kpis: Array<[string, string, MenuIconName]>
  leagueTable: string
  resultSplit: string
  roundGoals: string
  positionTrend: string
  ratingDistribution: string
  noRows: string
  points: string
  played: string
  wins: string
  draws: string
  losses: string
  goalsFor: string
  goalsAgainst: string
  goalDifference: string
  avgFor: string
  avgAgainst: string
  finalRating: string
}

export type DashboardProps = {
  language: Language
  t: Translation
  user: DashboardUser
  onToast: DashboardToastHandler
}

export type DashboardDataset = {
  selectedTournament?: TournamentSummary
  matches: MatchSummary[]
  ratings: Array<{
    teamId: number
    teamName: string
    teamAbbreviation: string
    finalRating: number
  }>
  squadDetails: TeamSquadQualityRatingDetail[]
  round: string
  teamIds: string[]
}

export type DashboardKpi = {
  icon: MenuIconName
  label: string
  value: string
  detail: string
}

export type DashboardBar = {
  label: string
  value: number
  detail: string
}

export type LeagueTableRow = {
  teamId: number
  teamName: string
  abbreviation: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  averageGoalsFor: number
  averageGoalsAgainst: number
  finalRating?: number
}

export type PositionTrendRow = {
  teamId: number
  teamName: string
  rounds: string[]
  positions: Array<number | null>
  points: Array<number | null>
  pointChanges: Array<number | null>
}

export type TeamLastFiveRow = {
  teamId: number
  abbreviation: string
  teamName: string
  points: number
  played: number
  results: Array<'W' | 'D' | 'L'>
}

export type ResultSplit = {
  home: number
  draw: number
  away: number
  total: number
  homeShare: number
  drawShare: number
  awayShare: number
}

export type DashboardModel = {
  kpis: DashboardKpi[]
  resultSplit: ResultSplit
  roundGoalBars: DashboardBar[]
  ratingBars: DashboardBar[]
  leagueRows: LeagueTableRow[]
  goalsScoredBars: DashboardBar[]
  scoredConcededRows: LeagueTableRow[]
  teamValueBars: DashboardBar[]
  teamAgeDots: DashboardBar[]
  positionTrend: PositionTrendRow[]
  lastFiveRows: TeamLastFiveRow[]
  roundOptions: string[]
  teamOptions: Array<{ id: number; name: string }>
}
