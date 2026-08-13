import type { AuthUser, ToastTone } from '../../../shared/types'
import type { Translation } from '../../../i18n'

export type SocialBettingUser = AuthUser
export type SocialBettingToastHandler = (message: string, tone: ToastTone) => void

export type SocialBettingProps = {
  t: Translation
  user: SocialBettingUser
  onToast: SocialBettingToastHandler
  onCreateTournament: () => void
  onEditTournament: (id: number) => void
}

export type SocialBettingTournamentFormProps = {
  t: Translation
  user: SocialBettingUser
  tournamentId?: number
  onBack: () => void
  onSaved: () => void
  onToast: SocialBettingToastHandler
}

export type BettingTournamentOption = {
  id: number
  name: string
  linkedTournament: string
  role: 'Admin' | 'Player'
  participants: number
}

export type BettingTournamentParticipant = {
  id: number
  name: string
  email: string
  status: 'Accepted' | 'Pending'
}

export type BettingStandingRow = {
  position: number
  userName: string
  accuracy: number
  successfulBets: number
  result: number
  direction: 'up' | 'down' | 'stable'
  pointsSplit: {
    win: number
    draw: number
    failed: number
  }
}

export type BettingMatchPick = {
  id: number
  stage?: string
  kickoff: string
  homeTeam: string
  awayTeam: string
  linkedTournament: string
  prediction?: string
  odds?: string
  score?: string
  result?: 'won' | 'lost' | 'pending'
  points?: number
}

export type BettingMatchInsightBet = {
  playerName: string
  prediction: string
  homeWin: boolean
  draw: boolean
  awayWin: boolean
  outcomeMatched: boolean
  points: number
}

export type BettingMatchInsight = {
  id: number
  stage: string
  kickoff: string
  homeTeam: string
  awayTeam: string
  score?: string
  status: 'Pending' | 'In progress' | 'Completed' | 'Postponed'
  summary: string
  bets: BettingMatchInsightBet[]
}

export type BettingPointsGrowthSeries = {
  playerName: string
  points: number[]
}
