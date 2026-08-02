export type Language = 'en' | 'pl'
export type MenuIconName = 'home' | 'dashboard' | 'ratings' | 'teams' | 'matches' | 'api' | 'tournaments' | 'predictions' | 'betting' | 'admin' | 'profile' | 'logout' | 'arrow-left' | 'search' | 'trash'
export type View =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'resend-activation'
  | 'confirm-email'
  | 'reset-password'
  | 'terms'
  | 'home'
  | 'dashboard'
  | 'ratings'
  | 'rating-details'
  | 'teams'
  | 'team-details'
  | 'matches'
  | 'matches-details'
  | 'predictions'
  | 'predictions-tournament'
  | 'prediction-details'
  | 'betting'
  | 'betting-create'
  | 'api'
  | 'admin'
  | 'admin-teams'
  | 'admin-ratings'
  | 'admin-rating-details'
  | 'admin-squads'
  | 'admin-squad-details'
  | 'admin-users'
  | 'admin-system-jobs'
  | 'admin-data-quality'
  | 'admin-tournaments'
  | 'admin-tournament-form'
  | 'admin-tournament-details'
  | 'profile'
export type ToastTone = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  message: string
  tone: ToastTone
}

export type AuthUser = {
  email: string
  displayName?: string
  token: string
  apiKey?: string
}

export type FieldErrors = Partial<Record<'email' | 'password' | 'currentPassword' | 'confirmPassword' | 'termsAccepted', string>>

export type AuthResponse = {
  success: boolean
  message: string
  token?: string
  apiKey?: string
}

export type AuthActionResponse = {
  success: boolean
  message: string
}

export type UserProfile = {
  email: string
  displayName?: string | null
  memberSinceUtc: string
  apiKeyCreatedAtUtc: string
}

export type AdminUser = {
  id: string
  email: string
  displayName?: string | null
  memberSinceUtc: string
  emailConfirmed: boolean
  isLockedOut: boolean
  roles: string[]
}

export type RotateApiKeyResponse = {
  apiKey: string
  message?: string
}

export type TournamentSummary = {
  id: number
  isActive: boolean
  applyHomeAdvantage: boolean
  name: string
  season: string
  competitionName: string
  competitionCountry: string
  createdAtUtc: string
  updatedAtUtc: string
  lastSyncedAtUtc?: string | null
  stageCount: number
  teamCount: number
  matchCount: number
}

export type TeamSummary = {
  id: number
  name: string
  abbreviation: string
  isEnabled: boolean
  tournamentAssignments?: TeamTournamentAssignment[]
}

export type TeamTournamentAssignment = {
  tournamentId: number
  tournamentName: string
  season: string
  country: string
}

export type ExternalTeamMapping = {
  id: number
  teamId: number
  teamName: string
  provider: string
  externalTeamId: string
  externalSlug: string
  sourceUrl: string
  createdAtUtc: string
  updatedAtUtc: string
}

export type SquadQualitySnapshot = {
  id: number
  teamId: number
  teamName: string
  teamAbbreviation: string
  provider: string
  externalTeamId: string
  externalSlug: string
  sourceUrl: string
  season?: string | null
  fetchedAtUtc: string
  clubName: string
  stadiumName?: string | null
  playerCount: number
  squadSize?: number | null
  totalMarketValueEur?: number | null
  averageMarketValueEur?: number | null
  topElevenMarketValueEur?: number | null
  topFifteenMarketValueEur?: number | null
}

export type SquadPlayerSnapshot = {
  id: number
  squadQualitySnapshotId: number
  externalPlayerId: string
  profileUrl: string
  playerName: string
  positionGroup: string
  position: string
  shirtNumber: string
  dateOfBirth?: string | null
  age?: number | null
  nationalities: string
  heightCm?: number | null
  foot: string
  joinedDate?: string | null
  signedFromClubName: string
  transferFeeText: string
  contractUntil?: string | null
  marketValueText: string
  marketValueEur?: number | null
}

export type ImportTransfermarktSquadResponse = {
  teamId: number
  teamName: string
  mappingId: number
  snapshotId: number
  externalTeamId: string
  externalSlug: string
  clubName: string
  sourceUrl: string
  season?: string | null
  stadiumName: string
  playerCount: number
  totalMarketValueEur?: number | null
  averageMarketValueEur?: number | null
  topElevenMarketValueEur?: number | null
  topFifteenMarketValueEur?: number | null
}

export type SquadTeamRow = {
  team: TeamSummary
  mapping?: ExternalTeamMapping
  snapshot?: SquadQualitySnapshot
}

export type SquadTournamentCoverage = {
  tournamentId?: number
  teamCount?: number
  linkedTeams: number
  snapshotTeams: number
  lastSnapshotUtc?: string | null
}

