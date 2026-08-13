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
  sourceTournamentId?: number
  name: string
  linkedTournament: string
  season?: string
  role: 'Admin' | 'Player'
  participantStatus?: 'Accepted' | 'Pending' | 'Removed'
  participants: number
  isActive?: boolean
}

export type BettingTournamentParticipant = {
  id: number
  userId?: string
  name: string
  email: string
  role?: 'Admin' | 'Player'
  status: 'Accepted' | 'Pending' | 'Removed'
}

export type SocialBettingExactScoreBonusMode = 'FixedValue' | 'OddsMultiplier'
export type SocialBettingPoolMode = 'FixedBaseAmount' | 'PlayerCredits'

export type SocialBettingSettings = {
  allowExactScoreBonus: boolean
  exactScoreBonusMode: SocialBettingExactScoreBonusMode
  exactScoreBonusValue: number
  exactScoreOddsMultiplier: number
  allowQualificationPick: boolean
  applyMissingBetPenalty: boolean
  missingBetPenalty: number
  poolMode: SocialBettingPoolMode
  baseBetAmount: number
  startingCredits: number
  maxBetPerGame: number
}

export type SocialBettingTournamentDetails = BettingTournamentOption & {
  sourceTournamentId: number
  participantsCount: number
  settings: SocialBettingSettings
  participants: BettingTournamentParticipant[]
}

export type SaveSocialBettingTournamentPayload = {
  sourceTournamentId?: number
  name: string
  settings: SocialBettingSettings
  participants: Array<{ email: string; nickname?: string }>
  language?: string
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

export type SocialBettingResults = {
  standings: BettingStandingRow[]
  pointsGrowth: BettingPointsGrowthSeries[]
}

export type SocialBettingOutstandingBet = BettingMatchPick & {
  kickoffUtc?: string
  status?: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  homeWinOdds?: number
  drawOdds?: number
  awayWinOdds?: number
}

export type SocialBettingPick = {
  id: number
  matchId: number
  homeScorePrediction: number
  awayScorePrediction: number
  qualifierTeamId?: number
  stake: number
  homeOddsAtPlacement?: number
  drawOddsAtPlacement?: number
  awayOddsAtPlacement?: number
  placedAtUtc: string
  updatedAtUtc: string
}

export type SocialBettingMatchSummary = {
  matchId: number
  homeTeam: string
  awayTeam: string
  kickoffUtc?: string
  kickoff: string
  status: string
  hasStarted: boolean
  homeScore?: number
  awayScore?: number
  participantCount: number
  placedBetCount: number
  homeWinPercentage: number
  drawPercentage: number
  awayWinPercentage: number
  averageHomeGoals: number
  averageAwayGoals: number
  homeWinOdds?: number
  drawOdds?: number
  awayWinOdds?: number
  userBets: SocialBettingUserBetSummary[]
}

export type SocialBettingUserBetSummary = {
  playerName: string
  bet: string
  homeWin: boolean
  draw: boolean
  awayWin: boolean
  outcomeMatched?: boolean
  points?: number
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
  homeWinProbability?: number
  drawProbability?: number
  awayWinProbability?: number
  homeWinOdds?: number
  drawOdds?: number
  awayWinOdds?: number
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
