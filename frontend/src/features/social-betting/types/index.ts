import type { AuthUser } from '../../../shared/types'
import type { Translation } from '../../../i18n'

export type SocialBettingUser = AuthUser

export type SocialBettingProps = {
  t: Translation
  user: SocialBettingUser
}

export type BettingTournamentOption = {
  id: number
  name: string
  linkedTournament: string
  role: 'Admin' | 'Player'
  participants: number
}

export type BettingStandingRow = {
  position: number
  userName: string
  accuracy: number
  successfulBets: number
  result: number
  direction: 'up' | 'down' | 'stable'
}

export type BettingMatchPick = {
  id: number
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