export type TournamentSquadCoverageResponse = {
  tournamentId: number
  teamCount: number
  transfermarktMappedTeams: number
  snapshotTeams: number
  lastSnapshotUtc?: string | null
}

export type RatingConfiguration = {
  id: number
  key: string
  baseEloWeight: number
  formWeight: number
  performanceWeight: number
  squadQualityWeight: number
  leagueStrengthWeight: number
  uncertaintyPenaltyWeight: number
  baseRating: number
  promotedBaselineRating: number
  kFactor: number
  homeAdvantage: number
  bootstrapSeasonCount: number
  formMatchCount: number
  formScale: number
  formMaxAdjustment: number
  performanceMatchCount: number
  performanceScale: number
  performanceMaxAdjustment: number
  updatedAtUtc: string
}

export type EloRatingRun = {
  id: number
  tournamentId: number
  name: string
  scope: string
  baseRating: number
  promotedBaselineRating: number
  kFactor: number
  homeAdvantage: number
  bootstrapSeasonCount: number
  snapshotStartSeasonOffset?: number | null
  status: string | number
  startedAtUtc: string
  finishedAtUtc?: string | null
  importedHistoricalMatches: number
  processedMatches: number
  errorMessage: string
}

export type LayerRatingRun = {
  id: number
  tournamentId: number
  eloRatingRunId: number
  matchCount: number
  scale: number
  maxAdjustment: number
  status: string | number
  startedAtUtc: string
  finishedAtUtc?: string | null
  processedTeams: number
  errorMessage: string
}

export type CombinedTeamRating = {
  teamId: number
  teamName: string
  teamAbbreviation: string
  baseElo: number
  formAdjustment: number
  performanceAdjustment: number
  squadQualityAdjustment: number
  totalAdjustment: number
  finalRating: number
  previousFinalRating?: number | null
  finalRatingChange?: number | null
  ratingConfidence: number
  hasFormRating: boolean
  hasPerformanceRating: boolean
  hasSquadQualityRating: boolean
  baseEloMatchesPlayed: number
  formMatchesPlayed: number
  performanceMatchesPlayed: number
  squadPlayerCount: number
  lastBaseEloMatchUtc?: string | null
  lastFormMatchUtc?: string | null
  lastPerformanceMatchUtc?: string | null
  squadSnapshotFetchedAtUtc?: string | null
}

export type CombinedRatingsResponse = {
  tournamentId: number
  runContext: {
    baseEloRunId?: number | null
    formRatingRunId?: number | null
    performanceRatingRunId?: number | null
    snapshotStartSeasonOffset?: number | null
    currentRoundInfo: string
    previousRoundInfo: string
    calculatedAtUtc: string
  }
  teams: CombinedTeamRating[]
}

export type BaseEloMatchSnapshot = {
  id: number
  runId: number
  liveScoreEventId: string
  kickoffUtc: string
  homeTeamId: number
  homeTeamName: string
  awayTeamId: number
  awayTeamName: string
  homeScore?: number | null
  awayScore?: number | null
  homeActual: number
  awayActual: number
}

export type TeamFormRatingDetail = {
  teamId: number
  matchCount: number
  weightedActual: number
  weightedExpected: number
  weightedDelta: number
  averageDelta: number
  lastMatchUtc?: string | null
}

export type TeamFormMatchSnapshot = {
  teamId: number
  opponentTeamName: string
  kickoffUtc: string
  isHome: boolean
  actual: number
  expected: number
  delta: number
  weight: number
  weightedDelta: number
}

export type TeamPerformanceRatingDetail = {
  teamId: number
  matchCount: number
  dataCoverage: number
  rawPerformanceScore: number
  lastMatchUtc?: string | null
}

export type TeamPerformanceMatchSnapshot = {
  teamId: number
  opponentTeamName: string
  kickoffUtc: string
  isHome: boolean
  dataCoverage: number
  xgScore?: number | null
  shotScore?: number | null
  shotsOnTargetScore?: number | null
  shotQualityScore?: number | null
  possessionScore?: number | null
  territoryScore?: number | null
  offsidesScore?: number | null
  foulStressScore?: number | null
  goalkeeperStressScore?: number | null
  rawPerformanceScore: number
  weight: number
  weightedPerformanceScore: number
}

export type TeamSquadQualityRatingDetail = {
  teamId: number
  snapshotId?: number | null
  fetchedAtUtc?: string | null
  totalMarketValueEur?: number | null
  topElevenMarketValueEur?: number | null
  topFifteenMarketValueEur?: number | null
  averageAge?: number | null
  valueWeightedAverageAge?: number | null
  nationalTeamPlayers?: number | null
  playerCount: number
  topElevenScore?: number | null
  topFifteenScore?: number | null
  totalValueScore?: number | null
  nationalTeamPlayersScore?: number | null
  primeAgeScore?: number | null
  contractStabilityScore?: number | null
  positionalBalanceScore?: number | null
  squadQualityScore: number
  squadQualityAdjustment: number
}

export type TournamentRatingSetup = {
  tournamentId: number
  includeForm: boolean
  includePerformance: boolean
  includeSquad: boolean
  snapshotStartSeasonOffset?: number | null
  updatedAtUtc: string
}

export type TournamentDetails = {
  id: number
  isActive: boolean
  applyHomeAdvantage: boolean
  liveScoreCompetitionId: string
  name: string
  season: string
  competitionName: string
  competitionCountry: string
  categoryCode: string
  categoryName: string
  categoryTransliteratedName: string
  baseUrl: string
  fixturesUrl: string
  resultsUrl: string
  locale: string
  timezoneOffset: string
  createdAtUtc: string
  updatedAtUtc: string
  lastSyncedAtUtc?: string | null
  stages: Array<{ id: number; name: string; code: string; sortOrder: number }>
  teams: TeamSummary[]
}

export type MatchSummary = {
  id: number
  tournamentId: number
  stageId?: number | null
  kickoffUtc?: string | null
  homeTeam?: { id: number; name: string; abbreviation: string } | null
  awayTeam?: { id: number; name: string; abbreviation: string } | null
  homeTeamNameSnapshot: string
  awayTeamNameSnapshot: string
  homeScore?: number | null
  awayScore?: number | null
  regularTimeHomeScore?: number | null
  regularTimeAwayScore?: number | null
  afterExtraTimeHomeScore?: number | null
  afterExtraTimeAwayScore?: number | null
  penaltyHomeScore?: number | null
  penaltyAwayScore?: number | null
  status: string | number
  rawStatus: string
  syncState: string | number
  roundInfo: string
  lastSyncedAtUtc?: string | null
  hasPredictionSnapshot: boolean
}

export type MatchPredictionSnapshot = {
  id: number
  matchId: number
  tournamentId: number
  capturedAtUtc: string
  source: string
  baseEloRunId?: number | null
  formRatingRunId?: number | null
  performanceRatingRunId?: number | null
  snapshotStartSeasonOffset?: number | null
  ratingCalculatedAtUtc: string
  homeTeamId: number
  awayTeamId: number
  homeTeamName: string
  awayTeamName: string
  homeBaseElo: number
  awayBaseElo: number
  homeFormAdjustment: number
  awayFormAdjustment: number
  homePerformanceAdjustment: number
  awayPerformanceAdjustment: number
  homeSquadQualityAdjustment: number
  awaySquadQualityAdjustment: number
  homeFinalRating: number
  awayFinalRating: number
  homeRatingConfidence: number
  awayRatingConfidence: number
  applyHomeAdvantage: boolean
  homeAdvantage: number
  ratingGap: number
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  homeFairOdds: number
  drawFairOdds: number
  awayFairOdds: number
  favoriteOutcome: string
  favoriteProbability: number
}

export type TournamentSyncRun = {
  id: number
  tournamentId: number
  mode: string
  status: string
  startedAtUtc: string
  finishedAtUtc?: string | null
  insertedMatches: number
  updatedMatches: number
  unchangedMatches: number
  errorMessage: string
}

export type TournamentSyncRunSummary = TournamentSyncRun & {
  tournamentName: string
}

export type SyncTournamentResponse = {
  syncRunId: number
  tournamentId: number
  mode: string
  status: string
  insertedMatches: number
  updatedMatches: number
  unchangedMatches: number
  errorMessage: string
}

export type SyncAllTournamentsResponse = {
  mode: string
  tournamentCount: number
  succeededCount: number
  failedCount: number
  insertedMatches: number
  updatedMatches: number
  unchangedMatches: number
  results: SyncTournamentResponse[]
}

export type SystemJobService = {
  serviceKey?: string
  title: string
  cadence: string
  status: string
  nextRun: string
  copy: string
}

export type SyncServiceHealth = {
  serviceName: string
  serviceKey: string
  mode?: string | null
  isEnabled: boolean
  status: string
  intervalMinutes: number
  lastRunUtc?: string | null
  lastSuccessUtc?: string | null
  lastFailureUtc?: string | null
  lastError: string
  activeTournamentCount: number
  eligibleTournamentCount: number
  runsLast24Hours: number
  failuresLast24Hours: number
  notes: string
}

export type SyncServiceConfigurationResponse = {
  serviceKey: string
  isEnabled: boolean
  intervalMinutes: number
  updatedAtUtc: string
}

export type DataQualityTournamentCheck = {
  key: string
  title: string
  status: string
  issueCount: number
  checkedCount: number
  lastSampleUtc?: string | null
  summary: string
}

export type DataQualityIssue = {
  key: string
  severity: string
  tournamentName: string
  entityType: string
  entityLabel: string
  entityId?: number | null
  sampleUtc?: string | null
  issue: string
}

export type TournamentPreview = {
  name: string
  season: string
  competitionName: string
  competitionCountry: string
  categoryCode: string
  categoryName: string
  categoryTransliteratedName: string
  locale: string
  timezoneOffset: string
}

export type TournamentSortKey = 'name' | 'season' | 'country' | 'teams' | 'matches' | 'lastSync'
export type TeamSortKey = 'name' | 'abbreviation' | 'tournaments'
export type MatchSortKey = 'kickoff' | 'round' | 'home' | 'away' | 'score' | 'status'
export type PublicMatchSortKey = 'kickoff' | 'round' | 'home' | 'away' | 'score' | 'status'
export type PredictionMatchSortKey = 'kickoff' | 'round' | 'home' | 'away' | 'homeWin' | 'draw' | 'awayWin'
export type UserSortKey = 'email' | 'displayName' | 'role' | 'status' | 'memberSince'
export type SquadTournamentSortKey = 'name' | 'season' | 'teams' | 'coverage' | 'snapshot'
export type SquadTeamSortKey = 'team' | 'value' | 'mapping' | 'snapshot'
export type RatingTeamSortKey = 'team' | 'baseElo' | 'form' | 'performance' | 'squad' | 'finalRating' | 'change' | 'confidence'
export type UserTeamSortKey = 'team' | 'country' | 'tournaments' | 'rating' | 'lastSync'
export type SquadPlayerSortKey = 'name' | 'position' | 'age' | 'nationality' | 'value' | 'contract'
export type BettingCandidateSortKey = 'kickoff' | 'tournament' | 'home' | 'away' | 'selection' | 'chance' | 'odds' | 'shape'
export type SortDirection = 'asc' | 'desc'


export type MatchPrediction = {
  homeWin: number
  draw: number
  awayWin: number
  homeFairOdds: number
  drawFairOdds: number
  awayFairOdds: number
  ratingGap: number
  confidence: number
  favoriteLabel: string
  favoriteChance: number
}

export type PredictionOutcomeKey = 'home' | 'draw' | 'away'

export type BettingLeanFilter = 'balanced' | 'slight' | 'moderate' | 'clear' | 'strong' | 'heavy'
export type BettingDrawRiskFilter = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high'

export type PredictionShape = {
  shape: string
  shapeSide: string
  shapeTone: string
  risk: string
  riskTone: string
  copy: string
}

export type BettingCandidate = {
  tournamentId: number
  tournamentName: string
  tournamentSeason: string
  match: MatchSummary
  prediction: MatchPrediction
  shape: PredictionShape
  selectionKey: PredictionOutcomeKey
  selectionLabel: string
  selectionChance: number
  fairOdds: number
}

export type BettingCouponStatus = 'Pending' | 'Won' | 'Lost' | 'Locked' | number
export type BettingCouponSelection = 'HomeWin' | 'Draw' | 'AwayWin' | number
export type BettingCouponBetStatus = 'Pending' | 'Won' | 'Lost' | 'Void' | number

export type BettingCouponBet = {
  id: number
  matchId: number
  tournamentId: number
  tournamentName: string
  tournamentSeason: string
  kickoffUtc?: string | null
  homeTeamName: string
  awayTeamName: string
  homeScore?: number | null
  awayScore?: number | null
  matchStatus: string | number
  roundInfo: string
  selection: BettingCouponSelection
  status: BettingCouponBetStatus
  predictedChance: number
  fairOdds: number
  modelShape: string
  drawRisk: string
  settledAtUtc?: string | null
}

export type BettingCoupon = {
  id: number
  status: BettingCouponStatus
  stake: number
  totalOdds: number
  potentialPayout: number
  createdAtUtc: string
  updatedAtUtc: string
  closedAtUtc?: string | null
  bets: BettingCouponBet[]
}

export type BettingCouponSummary = {
  pendingCount: number
  successfulCount: number
  unsuccessfulCount: number
  successfulPayout: number
  unsuccessfulStake: number
  netResult: number
}

export type HistoricSplitMatch = {
  date: string
  homeTeamName: string
  awayTeamName: string
  homeScore?: number | null
  awayScore?: number | null
}

export type MiniBarTooltipRow = {
  label: string
  value: string
}


export type UserTeamContext = {
  tournamentId: number
  tournamentName: string
  season: string
  country: string
  isActive: boolean
  baseElo?: number
  formAdjustment?: number
  performanceAdjustment?: number
  squadQualityAdjustment?: number
  finalRating?: number
  lastSyncedAtUtc?: string | null
}

export type UserTeamDirectoryRow = {
  team: TeamSummary
  countries: string[]
  contexts: UserTeamContext[]
  latestRating?: number
  latestRatingContext?: UserTeamContext
  lastSyncedAtUtc?: string | null
}
