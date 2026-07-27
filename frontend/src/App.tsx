import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'

type Language = 'en' | 'pl'
type MenuIconName = 'home' | 'ratings' | 'teams' | 'matches' | 'api' | 'tournaments' | 'predictions' | 'admin' | 'profile' | 'logout' | 'arrow-left'
type View =
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
  | 'api'
  | 'admin'
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
type ToastTone = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  tone: ToastTone
}

type AuthUser = {
  email: string
  displayName?: string
  token: string
}

type FieldErrors = Partial<Record<'email' | 'password' | 'currentPassword' | 'confirmPassword' | 'termsAccepted', string>>

type AuthResponse = {
  success: boolean
  message: string
  token?: string
  apiKey?: string
}

type AuthActionResponse = {
  success: boolean
  message: string
}

type UserProfile = {
  email: string
  displayName?: string | null
  memberSinceUtc: string
}

type AdminUser = {
  id: string
  email: string
  displayName?: string | null
  memberSinceUtc: string
  emailConfirmed: boolean
  isLockedOut: boolean
  roles: string[]
}

type RotateApiKeyResponse = {
  apiKey: string
  message?: string
}

type TournamentSummary = {
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

type TeamSummary = {
  id: number
  name: string
  abbreviation: string
}

type ExternalTeamMapping = {
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

type SquadQualitySnapshot = {
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
  playerCount: number
  squadSize?: number | null
  totalMarketValueEur?: number | null
  topElevenMarketValueEur?: number | null
  topFifteenMarketValueEur?: number | null
}

type ImportTransfermarktSquadResponse = {
  teamId: number
  teamName: string
  mappingId: number
  snapshotId: number
  externalTeamId: string
  externalSlug: string
  clubName: string
  sourceUrl: string
  season?: string | null
  playerCount: number
  totalMarketValueEur?: number | null
  topElevenMarketValueEur?: number | null
  topFifteenMarketValueEur?: number | null
}

type SquadTeamRow = {
  team: TeamSummary
  mapping?: ExternalTeamMapping
  snapshot?: SquadQualitySnapshot
}

type SquadTournamentCoverage = {
  tournamentId?: number
  teamCount?: number
  linkedTeams: number
  snapshotTeams: number
  lastSnapshotUtc?: string | null
}

type TournamentSquadCoverageResponse = {
  tournamentId: number
  teamCount: number
  transfermarktMappedTeams: number
  snapshotTeams: number
  lastSnapshotUtc?: string | null
}

type RatingConfiguration = {
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

type EloRatingRun = {
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

type LayerRatingRun = {
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

type CombinedTeamRating = {
  teamId: number
  teamName: string
  teamAbbreviation: string
  baseElo: number
  formAdjustment: number
  performanceAdjustment: number
  squadQualityAdjustment: number
  totalAdjustment: number
  finalRating: number
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

type CombinedRatingsResponse = {
  tournamentId: number
  runContext: {
    baseEloRunId?: number | null
    formRatingRunId?: number | null
    performanceRatingRunId?: number | null
    calculatedAtUtc: string
  }
  teams: CombinedTeamRating[]
}

type TeamFormRatingDetail = {
  teamId: number
  matchCount: number
  weightedActual: number
  weightedExpected: number
  weightedDelta: number
  averageDelta: number
  lastMatchUtc?: string | null
}

type TeamFormMatchSnapshot = {
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

type TeamPerformanceRatingDetail = {
  teamId: number
  matchCount: number
  dataCoverage: number
  rawPerformanceScore: number
  lastMatchUtc?: string | null
}

type TeamPerformanceMatchSnapshot = {
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

type TeamSquadQualityRatingDetail = {
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

type TournamentRatingSetup = {
  tournamentId: number
  includeForm: boolean
  includePerformance: boolean
  includeSquad: boolean
  snapshotStartSeasonOffset?: number | null
  updatedAtUtc: string
}

type TournamentDetails = {
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

type MatchSummary = {
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
}

type TournamentSyncRun = {
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

type TournamentSyncRunSummary = TournamentSyncRun & {
  tournamentName: string
}

type SyncTournamentResponse = {
  syncRunId: number
  tournamentId: number
  mode: string
  status: string
  insertedMatches: number
  updatedMatches: number
  unchangedMatches: number
  errorMessage: string
}

type SyncAllTournamentsResponse = {
  mode: string
  tournamentCount: number
  succeededCount: number
  failedCount: number
  insertedMatches: number
  updatedMatches: number
  unchangedMatches: number
  results: SyncTournamentResponse[]
}

type SystemJobService = {
  serviceKey?: string
  title: string
  cadence: string
  status: string
  nextRun: string
  copy: string
}

type SyncServiceHealth = {
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

type SyncServiceConfigurationResponse = {
  serviceKey: string
  isEnabled: boolean
  intervalMinutes: number
  updatedAtUtc: string
}

type DataQualityTournamentCheck = {
  key: string
  title: string
  status: string
  issueCount: number
  checkedCount: number
  lastSampleUtc?: string | null
  summary: string
}

type DataQualityIssue = {
  key: string
  severity: string
  tournamentName: string
  entityType: string
  entityLabel: string
  entityId?: number | null
  sampleUtc?: string | null
  issue: string
}

type TournamentPreview = {
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

type TournamentSortKey = 'name' | 'season' | 'country' | 'teams' | 'matches' | 'lastSync'
type TeamSortKey = 'name' | 'abbreviation'
type MatchSortKey = 'kickoff' | 'round' | 'home' | 'away' | 'score' | 'status'
type UserSortKey = 'email' | 'displayName' | 'role' | 'status' | 'memberSince'
type SquadTournamentSortKey = 'name' | 'season' | 'teams' | 'coverage' | 'snapshot'
type SquadTeamSortKey = 'team' | 'value' | 'mapping' | 'snapshot'
type RatingTeamSortKey = 'team' | 'baseElo' | 'form' | 'performance' | 'squad' | 'finalRating' | 'confidence'
type SortDirection = 'asc' | 'desc'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const AUTH_STORAGE_KEY = 'football-rating-engine.auth'
const confirmEmailRequests = new Map<string, Promise<AuthResponse>>()

const routes: Record<View, string> = {
  landing: '/',
  login: '/login',
  register: '/register',
  'forgot-password': '/forgot-password',
  'resend-activation': '/resend-activation',
  'confirm-email': '/confirm-email',
  'reset-password': '/reset-password',
  terms: '/terms',
  home: '/home',
  dashboard: '/dashboard',
  ratings: '/ratings',
  'rating-details': '/ratings/0',
  api: '/api',
  admin: '/admin',
  'admin-ratings': '/admin/ratings',
  'admin-rating-details': '/admin/ratings/0',
  'admin-squads': '/admin/squads',
  'admin-squad-details': '/admin/squads/0',
  'admin-users': '/admin/users',
  'admin-system-jobs': '/admin/system-jobs',
  'admin-data-quality': '/admin/data-quality',
  'admin-tournaments': '/admin/tournaments',
  'admin-tournament-form': '/admin/tournaments/new',
  'admin-tournament-details': '/admin/tournaments/0',
  profile: '/profile',
}

function getViewFromPath(pathname: string): View {
  if (pathname === routes.dashboard) {
    return 'home'
  }

  if (pathname === '/admin/tournaments/new' || /^\/admin\/tournaments\/\d+\/edit$/.test(pathname)) {
    return 'admin-tournament-form'
  }

  if (/^\/admin\/ratings\/\d+$/.test(pathname)) {
    return 'admin-rating-details'
  }

  if (/^\/ratings\/\d+$/.test(pathname)) {
    return 'rating-details'
  }

  if (/^\/admin\/squads\/\d+$/.test(pathname)) {
    return 'admin-squad-details'
  }

  if (/^\/admin\/tournaments\/\d+$/.test(pathname)) {
    return 'admin-tournament-details'
  }

  const match = Object.entries(routes).find(([, route]) => route === pathname)
  return (match?.[0] as View | undefined) ?? 'landing'
}

const translations = {
  en: {
    brand: 'Football Rating Engine',
    loginRegister: 'Login / Register',
    logout: 'Logout',
    profile: 'Profile',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menuHome: 'Home',
    menuRatings: 'Ratings',
    menuTeams: 'Teams',
    menuMatches: 'Matches',
    menuApi: 'API',
    menuPredictions: 'Predictions',
    menuAdmin: 'Admin',
    menuSoon: 'Soon',
    apiPanelEyebrow: 'API access',
    apiPanelTitle: 'Match data API.',
    apiPanelCopy: 'Use your API key to request tournament match lists, results, live matches, and upcoming fixtures from external tools.',
    apiHeaderTitle: 'Authentication',
    apiHeaderCopy: 'Send your key in the request header below. You can rotate the key from your profile.',
    apiEndpointsTitle: 'Match endpoints',
    apiEndpointAll: 'All tournament matches',
    apiEndpointResults: 'Completed results',
    apiEndpointLive: 'Live matches',
    apiEndpointUpcoming: 'Upcoming matches',
    apiEndpointSingle: 'Single match details',
    apiKeyHeader: 'Header',
    adminPanelEyebrow: 'Admin panel',
    adminPanelTitle: 'Operational control room.',
    adminPanelCopy:
      'A structured workspace for sync jobs, rating rebuilds, squad imports, and data quality checks. The controls are placeholders for now, ready to be wired to backend endpoints.',
    adminOverview: 'Overview',
    ratingsPanelEyebrow: 'Rating operations',
    ratingsPanelTitle: 'Ratings panel.',
    ratingsPanelCopy:
      'Manage model configuration and open tournament rating snapshots for Base Elo, form, performance, squad quality, and combined FTSR layers.',
    ratingRebuildsTitle: 'Rating rebuilds',
    ratingConfigTitle: 'Rating configuration',
    ratingHistoryTitle: 'Rating history',
    ratingActiveVersionsTitle: 'Active rating versions',
    ratingActionPrepared: 'Prepared',
    ratingTournamentListTitle: 'Tournament ratings',
    ratingTournamentListCopy: 'Open a tournament to inspect current rating snapshots, layer runs, and team ratings.',
    userRatingsPanelEyebrow: 'Ratings',
    userRatingsPanelTitle: 'Team ratings.',
    userRatingsPanelCopy: 'Browse tournament rating tables built from Base Elo, form, performance, and squad quality signals.',
    userRatingDetailsEyebrow: 'Tournament ratings',
    userRatingDetailsTitle: 'Team rating table.',
    userRatingDetailsCopy: 'Explore the latest team strength ratings for the selected tournament.',
    ratingWeightsTitle: 'Layer weights',
    ratingParametersTitle: 'Snapshot defaults',
    ratingSaveConfig: 'Save configuration',
    ratingConfigSaved: 'Rating configuration saved.',
    ratingOpenTournament: 'Show ratings',
    ratingDetailsEyebrow: 'Tournament ratings',
    ratingDetailsCopy: 'Inspect latest rating runs and refresh snapshots manually for the selected tournament.',
    backToRatings: 'Back to ratings',
    ratingRunSnapshots: 'Snapshot runs',
    ratingModelSetup: 'Model setup',
    ratingIncludedLayers: 'Included layers',
    ratingIncludedLayersCopy: 'Choose which calculated layers contribute to the displayed final rating. Base Elo stays locked because it is the foundation for the model.',
    ratingUpdateModelSetup: 'Update model setup',
    ratingModelSetupUpdated: 'Model setup updated.',
    ratingSnapshotStart: 'Snapshot start',
    ratingSnapshotStartCurrent: 'Current season only',
    ratingSnapshotStartOneBack: '1 season back',
    ratingSnapshotStartTwoBack: '2 seasons back',
    ratingSnapshotStartThreeBack: '3 seasons back',
    ratingSnapshotStartFourBack: '4 seasons back',
    ratingSnapshotStartFiveBack: '5 seasons back',
    ratingSnapshotStartCopy: 'Controls which seasons Base Elo imports into the next rebuild. Use current season only when reliable historic data is missing.',
    ratingTeamRatings: 'Team ratings',
    ratingCheckpoint: 'Checkpoint',
    ratingCheckpointLatest: 'Latest',
    ratingCheckpointRoundOne: 'After Round 1',
    ratingCheckpointRoundTwo: 'After Round 2',
    ratingCompare: 'Compare',
    ratingComparePrevious: 'Previous checkpoint',
    ratingCompareSeasonStart: 'Before season',
    ratingRefreshBase: 'Refresh Base Elo',
    ratingRefreshForm: 'Refresh Form',
    ratingRefreshPerformance: 'Refresh Performance',
    ratingRefreshing: 'Refreshing rating snapshot.',
    ratingRefreshDone: 'Rating snapshot refreshed.',
    ratingNoRun: 'No successful run yet',
    ratingRunId: 'Run ID',
    ratingStarted: 'Started',
    ratingFinished: 'Finished',
    ratingProcessed: 'Processed',
    ratingTeam: 'Team',
    ratingBaseElo: 'Base Elo',
    ratingForm: 'Form',
    ratingPerformance: 'Performance',
    ratingSquad: 'Squad',
    ratingFinal: 'Final rating',
    ratingConfidence: 'Confidence',
    ratingUpdated: 'Updated',
    ratingWeightTotal: 'Weight total',
    ratingConfigBaseEloWeight: 'Base Elo weight',
    ratingConfigFormWeight: 'Form weight',
    ratingConfigPerformanceWeight: 'Performance weight',
    ratingConfigSquadWeight: 'Squad quality weight',
    ratingConfigLeagueWeight: 'League strength weight',
    ratingConfigUncertaintyWeight: 'Uncertainty penalty weight',
    ratingConfigBaseRating: 'Base rating',
    ratingConfigPromotedBaseline: 'Promoted baseline',
    ratingConfigKFactor: 'K-factor',
    ratingConfigHomeAdvantage: 'Home advantage',
    ratingConfigBootstrapSeasons: 'Bootstrap seasons',
    ratingConfigFormMatches: 'Form matches',
    ratingConfigFormScale: 'Form scale',
    ratingConfigFormMax: 'Form max adjustment',
    ratingConfigPerformanceMatches: 'Performance matches',
    ratingConfigPerformanceScale: 'Performance scale',
    ratingConfigPerformanceMax: 'Performance max adjustment',
    backToAdmin: 'Back to admin',
    ratingRebuildActions: [
      { title: 'Rebuild Base Elo', copy: 'Recalculate long-term team strength from completed matches, opponent quality, goal difference, competition weight, and home advantage rules.', meta: 'Matches + historical matches' },
      { title: 'Rebuild Form Rating', copy: 'Refresh short-term adjustments from the latest weighted team results against expected Elo outcomes.', meta: 'Last 5-10 matches' },
      { title: 'Rebuild Performance Rating', copy: 'Update quality-of-play signals from match statistics such as xG, shots, possession, fouls, offsides, and goalkeeper stress.', meta: 'MatchStatistics coverage' },
      { title: 'Rebuild Squad Quality', copy: 'Recalculate squad strength from imported Transfermarkt snapshots, value distribution, player depth, age, and squad composition.', meta: 'Squad snapshots' },
      { title: 'Rebuild Combined Rating', copy: 'Produce the final FTSR layer by combining Base Elo, form, performance, and squad quality into one explainable team rating.', meta: 'FTSR v3.5' },
    ],
    ratingConfigItems: [
      'Base Elo K-factor and goal difference multiplier',
      'Home advantage enabled per tournament',
      'Form window and recency weights',
      'Performance statistic weights and caps',
      'Squad value normalization and depth rules',
      'Combined rating layer weights',
    ],
    ratingHistoryItems: [
      { name: 'Premier League 2026/2027', type: 'Combined Rating', status: 'Draft', date: 'Pending backend wiring' },
      { name: 'Premier League 2026/2027', type: 'Squad Quality', status: 'Prepared', date: 'Static preview' },
      { name: 'Ekstraklasa 2026/2027', type: 'Base Elo', status: 'Prepared', date: 'Static preview' },
    ],
    ratingActiveVersionItems: [
      { label: 'Base Elo', value: 'Latest published run' },
      { label: 'Form Rating', value: 'Latest published run' },
      { label: 'Performance Rating', value: 'Latest published run' },
      { label: 'Squad Quality', value: 'Latest imported snapshot' },
      { label: 'Combined Rating', value: 'Draft until published' },
    ],
    squadsPanelEyebrow: 'Squad administration',
    squadsPanelTitle: 'Squads panel.',
    squadsPanelCopy:
      'Map tournament teams to Transfermarkt sources, review squad coverage, and prepare squad quality inputs for the rating model.',
    squadsTableTitle: 'Tournament squad coverage',
    squadTeamCount: 'Team count',
    squadCoverage: 'Squad coverage',
    squadLastImport: 'Last squad import',
    squadActions: 'Squad actions',
    editSquads: 'Edit squads',
    importSnapshot: 'Import snapshot',
    squadFilterAll: 'All',
    squadFilterUnlinked: 'Without full links',
    squadFilterMissingSnapshots: 'Snapshots not imported',
    noSquadTournaments: 'No tournaments available for squad administration.',
    squadLoadFailed: 'Could not load squad tournament list.',
    notImported: 'Not imported',
    squadActionComingSoon: 'Squad editing will be connected next.',
    squadTeamsTitle: 'Squad mapping',
    squadTeamsCopy: 'Link each team with its Transfermarkt squad page and import the latest squad quality snapshot for the selected season.',
    backToSquads: 'Back to squads',
    squadSelectTournament: 'Choose a tournament to edit squads.',
    squadTeamLoadFailed: 'Could not load tournament squad teams.',
    transfermarktUrl: 'Transfermarkt URL',
    transfermarktMapping: 'Transfermarkt mapping',
    latestSnapshot: 'Latest snapshot',
    totalTeamValue: 'Team value',
    linked: 'Linked',
    notLinked: 'Not linked',
    importRunning: 'Importing...',
    squadImportSuccess: 'Squad snapshot imported.',
    squadImportFailed: 'Could not import squad snapshot.',
    squadBulkImportSuccess: 'Squad snapshots import finished.',
    squadBulkImportNoMappings: 'No Transfermarkt mappings found for this tournament.',
    loading: 'Loading',
    editSquadMappingTitle: 'Edit squad source.',
    editSquadMappingCopy: 'Paste the Transfermarkt club page URL. Import will normalize it to the detailed squad page for the tournament season.',
    saveAndImportSnapshot: 'Save and import snapshot',
    squadSeason: 'Snapshot season',
    adminTournamentOps: 'Tournaments',
    adminTournamentOpsCopy: 'Create new competitions, browse existing tournaments, and open the dedicated tournament administration panel for deeper setup and maintenance.',
    adminCreateTournament: 'Create new tournament',
    adminListTournaments: 'List tournaments',
    adminTournamentsPanel: 'Tournaments panel',
    tournamentsPanelEyebrow: 'Tournament administration',
    tournamentsPanelTitle: 'Tournaments panel.',
    tournamentsPanelCopy:
      'Manage competitions defined in the app. Search the current tournament database, review sync coverage, and open edit or delete actions for each tournament.',
    addTournament: 'Add new tournament',
    tournamentSearch: 'Search tournaments',
    tournamentSearchPlaceholder: 'Search by name, country, or competition',
    tournamentFilterAll: 'All',
    tournamentFilterSynced: 'Synced',
    tournamentFilterNotSynced: 'Not synced',
    tournamentName: 'Tournament',
    competition: 'Competition',
    tournamentSeason: 'Season',
    tournamentCountry: 'Country',
    tournamentTeams: 'Teams',
    tournamentMatches: 'Matches',
    tournamentLastSync: 'Last sync',
    tournamentActions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    open: 'Details',
    noTournaments: 'No tournaments found.',
    neverSynced: 'Never synced',
    tournamentLoadFailed: 'Could not load tournaments.',
    tournamentDeleteSuccess: 'Tournament deleted.',
    tournamentDeleteConfirm: 'Delete this tournament?',
    tournamentDeleteTitle: 'Delete tournament.',
    tournamentDeleteCopy:
      'This will remove the tournament and its related matches, stages, teams, and sync history from the database. This action cannot be undone.',
    cancel: 'Cancel',
    confirmDelete: 'Delete tournament',
    tournamentCreateEyebrow: 'New tournament',
    tournamentCreateTitle: 'Add tournament.',
    tournamentCreateCopy:
      'Paste a LiveScore competition URL, preview discovered metadata, then create the tournament. Creation also runs the initial full sync.',
    tournamentEditEyebrow: 'Tournament setup',
    tournamentEditTitle: 'Edit tournament.',
    tournamentEditCopy:
      'Update the admin-facing name, source URL, and request settings. Source URL changes are allowed only when they still point to the same LiveScore competition.',
    liveScoreUrl: 'LiveScore URL',
    liveScoreUrlPlaceholder: 'https://www.livescore.com/en/football/england/premier-league/',
    tournamentDisplayName: 'Display name',
    tournamentDisplayNamePlaceholder: 'Leave empty to use discovered name',
    locale: 'Locale',
    timezoneOffset: 'Timezone offset',
    previewTournament: 'Preview tournament',
    createTournament: 'Create tournament',
    saveTournament: 'Save tournament',
    tournamentPreviewTitle: 'Discovered metadata',
    tournamentCreated: 'Tournament created.',
    tournamentUpdated: 'Tournament updated.',
    tournamentCreating: 'Creating tournament and running initial sync.',
    tournamentSaving: 'Saving tournament changes.',
    tournamentPreviewLoaded: 'Tournament preview loaded.',
    tournamentNotFound: 'Tournament not found.',
    tournamentUrlInvalid: 'Enter a valid LiveScore competition URL',
    tournamentDetailsEyebrow: 'Tournament Details',
    tournamentDetailsTitle: 'Tournament control panel.',
    tournamentDetailsCopy:
      'Inspect the selected tournament, run LiveScore sync operations, and review recent data coverage without leaving the admin workspace.',
    overview: 'Overview',
    syncOperations: 'Sync operations',
    recentSyncRuns: 'Recent sync runs',
    tournamentDataCoverage: 'Data coverage',
    teams: 'Teams',
    stages: 'Stages',
    matches: 'Matches',
    liveScoreCompetitionId: 'LiveScore competition id',
    baseUrl: 'Base URL',
    fixturesUrl: 'Fixtures URL',
    resultsUrl: 'Results URL',
    created: 'Created',
    updated: 'Updated',
    upcoming: 'Upcoming',
    live: 'Live',
    finalized: 'Finalized',
    problemRecords: 'Problem records',
    missingTeams: 'Missing teams',
    nextMatch: 'Next match',
    lastMatch: 'Last match',
    fullSync: 'Full sync',
    scheduleSync: 'Schedule sync',
    liveSync: 'Live sync',
    finalizeSync: 'Finalize sync',
    resultsSync: 'Results sync',
    fullSyncCopy: 'Refresh fixtures and results with score details.',
    scheduleSyncCopy: 'Refresh schedule changes and future fixtures.',
    liveSyncCopy: 'Update matches currently live or due soon.',
    finalizeSyncCopy: 'Verify finished matches and enrich final details.',
    resultsSyncCopy: 'Reconcile closed matches from the results feed.',
    syncStarted: 'Sync finished.',
    syncFailed: 'Sync failed.',
    mode: 'Mode',
    status: 'Status',
    started: 'Started',
    finished: 'Finished',
    inserted: 'Inserted',
    updatedRows: 'Updated',
    unchanged: 'Unchanged',
    error: 'Error',
    noSyncRuns: 'No sync runs yet.',
    loadingTournament: 'Loading tournament.',
    backToTournaments: 'Back to tournaments',
    activeTournament: 'Active tournament',
    inactiveTournament: 'Inactive tournament',
    homeAdvantage: 'Home advantage',
    homeAdvantageEnabled: 'Home advantage applies',
    homeAdvantageDisabled: 'Neutral ground',
    tournamentActivated: 'Tournament activated.',
    tournamentDeactivated: 'Tournament paused.',
    activateTournamentTitle: 'Activate tournament.',
    deactivateTournamentTitle: 'Deactivate tournament.',
    activateTournamentCopy:
      'Active tournaments are included in hosted background synchronization. Schedule, live, finalize, and results services can keep this tournament up to date automatically.',
    deactivateTournamentCopy:
      'Inactive tournaments are put on hold and skipped by hosted background synchronization. Existing data stays available, and manual sync actions can still be run from this panel.',
    confirmActivate: 'Activate tournament',
    confirmDeactivate: 'Deactivate tournament',
    tabDetails: 'Details',
    tabTeams: 'Teams',
    tabMatches: 'Matches',
    teamName: 'Team',
    abbreviation: 'Abbreviation',
    kickoff: 'Kickoff',
    homeTeam: 'Home',
    awayTeam: 'Away',
    score: 'Score',
    round: 'Round',
    editTeamTitle: 'Edit team.',
    editTeamCopy: 'Adjust the team display name and abbreviation used across tournament views.',
    teamUpdated: 'Team updated.',
    saveTeam: 'Save team',
    editMatchTitle: 'Edit match.',
    editMatchCopy:
      'Adjust match details manually. Live sync may overwrite score, status, and kickoff changes, but manual round and stage edits are preserved.',
    saveMatch: 'Save match',
    matchUpdated: 'Match updated.',
    stage: 'Stage',
    noStage: 'No stage',
    finalScore: 'Final score',
    regularTimeScore: 'Regular time score',
    afterExtraTimeScore: 'After extra time score',
    penaltiesScore: 'Penalties score',
    rawStatus: 'Raw status',
    syncState: 'Sync state',
    addTournamentComingSoon: 'Create tournament flow will be connected next.',
    editTournamentComingSoon: 'Edit tournament flow will be connected next.',
    adminRatingOps: 'Ratings',
    adminRatingOpsCopy: 'Manage rating runs and rebuild Base Elo, form, performance, squad quality, and combined FTSR outputs for selected tournaments.',
    adminSquadOps: 'Squads',
    adminSquadOpsCopy: 'Manage squad sources, map teams to Transfermarkt, import player lists, and maintain squad quality snapshots for rating calculations.',
    adminQualityOps: 'Data quality',
    adminQualityOpsCopy: 'Review missing match statistics, stale squad snapshots, unfinished fixtures, and other data gaps before rating rebuilds run.',
    dataQualityPanelEyebrow: 'Data quality',
    dataQualityPanelTitle: 'Data health desk.',
    dataQualityPanelCopy:
      'A planned review workspace for missing tournament data, stale samples, incomplete match records, squad snapshot age, and sync freshness. This panel is UI-only for now.',
    dataQualityReadinessTitle: 'Data health snapshot',
    dataQualityChecksTitle: 'Tournament data checks',
    dataQualityQueueTitle: 'Issue queue preview',
    dataQualityRatingGateTitle: 'Freshness rules',
    dataQualitySeverity: 'Severity',
    dataQualityArea: 'Area',
    dataQualitySignal: 'Signal',
    dataQualityAction: 'Action',
    dataQualityIssuesFound: 'issues',
    dataQualityCheckedRecords: 'checked',
    dataQualityLastSample: 'last sample',
    dataQualityNoSample: 'No sample',
    dataQualityStatusHealthy: 'Healthy',
    dataQualityStatusReview: 'Needs review',
    dataQualityStatusCritical: 'Critical',
    dataQualityProblems: 'Detected problems',
    dataQualityNoProblems: 'No problems detected for this check.',
    dataQualityTournament: 'Tournament',
    dataQualityEntity: 'Entity',
    dataQualityProblem: 'Problem',
    dataQualitySample: 'Sample',
    dataQualityChecks: [
      { key: 'tournament-structure', title: 'Tournament structure', status: 'Identity', copy: 'Missing identity, teams, stages, LiveScore IDs, or inconsistent season metadata.' },
      { key: 'match-completeness', title: 'Match completeness', status: 'Matches', copy: 'Missing teams, kickoff dates, final scores, unfinished past matches, or manual round/stage review.' },
      { key: 'result-enrichment', title: 'Result enrichment', status: 'Results', copy: 'Extra-time and penalty matches missing regular-time, extra-time, penalty, or incident-derived details.' },
      { key: 'match-statistics', title: 'Match statistics', status: 'Stats', copy: 'Finished matches without MatchStatistics, xG, or usable performance inputs.' },
      { key: 'squad-snapshots', title: 'Squad snapshots', status: 'Squads', copy: 'Teams without Transfermarkt mappings, fresh snapshots, player values, or complete squad metadata.' },
      { key: 'sync-freshness', title: 'Sync freshness', status: 'Jobs', copy: 'Stale sync samples, recent failures, or tournaments outside the expected refresh window.' },
    ],
    adminUsersOps: 'Users and access',
    adminUsersOpsCopy: 'Review users, account status, access level, lockouts, and future role-based visibility controls.',
    usersPanelEyebrow: 'Users and access',
    usersPanelTitle: 'Access control.',
    usersPanelCopy:
      'A future admin workspace for account review, role assignment, activation state, lockouts, API keys, and access audit checks. This screen is UI-only for now.',
    usersDirectoryTitle: 'User directory',
    usersAccessTitle: 'Access model',
    usersAuditTitle: 'Audit signals',
    userEmail: 'Email',
    userDisplayName: 'Display name',
    userRole: 'Role',
    userStatus: 'Status',
    userLastSeen: 'Last seen',
    userActions: 'Actions',
    userSearch: 'Search users',
    userSearchPlaceholder: 'Search by email, display name, or role',
    userFilterAll: 'All',
    userFilterActive: 'Active',
    userFilterPending: 'Pending',
    userFilterLocked: 'Locked',
    userDetailsTitle: 'User details.',
    userDetailsCopy: 'Review account identity, access status, roles, and confirmation state.',
    userSuspendTitle: 'Suspend user.',
    userSuspendCopy: 'Suspended users are locked out and cannot access protected application views until access is restored.',
    userUnsuspendTitle: 'Unsuspend user.',
    userUnsuspendCopy: 'This restores access for the selected user if their account credentials are otherwise valid.',
    userDeleteTitle: 'Delete user.',
    userDeleteCopy: 'This removes the user account from the system. This action cannot be undone.',
    userSuspendSuccess: 'User suspended.',
    userUnsuspendSuccess: 'User unsuspended.',
    userDeleteSuccess: 'User deleted.',
    userRoleChangeSuccess: 'User role updated.',
    userConfirmationResent: 'Confirmation email sent.',
    emailConfirmed: 'Email confirmed',
    yes: 'Yes',
    no: 'No',
    details: 'Details',
    actions: 'Actions',
    suspend: 'Suspend',
    unsuspend: 'Unsuspend',
    changeRole: 'Change role',
    resendConfirmation: 'Resend confirmation email',
    adminUserActionsTitle: 'User actions.',
    adminUserActionsCopy: 'Choose an account operation. Destructive access actions ask for confirmation before they are executed.',
    confirmAction: 'Confirm action',
    accessPrepared: 'Prepared',
    accessActive: 'Active',
    accessPending: 'Pending',
    accessLocked: 'Locked',
    accessRoleItems: [
      'Admin users can manage tournaments, squads, rating rebuilds, and future system jobs.',
      'Regular users can browse dashboards, public rating outputs, and their own profile.',
      'Future super admin controls can be reserved for destructive maintenance and role changes.',
    ],
    accessAuditItems: ['Email confirmation state', 'Password reset events', 'API key rotation', 'Failed login attempts', 'Account lockouts', 'Role changes'],
    sampleUsers: [
      { email: 'pudel1985@gmail.com', name: 'pudel1985', role: 'Admin', status: 'Active', lastSeen: 'Current session' },
      { email: 'analyst@example.com', name: 'League Analyst', role: 'User', status: 'Pending', lastSeen: 'Not yet active' },
      { email: 'operator@example.com', name: 'Data Operator', role: 'Admin', status: 'Locked', lastSeen: 'Static preview' },
    ],
    adminSystemJobsOps: 'System jobs',
    adminSystemJobsOpsCopy: 'Monitor scheduled sync services, intervals, recent runs, failures, and background processing health.',
    systemJobsPanelEyebrow: 'System jobs',
    systemJobsPanelTitle: 'Background sync control.',
    systemJobsPanelCopy:
      'A future operator panel for scheduled LiveScore synchronization, finalization checks, squad imports, and rating rebuild queues. This screen is UI-only for now.',
    systemJobsCoreTitle: 'Hosted services',
    systemJobsGlobalSyncTitle: 'Global sync operations',
    systemJobsRecentTitle: 'Recent sync runs',
    systemJobsHealthTitle: 'Service health',
    systemJobsPrepared: 'Prepared',
    systemJobsPaused: 'Paused',
    systemJobsManual: 'Manual',
    systemJobsLive: 'Live',
    systemJobsOnHold: 'On hold',
    systemJobsService: 'Service',
    systemJobsPurpose: 'Purpose',
    systemJobsEditService: 'Edit service',
    systemJobsSaveService: 'Save service',
    systemJobsInterval: 'Interval',
    systemJobsHoldService: 'Put service on hold',
    systemJobsServiceUpdated: 'Service settings updated locally.',
    systemJobsGlobalSyncCopy: 'These actions are planned to run against all active tournaments, not a single tournament.',
    systemJobsNextRun: 'Next run',
    systemJobsLastRun: 'Last run',
    systemJobsLastSuccess: 'Last success',
    systemJobsLastFailure: 'Last failure',
    systemJobsEligibleTournaments: 'Eligible tournaments',
    systemJobsRuns24h: 'Runs 24h',
    systemJobsFailures24h: 'Failures 24h',
    systemJobsCoreItems: [
      { serviceKey: 'schedule-sync', title: 'Schedule sync service', cadence: 'Every 60 minutes', status: 'Live', nextRun: '08:00', copy: 'Refreshes fixture dates, postponed games, unknown qualified teams, tournament metadata, and future match structure.' },
      { serviceKey: 'live-results', title: 'Live results service', cadence: 'Every 1 minute', status: 'Live', nextRun: 'When kickoff is due', copy: 'Checks competition fixtures around scheduled kickoff windows and updates live scores without individual match calls.' },
      { serviceKey: 'match-finalizer', title: 'Match finalizer service', cadence: 'Every 1 minute', status: 'Live', nextRun: 'After live window', copy: 'Detects matches that moved from fixtures to results, confirms final status, and closes records.' },
      { title: 'Match details extractor', cadence: 'Uses finalizer interval', status: 'Live', nextRun: 'AET/AP only', copy: 'Requests individual match incidents only when extra time, penalties, or richer final details are required.' },
      { serviceKey: 'results-safety-net', title: 'Results safety net service', cadence: 'Every 1440 minutes', status: 'Live', nextRun: '03:30', copy: 'Re-reads completed matches as a slower reconciliation pass for missed statuses, late corrections, or service interruptions.' },
    ],
    systemJobHealthItems: [
      { label: 'Scheduler', value: 'Ready', note: 'Hosted timer registration placeholder' },
      { label: 'LiveScore API', value: 'Not checked', note: 'Future latency and failure monitor' },
      { label: 'Email worker', value: 'Ready', note: 'Auth messages already wired in backend' },
      { label: 'Rating worker', value: 'Manual', note: 'Prepared for queued rebuilds' },
    ],
    systemJobRecentRuns: [
      { job: 'Schedule sync service', mode: 'schedule', tournament: 'All active tournaments', time: 'Today 06:00', result: '104 unchanged', status: 'Succeeded' },
      { job: 'Match finalizer service', mode: 'finalize', tournament: 'All active tournaments', time: 'Today 05:58', result: '7 finalized', status: 'Succeeded' },
      { job: 'Results safety net service', mode: 'results', tournament: 'All active tournaments', time: 'Yesterday 03:30', result: '89 checked', status: 'Succeeded' },
    ],
    adminPlaceholder: 'Not wired yet',
    backHome: 'Back to home',
    heroEyebrow: 'Football intelligence platform',
    heroTitle: 'Team ratings that explain themselves before kickoff.',
    heroCopy:
      'A modern football analytics app built around FTSR: Elo foundation, live result sync, form, performance signals, squad value, and operator-grade data controls.',
    explore: 'Explore Platform',
    signIn: 'Sign In',
    combinedRating: 'Combined Rating',
    dataFeeds: 'Data feeds',
    adminJobs: 'Admin jobs',
    modelEyebrow: 'Model stack',
    modelTitle: 'From raw matches to a readable team strength score.',
    modelCopy:
      'Each module stays independent, so the final rating can be explained, tuned, rebuilt, and tested without turning into a black box.',
    workspaceEyebrow: 'Logged-in experience',
    workspaceTitle: 'A working desk for ratings, matches, squads, and predictions.',
    workspaceCopy:
      'Regular users get clear rating tables, trend movement, team pages, match context, and confidence signals. The app should feel quick, factual, and useful during the football week.',
    dataCoverage: 'Data coverage',
    pipelineEyebrow: 'Data pipeline',
    pipelineTitle: 'Designed for overnight syncs and matchday refreshes.',
    adminEyebrow: 'Admin panel',
    adminTitle: 'Control room for the data that powers the ratings.',
    ctaEyebrow: 'Next phase',
    ctaTitle: 'Ready for authentication, routing, and real backend integration.',
    ctaCopy:
      'The public story is now in place. The logged-in application can grow from this visual language into dashboards, admin workflows, and rating explainers.',
    footerCopy:
      'Explainable football team ratings powered by results, statistics, squad quality, and transparent model components.',
    language: 'Language',
    legal: 'Built for football analytics research.',
    loginTitle: 'Welcome back.',
    loginCopy: 'Sign in to continue to ratings, match intelligence, and admin tools.',
    registerTitle: 'Create your account.',
    registerCopy: 'Join the workspace and start exploring team strength models.',
    forgotPassword: 'Forgot Password?',
    resendActivation: "Didn't receive an activation email?",
    forgotPasswordEyebrow: 'Password recovery',
    forgotPasswordTitle: 'Reset your password.',
    forgotPasswordCopy: 'Enter your email and we will request a password reset link.',
    resendActivationEyebrow: 'Account activation',
    resendActivationTitle: 'Send activation again.',
    resendActivationCopy: 'Enter your email and we will send another activation message.',
    confirmEmailEyebrow: 'Email confirmation',
    confirmEmailLoadingTitle: 'Confirming your account.',
    confirmEmailLoadingCopy: 'Please wait while we validate your activation link.',
    confirmEmailSuccessTitle: 'Account confirmed.',
    confirmEmailSuccessCopy: 'Your email address is confirmed. You can now log in.',
    confirmEmailFailureTitle: 'Confirmation failed.',
    confirmEmailFailureCopy: 'The activation link is missing, expired, or invalid. You can request a new activation email.',
    resetPasswordEyebrow: 'Password reset',
    resetPasswordTitle: 'Set a new password.',
    resetPasswordCopy: 'Choose a new password for your account and confirm the change.',
    resetPasswordInvalidLink: 'The reset password link is missing required data.',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    setNewPassword: 'Set new password',
    passwordResetSuccess: 'Password has been reset. You can log in now.',
    sendResetLink: 'Send reset link',
    resendEmail: 'Resend email',
    backToLogin: 'Back to login',
    goToResendActivation: 'Go to resend activation',
    resetRequested: 'Password reset request sent',
    activationRequested: 'Activation email request sent',
    email: 'Email',
    displayName: 'Display name',
    password: 'Password',
    confirmPassword: 'Confirm password',
    acceptTermsPrefix: 'I accept the',
    termsAndConditions: 'terms and conditions',
    termsTitle: 'Terms and conditions',
    termsCopy: 'The terms page is ready as a route placeholder. Full regulations content can be added later.',
    submitLogin: 'Login',
    submitRegister: 'Register',
    noAccount: 'No account yet?',
    hasAccount: 'Already have an account?',
    createAccount: 'Create account',
    useExisting: 'Use existing account',
    required: 'This field is required',
    termsRequired: 'Consent is required',
    emailInvalid: 'Enter a valid email address',
    passwordShort: 'Password must contain at least 6 characters',
    passwordMismatch: 'Passwords do not match',
    validationFailed: 'Please correct the highlighted fields',
    loginSuccess: 'Login successful.',
    registerSuccess: 'Registration successful. Check your email to activate the account.',
    logoutSuccess: 'You have been logged out.',
    genericError: 'Something went wrong. Please try again.',
    dashboardTitle: 'You are signed in.',
    dashboardCopy:
      'Manage your account and verify that authenticated backend calls are working.',
    dashboardEyebrow: 'Command center',
    dashboardHomeTitle: 'Good to have you back.',
    dashboardHomeCopy:
      'Your rating workspace is ready. Live data widgets will land here next; for now this dashboard frames the key areas of the product.',
    dashboardProfileAction: 'Open profile',
    dashboardCards: [
      ['Combined Rating', 'FTSR', 'Base Elo, form, performance, and squad quality prepared as separate explainable layers.'],
      ['Live Sync', 'Ready', 'Schedule, live, finalize, and results jobs can feed the match database behind this workspace.'],
      ['Admin Flow', 'Next', 'Tournament sync, Transfermarkt mapping, rating rebuilds, and data checks will sit in the operator panel.'],
    ],
    dashboardSignalsTitle: 'Today at a glance',
    dashboardSignals: ['Premier League model: active', 'Latest rating run: waiting for live data', 'Squad snapshots: mapped manually by admin'],
    authHint: 'Auth token stored locally for API calls.',
    profileEyebrow: 'Account',
    profileTitle: 'Account settings.',
    profileCopy: 'Your profile, password, email, and API key actions are live against the backend.',
    memberSince: 'Member since',
    saveProfile: 'Save profile',
    profileSaved: 'Profile updated',
    changePasswordTitle: 'Change password',
    currentPassword: 'Current password',
    changePassword: 'Change password',
    passwordChanged: 'Password changed',
    changeEmailTitle: 'Change email',
    newEmail: 'New email',
    changeEmail: 'Change email',
    emailChanged: 'Email changed',
    rotateApiKeyTitle: 'API key',
    rotateApiKey: 'Rotate API key',
    newApiKey: 'New API key',
    apiKeyRotated: 'API key rotated. Store it now; it will not be shown again.',
    profileLoadFailed: 'Could not load profile.',
    sessionExpired: 'Session expired. Please log in again.',
  },
  pl: {
    brand: 'Football Rating Engine',
    loginRegister: 'Logowanie / Rejestracja',
    logout: 'Wyloguj',
    profile: 'Profil',
    openMenu: 'Otwórz menu',
    closeMenu: 'Zamknij menu',
    menuHome: 'Home',
    menuRatings: 'Ratingi',
    menuTeams: 'Drużyny',
    menuMatches: 'Mecze',
    menuApi: 'API',
    menuPredictions: 'Predykcje',
    menuAdmin: 'Admin',
    menuSoon: 'Wkrótce',
    apiPanelEyebrow: 'Dostęp API',
    apiPanelTitle: 'API danych meczowych.',
    apiPanelCopy: 'Użyj swojego API key, aby pobierać listy meczów, wyniki, mecze live i nadchodzące spotkania z zewnętrznych narzędzi.',
    apiHeaderTitle: 'Autoryzacja',
    apiHeaderCopy: 'Przekaż klucz w poniższym nagłówku requestu. Klucz możesz zmienić w profilu.',
    apiEndpointsTitle: 'Endpointy meczowe',
    apiEndpointAll: 'Wszystkie mecze turnieju',
    apiEndpointResults: 'Zakończone wyniki',
    apiEndpointLive: 'Mecze live',
    apiEndpointUpcoming: 'Nadchodzące mecze',
    apiEndpointSingle: 'Szczegóły jednego meczu',
    apiKeyHeader: 'Nagłówek',
    adminPanelEyebrow: 'Panel administratora',
    adminPanelTitle: 'Centrum operacyjne.',
    adminPanelCopy:
      'Strukturalny workspace dla sync jobów, rebuildów ratingów, importów kadr i kontroli jakości danych. Kontrolki są na razie placeholderami gotowymi do podpięcia pod backend.',
    adminOverview: 'Przegląd',
    ratingsPanelEyebrow: 'Operacje ratingów',
    ratingsPanelTitle: 'Panel ratingów.',
    ratingsPanelCopy:
      'Zarządzaj konfiguracją modelu i otwieraj snapshoty ratingowe turniejów dla Base Elo, formy, performance, jakości kadry i łącznego FTSR.',
    ratingRebuildsTitle: 'Rebuildy ratingów',
    ratingConfigTitle: 'Konfiguracja ratingów',
    ratingHistoryTitle: 'Historia ratingów',
    ratingActiveVersionsTitle: 'Aktywne wersje ratingów',
    ratingActionPrepared: 'Przygotowane',
    ratingTournamentListTitle: 'Ratingi turniejów',
    ratingTournamentListCopy: 'Otwórz turniej, aby sprawdzić aktualne snapshoty ratingów, runy warstw i ratingi drużyn.',
    userRatingsPanelEyebrow: 'Ratingi',
    userRatingsPanelTitle: 'Ratingi drużyn.',
    userRatingsPanelCopy: 'Przeglądaj tabele ratingów turniejów budowane z Base Elo, formy, performance i jakości kadry.',
    userRatingDetailsEyebrow: 'Ratingi turnieju',
    userRatingDetailsTitle: 'Tabela ratingów drużyn.',
    userRatingDetailsCopy: 'Sprawdź aktualne ratingi siły drużyn dla wybranego turnieju.',
    ratingWeightsTitle: 'Wagi warstw',
    ratingParametersTitle: 'Domyślne snapshotów',
    ratingSaveConfig: 'Zapisz konfigurację',
    ratingConfigSaved: 'Konfiguracja ratingów zapisana.',
    ratingOpenTournament: 'Pokaż ratingi',
    ratingDetailsEyebrow: 'Ratingi turnieju',
    ratingDetailsCopy: 'Sprawdzaj ostatnie runy ratingowe i ręcznie odświeżaj snapshoty dla wybranego turnieju.',
    backToRatings: 'Wróć do ratingów',
    ratingRunSnapshots: 'Snapshot runy',
    ratingModelSetup: 'Ustawienia modelu',
    ratingIncludedLayers: 'Aktywne warstwy',
    ratingIncludedLayersCopy: 'Wybierz, które warstwy wchodzą do wyświetlanego ratingu końcowego. Base Elo jest zablokowane, bo stanowi fundament modelu.',
    ratingUpdateModelSetup: 'Zaktualizuj ustawienia modelu',
    ratingModelSetupUpdated: 'Ustawienia modelu zaktualizowane.',
    ratingSnapshotStart: 'Start snapshotu',
    ratingSnapshotStartCurrent: 'Tylko aktualny sezon',
    ratingSnapshotStartOneBack: '1 sezon wstecz',
    ratingSnapshotStartTwoBack: '2 sezony wstecz',
    ratingSnapshotStartThreeBack: '3 sezony wstecz',
    ratingSnapshotStartFourBack: '4 sezony wstecz',
    ratingSnapshotStartFiveBack: '5 sezonów wstecz',
    ratingSnapshotStartCopy: 'Steruje tym, które sezony Base Elo pobierze przy następnym rebuildzie. Użyj aktualnego sezonu, gdy historia jest niepełna.',
    ratingTeamRatings: 'Ratingi drużyn',
    ratingCheckpoint: 'Punkt kontrolny',
    ratingCheckpointLatest: 'Najnowszy',
    ratingCheckpointRoundOne: 'Po 1. kolejce',
    ratingCheckpointRoundTwo: 'Po 2. kolejce',
    ratingCompare: 'Porównaj',
    ratingComparePrevious: 'Poprzedni punkt',
    ratingCompareSeasonStart: 'Przed sezonem',
    ratingRefreshBase: 'Odśwież Base Elo',
    ratingRefreshForm: 'Odśwież Formę',
    ratingRefreshPerformance: 'Odśwież Performance',
    ratingRefreshing: 'Odświeżanie snapshotu ratingowego.',
    ratingRefreshDone: 'Snapshot ratingowy odświeżony.',
    ratingNoRun: 'Brak udanego runu',
    ratingRunId: 'Run ID',
    ratingStarted: 'Start',
    ratingFinished: 'Koniec',
    ratingProcessed: 'Przetworzone',
    ratingTeam: 'Drużyna',
    ratingBaseElo: 'Base Elo',
    ratingForm: 'Forma',
    ratingPerformance: 'Performance',
    ratingSquad: 'Kadra',
    ratingFinal: 'Rating końcowy',
    ratingConfidence: 'Pewność',
    ratingUpdated: 'Aktualizacja',
    ratingWeightTotal: 'Suma wag',
    ratingConfigBaseEloWeight: 'Waga Base Elo',
    ratingConfigFormWeight: 'Waga formy',
    ratingConfigPerformanceWeight: 'Waga performance',
    ratingConfigSquadWeight: 'Waga jakości kadry',
    ratingConfigLeagueWeight: 'Waga siły ligi',
    ratingConfigUncertaintyWeight: 'Waga kary niepewności',
    ratingConfigBaseRating: 'Rating bazowy',
    ratingConfigPromotedBaseline: 'Baseline beniaminków',
    ratingConfigKFactor: 'K-factor',
    ratingConfigHomeAdvantage: 'Przewaga domu',
    ratingConfigBootstrapSeasons: 'Sezony bootstrap',
    ratingConfigFormMatches: 'Mecze formy',
    ratingConfigFormScale: 'Skala formy',
    ratingConfigFormMax: 'Maks. korekta formy',
    ratingConfigPerformanceMatches: 'Mecze performance',
    ratingConfigPerformanceScale: 'Skala performance',
    ratingConfigPerformanceMax: 'Maks. korekta performance',
    backToAdmin: 'Wróć do admina',
    ratingRebuildActions: [
      { title: 'Przelicz Base Elo', copy: 'Przelicz długoterminową siłę drużyn z zakończonych meczów, jakości przeciwnika, różnicy bramek, wagi rozgrywek i zasad przewagi gospodarza.', meta: 'Mecze + historia' },
      { title: 'Przelicz Form Rating', copy: 'Odśwież krótkoterminowe korekty z ostatnich ważonych wyników drużyny względem oczekiwań Elo.', meta: 'Ostatnie 5-10 meczów' },
      { title: 'Przelicz Performance Rating', copy: 'Zaktualizuj jakość gry ze statystyk meczowych takich jak xG, strzały, posiadanie, faule, spalone i presja na bramkarza.', meta: 'Pokrycie MatchStatistics' },
      { title: 'Przelicz Squad Quality', copy: 'Przelicz siłę kadry ze snapshotów Transfermarkt, rozkładu wartości, głębi składu, wieku i kompozycji drużyny.', meta: 'Snapshoty kadr' },
      { title: 'Przelicz Combined Rating', copy: 'Wygeneruj finalną warstwę FTSR łączącą Base Elo, formę, performance i squad quality w jeden wyjaśnialny rating.', meta: 'FTSR v3.5' },
    ],
    ratingConfigItems: [
      'K-factor Base Elo i mnożnik różnicy bramek',
      'Przewaga gospodarza ustawiana per turniej',
      'Okno formy i wagi świeżości meczów',
      'Wagi statystyk performance i limity korekt',
      'Normalizacja wartości kadr i zasady głębi składu',
      'Wagi warstw ratingu łączonego',
    ],
    ratingHistoryItems: [
      { name: 'Premier League 2026/2027', type: 'Combined Rating', status: 'Draft', date: 'Czeka na backend' },
      { name: 'Premier League 2026/2027', type: 'Squad Quality', status: 'Przygotowane', date: 'Statyczny preview' },
      { name: 'Ekstraklasa 2026/2027', type: 'Base Elo', status: 'Przygotowane', date: 'Statyczny preview' },
    ],
    ratingActiveVersionItems: [
      { label: 'Base Elo', value: 'Ostatni opublikowany run' },
      { label: 'Form Rating', value: 'Ostatni opublikowany run' },
      { label: 'Performance Rating', value: 'Ostatni opublikowany run' },
      { label: 'Squad Quality', value: 'Ostatni zaimportowany snapshot' },
      { label: 'Combined Rating', value: 'Draft do publikacji' },
    ],
    squadsPanelEyebrow: 'Administracja kadrami',
    squadsPanelTitle: 'Panel kadr.',
    squadsPanelCopy:
      'Mapuj drużyny turniejowe do źródeł Transfermarkt, sprawdzaj pokrycie kadr i przygotowuj dane squad quality dla modelu ratingowego.',
    squadsTableTitle: 'Pokrycie kadr w turniejach',
    squadTeamCount: 'Liczba drużyn',
    squadCoverage: 'Pokrycie kadr',
    squadLastImport: 'Ostatni import kadr',
    squadActions: 'Akcje kadr',
    editSquads: 'Edytuj kadry',
    importSnapshot: 'Importuj snapshot',
    squadFilterAll: 'Wszystkie',
    squadFilterUnlinked: 'Bez pełnego mapowania',
    squadFilterMissingSnapshots: 'Bez snapshotów',
    noSquadTournaments: 'Brak turniejów dostępnych dla administracji kadr.',
    squadLoadFailed: 'Nie udało się pobrać listy turniejów dla kadr.',
    notImported: 'Brak importu',
    squadActionComingSoon: 'Edycja kadr zostanie podpięta w kolejnym kroku.',
    squadTeamsTitle: 'Mapowanie kadr',
    squadTeamsCopy: 'Połącz każdą drużynę ze stroną kadry Transfermarkt i zaimportuj najnowszy snapshot squad quality dla wybranego sezonu.',
    backToSquads: 'Wróć do kadr',
    squadSelectTournament: 'Wybierz turniej, aby edytować kadry.',
    squadTeamLoadFailed: 'Nie udało się pobrać drużyn turnieju.',
    transfermarktUrl: 'URL Transfermarkt',
    transfermarktMapping: 'Mapowanie Transfermarkt',
    latestSnapshot: 'Ostatni snapshot',
    totalTeamValue: 'Wartość drużyny',
    linked: 'Połączono',
    notLinked: 'Brak mapowania',
    importRunning: 'Import...',
    squadImportSuccess: 'Snapshot kadry zaimportowany.',
    squadImportFailed: 'Nie udało się zaimportować snapshotu kadry.',
    squadBulkImportSuccess: 'Import snapshotów kadr zakończony.',
    squadBulkImportNoMappings: 'Nie znaleziono mapowań Transfermarkt dla tego turnieju.',
    loading: 'Ładowanie',
    editSquadMappingTitle: 'Edytuj źródło kadry.',
    editSquadMappingCopy: 'Wklej URL strony klubu Transfermarkt. Import znormalizuje go do szczegółowej strony kadry dla sezonu turnieju.',
    saveAndImportSnapshot: 'Zapisz i importuj snapshot',
    squadSeason: 'Sezon snapshotu',
    adminTournamentOps: 'Turnieje',
    adminTournamentOpsCopy: 'Twórz nowe rozgrywki, przeglądaj istniejące turnieje i otwieraj dedykowany panel administracji turniejami do konfiguracji oraz utrzymania.',
    adminCreateTournament: 'Utwórz nowy turniej',
    adminListTournaments: 'Lista turniejów',
    adminTournamentsPanel: 'Panel turniejów',
    tournamentsPanelEyebrow: 'Administracja turniejami',
    tournamentsPanelTitle: 'Panel turniejów.',
    tournamentsPanelCopy:
      'Zarządzaj rozgrywkami zdefiniowanymi w aplikacji. Przeszukuj bazę turniejów, sprawdzaj pokrycie sync i otwieraj akcje edycji lub usuwania dla każdego turnieju.',
    addTournament: 'Dodaj nowy turniej',
    tournamentSearch: 'Szukaj turniejów',
    tournamentSearchPlaceholder: 'Szukaj po nazwie, kraju lub rozgrywkach',
    tournamentFilterAll: 'Wszystkie',
    tournamentFilterSynced: 'Zsynchronizowane',
    tournamentFilterNotSynced: 'Bez synchronizacji',
    tournamentName: 'Turniej',
    competition: 'Rozgrywki',
    tournamentSeason: 'Sezon',
    tournamentCountry: 'Kraj',
    tournamentTeams: 'Drużyny',
    tournamentMatches: 'Mecze',
    tournamentLastSync: 'Ostatni sync',
    tournamentActions: 'Akcje',
    edit: 'Edytuj',
    delete: 'Usuń',
    open: 'Szczegóły',
    noTournaments: 'Nie znaleziono turniejów.',
    neverSynced: 'Nigdy',
    tournamentLoadFailed: 'Nie udało się pobrać turniejów.',
    tournamentDeleteSuccess: 'Turniej usunięty.',
    tournamentDeleteConfirm: 'Usunąć ten turniej?',
    tournamentDeleteTitle: 'Usuń turniej.',
    tournamentDeleteCopy:
      'To usunie turniej oraz powiązane mecze, etapy, drużyny i historię synchronizacji z bazy danych. Tej akcji nie można cofnąć.',
    cancel: 'Anuluj',
    confirmDelete: 'Usuń turniej',
    tournamentCreateEyebrow: 'Nowy turniej',
    tournamentCreateTitle: 'Dodaj turniej.',
    tournamentCreateCopy:
      'Wklej URL rozgrywek z LiveScore, sprawdź wykryte metadane, a potem utwórz turniej. Utworzenie uruchamia też pierwszy pełny sync.',
    tournamentEditEyebrow: 'Konfiguracja turnieju',
    tournamentEditTitle: 'Edytuj turniej.',
    tournamentEditCopy:
      'Zmień nazwę widoczną w panelu, URL źródłowy i ustawienia zapytań. Zmiana URL jest dozwolona tylko wtedy, gdy nadal wskazuje te same rozgrywki LiveScore.',
    liveScoreUrl: 'URL LiveScore',
    liveScoreUrlPlaceholder: 'https://www.livescore.com/en/football/england/premier-league/',
    tournamentDisplayName: 'Nazwa wyświetlana',
    tournamentDisplayNamePlaceholder: 'Zostaw puste, aby użyć wykrytej nazwy',
    locale: 'Locale',
    timezoneOffset: 'Przesunięcie strefy czasowej',
    previewTournament: 'Podgląd turnieju',
    createTournament: 'Utwórz turniej',
    saveTournament: 'Zapisz turniej',
    tournamentPreviewTitle: 'Wykryte metadane',
    tournamentCreated: 'Turniej utworzony.',
    tournamentUpdated: 'Turniej zaktualizowany.',
    tournamentCreating: 'Tworzymy turniej i uruchamiamy pierwszy sync.',
    tournamentSaving: 'Zapisujemy zmiany turnieju.',
    tournamentPreviewLoaded: 'Podgląd turnieju pobrany.',
    tournamentNotFound: 'Nie znaleziono turnieju.',
    tournamentUrlInvalid: 'Podaj prawidłowy URL rozgrywek LiveScore',
    tournamentDetailsEyebrow: 'Szczegóły turnieju',
    tournamentDetailsTitle: 'Panel kontroli turnieju.',
    tournamentDetailsCopy:
      'Sprawdzaj wybrany turniej, uruchamiaj synchronizacje LiveScore i kontroluj pokrycie danych bez wychodzenia z panelu admina.',
    overview: 'Przegląd',
    syncOperations: 'Operacje sync',
    recentSyncRuns: 'Ostatnie sync runy',
    tournamentDataCoverage: 'Pokrycie danych',
    teams: 'Drużyny',
    stages: 'Etapy',
    matches: 'Mecze',
    liveScoreCompetitionId: 'LiveScore competition id',
    baseUrl: 'Bazowy URL',
    fixturesUrl: 'Fixtures URL',
    resultsUrl: 'Results URL',
    created: 'Utworzono',
    updated: 'Zaktualizowano',
    upcoming: 'Nadchodzące',
    live: 'Live',
    finalized: 'Zamknięte',
    problemRecords: 'Problematyczne rekordy',
    missingTeams: 'Brakujące drużyny',
    nextMatch: 'Następny mecz',
    lastMatch: 'Ostatni mecz',
    fullSync: 'Pełny sync',
    scheduleSync: 'Schedule sync',
    liveSync: 'Live sync',
    finalizeSync: 'Finalize sync',
    resultsSync: 'Results sync',
    fullSyncCopy: 'Odświeża fixtures i results razem ze szczegółami wyników.',
    scheduleSyncCopy: 'Odświeża zmiany terminarza i przyszłe mecze.',
    liveSyncCopy: 'Aktualizuje mecze live oraz te, które zaraz startują.',
    finalizeSyncCopy: 'Potwierdza zakończone mecze i uzupełnia detale.',
    resultsSyncCopy: 'Uzgadnia zamknięte mecze z zakładki results.',
    syncStarted: 'Sync zakończony.',
    syncFailed: 'Sync nieudany.',
    mode: 'Tryb',
    status: 'Status',
    started: 'Start',
    finished: 'Koniec',
    inserted: 'Dodane',
    updatedRows: 'Zmienione',
    unchanged: 'Bez zmian',
    error: 'Błąd',
    noSyncRuns: 'Brak sync runów.',
    loadingTournament: 'Ładowanie turnieju.',
    backToTournaments: 'Wróć do turniejów',
    activeTournament: 'Turniej aktywny',
    inactiveTournament: 'Turniej nieaktywny',
    homeAdvantage: 'Przewaga gospodarza',
    homeAdvantageEnabled: 'Przewaga gospodarza działa',
    homeAdvantageDisabled: 'Neutralny teren',
    tournamentActivated: 'Turniej aktywowany.',
    tournamentDeactivated: 'Turniej wstrzymany.',
    activateTournamentTitle: 'Aktywuj turniej.',
    deactivateTournamentTitle: 'Dezaktywuj turniej.',
    activateTournamentCopy:
      'Aktywne turnieje są uwzględniane przez hosted background synchronization. Serwisy schedule, live, finalize i results mogą automatycznie utrzymywać turniej aktualny.',
    deactivateTournamentCopy:
      'Nieaktywne turnieje są wstrzymane i pomijane przez hosted background synchronization. Istniejące dane zostają dostępne, a ręczne sync actions nadal można uruchamiać z tego panelu.',
    confirmActivate: 'Aktywuj turniej',
    confirmDeactivate: 'Dezaktywuj turniej',
    tabDetails: 'Szczegóły',
    tabTeams: 'Drużyny',
    tabMatches: 'Mecze',
    teamName: 'Drużyna',
    abbreviation: 'Skrót',
    kickoff: 'Start',
    homeTeam: 'Gospodarz',
    awayTeam: 'Gość',
    score: 'Wynik',
    round: 'Runda',
    editTeamTitle: 'Edytuj drużynę.',
    editTeamCopy: 'Zmień nazwę wyświetlaną drużyny i skrót używany w widokach turnieju.',
    teamUpdated: 'Drużyna zaktualizowana.',
    saveTeam: 'Zapisz drużynę',
    editMatchTitle: 'Edytuj mecz.',
    editMatchCopy:
      'Zmień szczegóły meczu ręcznie. Live sync może nadpisać wynik, status i godzinę, ale ręcznie ustawiona runda oraz etap zostaną zachowane.',
    saveMatch: 'Zapisz mecz',
    matchUpdated: 'Mecz zaktualizowany.',
    stage: 'Etap',
    noStage: 'Bez etapu',
    finalScore: 'Wynik końcowy',
    regularTimeScore: 'Wynik po regulaminowym czasie',
    afterExtraTimeScore: 'Wynik po dogrywce',
    penaltiesScore: 'Karne',
    rawStatus: 'Status źródłowy',
    syncState: 'Stan sync',
    addTournamentComingSoon: 'Flow tworzenia turnieju zostanie podpięty w kolejnym kroku.',
    editTournamentComingSoon: 'Flow edycji turnieju zostanie podpięty w kolejnym kroku.',
    adminRatingOps: 'Ratingi',
    adminRatingOpsCopy: 'Zarządzaj rating runami i przeliczaj Base Elo, formę, performance, jakość kadry oraz łączny FTSR dla wybranych turniejów.',
    adminSquadOps: 'Kadry',
    adminSquadOpsCopy: 'Zarządzaj źródłami kadr, mapuj drużyny do Transfermarkt, importuj listy zawodników i utrzymuj snapshoty jakości kadr dla ratingów.',
    adminQualityOps: 'Jakość danych',
    adminQualityOpsCopy: 'Sprawdzaj brakujące statystyki meczowe, stare snapshoty kadr, niezakończone fixtures i inne luki danych przed rebuildami ratingów.',
    dataQualityPanelEyebrow: 'Jakość danych',
    dataQualityPanelTitle: 'Panel zdrowia danych.',
    dataQualityPanelCopy:
      'Planowany workspace do przeglądu brakujących danych turniejów, starych próbek, niepełnych rekordów meczów, wieku snapshotów kadr i świeżości sync. Na razie to tylko UI.',
    dataQualityReadinessTitle: 'Snapshot zdrowia danych',
    dataQualityChecksTitle: 'Kontrole danych turniejów',
    dataQualityQueueTitle: 'Podgląd kolejki problemów',
    dataQualityRatingGateTitle: 'Reguły świeżości',
    dataQualitySeverity: 'Priorytet',
    dataQualityArea: 'Obszar',
    dataQualitySignal: 'Sygnał',
    dataQualityAction: 'Akcja',
    dataQualityIssuesFound: 'problemów',
    dataQualityCheckedRecords: 'sprawdzone',
    dataQualityLastSample: 'ostatnia próbka',
    dataQualityNoSample: 'Brak próbki',
    dataQualityStatusHealthy: 'Zdrowe',
    dataQualityStatusReview: 'Do sprawdzenia',
    dataQualityStatusCritical: 'Krytyczne',
    dataQualityProblems: 'Wykryte problemy',
    dataQualityNoProblems: 'Brak wykrytych problemów dla tej kontroli.',
    dataQualityTournament: 'Turniej',
    dataQualityEntity: 'Rekord',
    dataQualityProblem: 'Problem',
    dataQualitySample: 'Próbka',
    dataQualityChecks: [
      { key: 'tournament-structure', title: 'Struktura turnieju', status: 'Identity', copy: 'Brakująca identyfikacja, drużyny, stage, LiveScore ID albo niespójne metadane sezonu.' },
      { key: 'match-completeness', title: 'Kompletność meczów', status: 'Mecze', copy: 'Brakujące drużyny, kickoffy, finalne wyniki, stare niezakończone mecze albo ręczny round/stage do sprawdzenia.' },
      { key: 'result-enrichment', title: 'Wzbogacanie wyników', status: 'Wyniki', copy: 'Mecze po dogrywce lub karnych bez regular-time, extra-time, karnych albo detali z incydentów.' },
      { key: 'match-statistics', title: 'Statystyki meczowe', status: 'Stats', copy: 'Zakończone mecze bez MatchStatistics, xG albo użytecznych wejść performance.' },
      { key: 'squad-snapshots', title: 'Snapshoty kadr', status: 'Kadry', copy: 'Drużyny bez mapowań Transfermarkt, świeżych snapshotów, wartości zawodników albo pełnych metadanych kadry.' },
      { key: 'sync-freshness', title: 'Świeżość sync', status: 'Joby', copy: 'Stare próbki sync, ostatnie błędy albo turnieje poza oczekiwanym oknem odświeżenia.' },
    ],
    adminUsersOps: 'Użytkownicy i dostęp',
    adminUsersOpsCopy: 'Przeglądaj użytkowników, status kont, poziom dostępu, blokady i przyszłe ustawienia widoczności według ról.',
    usersPanelEyebrow: 'Użytkownicy i dostęp',
    usersPanelTitle: 'Kontrola dostępu.',
    usersPanelCopy:
      'Przyszły workspace admina do przeglądu kont, przypisywania ról, aktywacji, blokad, kluczy API i audytu dostępu. Na razie jest to tylko UI.',
    usersDirectoryTitle: 'Katalog użytkowników',
    usersAccessTitle: 'Model dostępu',
    usersAuditTitle: 'Sygnały audytu',
    userEmail: 'Email',
    userDisplayName: 'Nazwa',
    userRole: 'Rola',
    userStatus: 'Status',
    userLastSeen: 'Ostatnio aktywny',
    userActions: 'Akcje',
    userSearch: 'Szukaj użytkowników',
    userSearchPlaceholder: 'Szukaj po emailu, nazwie lub roli',
    userFilterAll: 'Wszyscy',
    userFilterActive: 'Aktywni',
    userFilterPending: 'Oczekujący',
    userFilterLocked: 'Zablokowani',
    userDetailsTitle: 'Szczegóły użytkownika.',
    userDetailsCopy: 'Sprawdź tożsamość konta, status dostępu, role i stan potwierdzenia emaila.',
    userSuspendTitle: 'Zawieś użytkownika.',
    userSuspendCopy: 'Zawieszeni użytkownicy są blokowani i nie mogą korzystać z chronionych widoków aplikacji do czasu przywrócenia dostępu.',
    userUnsuspendTitle: 'Przywróć użytkownika.',
    userUnsuspendCopy: 'To przywraca dostęp wybranemu użytkownikowi, jeśli jego dane logowania są poprawne.',
    userDeleteTitle: 'Usuń użytkownika.',
    userDeleteCopy: 'To usuwa konto użytkownika z systemu. Tej akcji nie można cofnąć.',
    userSuspendSuccess: 'Użytkownik zawieszony.',
    userUnsuspendSuccess: 'Użytkownik przywrócony.',
    userDeleteSuccess: 'Użytkownik usunięty.',
    userRoleChangeSuccess: 'Rola użytkownika zaktualizowana.',
    userConfirmationResent: 'Email potwierdzający wysłany.',
    emailConfirmed: 'Email potwierdzony',
    yes: 'Tak',
    no: 'Nie',
    details: 'Szczegóły',
    actions: 'Akcje',
    suspend: 'Zawieś',
    unsuspend: 'Przywróć',
    changeRole: 'Zmień rolę',
    resendConfirmation: 'Wyślij email potwierdzający',
    adminUserActionsTitle: 'Akcje użytkownika.',
    adminUserActionsCopy: 'Wybierz operację na koncie. Destrukcyjne akcje dostępu wymagają potwierdzenia przed wykonaniem.',
    confirmAction: 'Potwierdź akcję',
    accessPrepared: 'Przygotowane',
    accessActive: 'Aktywny',
    accessPending: 'Oczekuje',
    accessLocked: 'Zablokowany',
    accessRoleItems: [
      'Administratorzy mogą zarządzać turniejami, kadrami, rebuildami ratingów i przyszłymi jobami systemowymi.',
      'Zwykli użytkownicy mogą przeglądać dashboardy, publiczne wyniki ratingów i własny profil.',
      'Przyszłe kontrole super admina mogą obsługiwać operacje destrukcyjne i zmiany ról.',
    ],
    accessAuditItems: ['Status potwierdzenia emaila', 'Reset hasła', 'Rotacja klucza API', 'Nieudane logowania', 'Blokady kont', 'Zmiany ról'],
    sampleUsers: [
      { email: 'pudel1985@gmail.com', name: 'pudel1985', role: 'Admin', status: 'Aktywny', lastSeen: 'Bieżąca sesja' },
      { email: 'analyst@example.com', name: 'League Analyst', role: 'Użytkownik', status: 'Oczekuje', lastSeen: 'Jeszcze nieaktywny' },
      { email: 'operator@example.com', name: 'Data Operator', role: 'Admin', status: 'Zablokowany', lastSeen: 'Statyczny preview' },
    ],
    adminSystemJobsOps: 'System jobs',
    adminSystemJobsOpsCopy: 'Monitoruj zaplanowane sync serwisy, interwały, ostatnie uruchomienia, błędy i zdrowie procesów w tle.',
    systemJobsPanelEyebrow: 'System jobs',
    systemJobsPanelTitle: 'Kontrola synchronizacji w tle.',
    systemJobsPanelCopy:
      'Przyszły panel operatora dla zaplanowanej synchronizacji LiveScore, finalizacji meczów, importów kadr i kolejek rebuildów ratingów. Na razie to tylko UI.',
    systemJobsCoreTitle: 'Hosted services',
    systemJobsGlobalSyncTitle: 'Globalne operacje sync',
    systemJobsRecentTitle: 'Ostatnie sync runy',
    systemJobsHealthTitle: 'Stan usług',
    systemJobsPrepared: 'Przygotowany',
    systemJobsPaused: 'Wstrzymany',
    systemJobsManual: 'Ręczny',
    systemJobsLive: 'Live',
    systemJobsOnHold: 'Wstrzymany',
    systemJobsService: 'Service',
    systemJobsPurpose: 'Cel',
    systemJobsEditService: 'Edytuj service',
    systemJobsSaveService: 'Zapisz service',
    systemJobsInterval: 'Interwał',
    systemJobsHoldService: 'Wstrzymaj service',
    systemJobsServiceUpdated: 'Ustawienia service zaktualizowane lokalnie.',
    systemJobsGlobalSyncCopy: 'Te akcje docelowo uruchomią sync dla wszystkich aktywnych turniejów, nie tylko jednego turnieju.',
    systemJobsNextRun: 'Następne uruchomienie',
    systemJobsLastRun: 'Ostatnie uruchomienie',
    systemJobsLastSuccess: 'Ostatni sukces',
    systemJobsLastFailure: 'Ostatni błąd',
    systemJobsEligibleTournaments: 'Kwalifikujące się turnieje',
    systemJobsRuns24h: 'Runy 24h',
    systemJobsFailures24h: 'Błędy 24h',
    systemJobsCoreItems: [
      { serviceKey: 'schedule-sync', title: 'Schedule sync service', cadence: 'Co 60 minut', status: 'Live', nextRun: '08:00', copy: 'Odświeża daty fixtures, przełożone mecze, nieznane drużyny, metadane turnieju i strukturę przyszłych spotkań.' },
      { serviceKey: 'live-results', title: 'Live results service', cadence: 'Co 1 minutę', status: 'Live', nextRun: 'Gdy kickoff jest due', copy: 'Sprawdza fixtures rozgrywek w okolicach zaplanowanego kickoffu i aktualizuje live score bez indywidualnych zapytań meczu.' },
      { serviceKey: 'match-finalizer', title: 'Match finalizer service', cadence: 'Co 1 minutę', status: 'Live', nextRun: 'Po oknie live', copy: 'Wykrywa mecze przeniesione z fixtures do results, potwierdza finalny status i zamyka rekordy.' },
      { title: 'Match details extractor', cadence: 'Używa interwału finalizera', status: 'Live', nextRun: 'Tylko AET/AP', copy: 'Pobiera incydenty pojedynczego meczu tylko gdy potrzebna jest dogrywka, karne lub bogatsze detale finalne.' },
      { serviceKey: 'results-safety-net', title: 'Results safety net service', cadence: 'Co 1440 minut', status: 'Live', nextRun: '03:30', copy: 'Ponownie czyta zakończone mecze jako wolniejszy reconciliation pass dla pominiętych statusów, korekt lub przerw serwisu.' },
    ],
    systemJobHealthItems: [
      { label: 'Scheduler', value: 'Gotowy', note: 'Placeholder rejestracji hosted timerów' },
      { label: 'LiveScore API', value: 'Nie sprawdzono', note: 'Przyszły monitor opóźnień i błędów' },
      { label: 'Email worker', value: 'Gotowy', note: 'Wiadomości auth są już podpięte w backendzie' },
      { label: 'Rating worker', value: 'Ręczny', note: 'Przygotowany pod kolejkę rebuildów' },
    ],
    systemJobRecentRuns: [
      { job: 'Schedule sync service', mode: 'schedule', tournament: 'Wszystkie aktywne turnieje', time: 'Dziś 06:00', result: '104 bez zmian', status: 'Sukces' },
      { job: 'Match finalizer service', mode: 'finalize', tournament: 'Wszystkie aktywne turnieje', time: 'Dziś 05:58', result: '7 sfinalizowanych', status: 'Sukces' },
      { job: 'Results safety net service', mode: 'results', tournament: 'Wszystkie aktywne turnieje', time: 'Wczoraj 03:30', result: '89 sprawdzonych', status: 'Sukces' },
    ],
    adminPlaceholder: 'Jeszcze nie podpięte',
    backHome: 'Wroć na stronę główną',
    heroEyebrow: 'Platforma analityki piłkarskiej',
    heroTitle: 'Rating drużyn, który tłumaczy się przed pierwszym gwizdkiem.',
    heroCopy:
      'Nowoczesna aplikacja analityczna oparta o FTSR: bazowe Elo, synchronizację wyników, formę, statystyki gry, jakość kadry i narzędzia administracyjne.',
    explore: 'Zobacz platformę',
    signIn: 'Zaloguj',
    combinedRating: 'Rating łączny',
    dataFeeds: 'Źródła danych',
    adminJobs: 'Zadania admina',
    modelEyebrow: 'Model ratingowy',
    modelTitle: 'Od surowych meczów do czytelnej oceny siły drużyny.',
    modelCopy:
      'Każdy moduł działa niezależnie, więc rating końcowy można wyjaśniać, stroić, przeliczać i testować bez czarnej skrzynki.',
    workspaceEyebrow: 'Widok zalogowanego użytkownika',
    workspaceTitle: 'Miejsce pracy dla ratingów, meczów, kadr i predykcji.',
    workspaceCopy:
      'Użytkownik dostaje tabele ratingowe, trendy, profile drużyn, kontekst meczowy i sygnały pewności. Aplikacja ma być szybka, konkretna i przydatna w tygodniu meczowym.',
    dataCoverage: 'Pokrycie danych',
    pipelineEyebrow: 'Przepływ danych',
    pipelineTitle: 'Gotowe na nocne synchronizacje i odświeżanie w dniu meczu.',
    adminEyebrow: 'Panel administratora',
    adminTitle: 'Centrum kontroli danych zasilających ratingi.',
    ctaEyebrow: 'Kolejny etap',
    ctaTitle: 'Gotowe pod routing, integracje i rozbudowę widoków.',
    ctaCopy:
      'Publiczna część jest na miejscu. Widok zalogowanego użytkownika może teraz rosnąć w dashboardy, narzędzia admina i wyjaśnienia ratingów.',
    footerCopy:
      'Wyjaśnialne ratingi drużyn piłkarskich oparte o wyniki, statystyki, jakość kadry i przejrzyste komponenty modelu.',
    language: 'Język',
    legal: 'Zbudowane do badań nad analityką piłkarską.',
    loginTitle: 'Witaj ponownie.',
    loginCopy: 'Zaloguj się, aby przejść do ratingów, danych meczowych i narzędzi admina.',
    registerTitle: 'Utwórz konto.',
    registerCopy: 'Dołącz do workspace i zacznij eksplorować modele siły drużyn.',
    forgotPassword: 'Nie pamiętasz hasła?',
    resendActivation: 'Nie dotarł email aktywacyjny?',
    forgotPasswordEyebrow: 'Odzyskiwanie hasła',
    forgotPasswordTitle: 'Zresetuj hasło.',
    forgotPasswordCopy: 'Podaj email, a poprosimy backend o link resetowania hasła.',
    resendActivationEyebrow: 'Aktywacja konta',
    resendActivationTitle: 'Wyślij aktywację ponownie.',
    resendActivationCopy: 'Podaj email, a wyślemy kolejną wiadomość aktywacyjną.',
    confirmEmailEyebrow: 'Potwierdzenie emaila',
    confirmEmailLoadingTitle: 'Potwierdzamy konto.',
    confirmEmailLoadingCopy: 'Poczekaj chwilę, sprawdzamy link aktywacyjny.',
    confirmEmailSuccessTitle: 'Konto potwierdzone.',
    confirmEmailSuccessCopy: 'Adres email został potwierdzony. Możesz się zalogować.',
    confirmEmailFailureTitle: 'Potwierdzenie nieudane.',
    confirmEmailFailureCopy: 'Link aktywacyjny jest niepełny, wygasł albo jest nieprawidłowy. Możesz poprosić o nowy email aktywacyjny.',    resetPasswordEyebrow: 'Reset hasła',
    resetPasswordTitle: 'Ustaw nowe hasło.',
    resetPasswordCopy: 'Wybierz nowe hasło do konta i potwierdź zmianę.',
    resetPasswordInvalidLink: 'Link resetowania hasła nie zawiera wymaganych danych.',
    newPassword: 'Nowe hasło',
    confirmNewPassword: 'Powtórz nowe hasło',
    setNewPassword: 'Ustaw nowe hasło',
    passwordResetSuccess: 'Hasło zostało zresetowane. Możesz się zalogować.',    sendResetLink: 'Wyślij link resetujący',
    resendEmail: 'Wyślij ponownie',
    backToLogin: 'Wróć do logowania',
    goToResendActivation: 'Przejdź do ponownej aktywacji',
    resetRequested: 'Wysłano prośbę o reset hasła',
    activationRequested: 'Wysłano prośbę o email aktywacyjny',
    email: 'Email',
    displayName: 'Nazwa wyświetlana',
    password: 'Hasło',
    confirmPassword: 'Powtórz hasło',
    acceptTermsPrefix: 'Akceptuję',
    termsAndConditions: 'regulamin i warunki',
    termsTitle: 'Regulamin i warunki',
    termsCopy: 'Strona regulaminu jest gotowa jako placeholder routingu. Pełną treść można dodać później.',
    submitLogin: 'Zaloguj',
    submitRegister: 'Zarejestruj',
    noAccount: 'Nie masz jeszcze konta?',
    hasAccount: 'Masz już konto?',
    createAccount: 'Utwórz konto',
    useExisting: 'Użyj istniejącego konta',
    required: 'To pole jest wymagane',
    termsRequired: 'Zgoda jest wymagana',
    emailInvalid: 'Podaj poprawny adres email',
    passwordShort: 'Hasło musi mieć co najmniej 6 znaków',
    passwordMismatch: 'Hasła nie są takie same',
    validationFailed: 'Popraw zaznaczone pola',
    loginSuccess: 'Logowanie zakończone sukcesem.',
    registerSuccess: 'Rejestracja zakończona. Sprawdź email, aby aktywować konto.',
    logoutSuccess: 'Wylogowano.',
    genericError: 'Coś poszło nie tak. Spróbuj ponownie.',
    dashboardTitle: 'Jesteś zalogowany.',
    dashboardCopy:
      'Zarządzaj kontem i sprawdź, że autoryzowane zapytania do backendu działają.',
    dashboardEyebrow: 'Centrum dowodzenia',
    dashboardHomeTitle: 'Dobrze Cię widzieć.',
    dashboardHomeCopy:
      'Workspace ratingowy jest gotowy. Docelowe widgety z live data trafią tutaj później; na razie dashboard pokazuje główne obszary aplikacji.',
    dashboardProfileAction: 'Otwórz profil',
    dashboardCards: [
      ['Rating łączny', 'FTSR', 'Base Elo, forma, performance i jakość kadry jako osobne, wyjaśnialne warstwy.'],
      ['Live Sync', 'Gotowe', 'Schedule, live, finalize i results mogą zasilać bazę meczów za tym workspace.'],
      ['Admin Flow', 'Next', 'Sync turniejów, mapowanie Transfermarkt, rebuild ratingów i kontrola danych trafią do panelu operatora.'],
    ],
    dashboardSignalsTitle: 'Szybki podgląd',
    dashboardSignals: ['Model Premier League: aktywny', 'Ostatni rating run: oczekuje na live data', 'Snapshoty kadr: mapowane ręcznie przez admina'],
    authHint: 'Token autoryzacji zapisany lokalnie dla zapytań API.',
    profileEyebrow: 'Konto',
    profileTitle: 'Ustawienia konta.',
    profileCopy: 'Profil, hasło, email i akcje API key działają bezpośrednio z backendem.',
    memberSince: 'Data dołączenia',
    saveProfile: 'Zapisz profil',
    profileSaved: 'Profil zaktualizowany',
    changePasswordTitle: 'Zmień hasło',
    currentPassword: 'Aktualne hasło',
    changePassword: 'Zmień hasło',
    passwordChanged: 'Hasło zmienione',
    changeEmailTitle: 'Zmień email',
    newEmail: 'Nowy email',
    changeEmail: 'Zmień email',
    emailChanged: 'Email zmieniony',
    rotateApiKeyTitle: 'API key',
    rotateApiKey: 'Wygeneruj nowy API key',
    newApiKey: 'Nowy API key',
    apiKeyRotated: 'API key został zmieniony. Zapisz go teraz; nie będzie ponownie pokazany.',
    profileLoadFailed: 'Nie udało się pobrać profilu.',
    sessionExpired: 'Sesja wygasła. Zaloguj się ponownie.',
  },
} as const

function getModules(language: Language) {
  const copy = {
    en: [
      ['FTSR v1', 'Base Elo', '70%', 'Long-term team strength from match results, opponent quality, venue context, goal difference, and competition weight.'],
      ['FTSR v1.5', 'Form Rating', '5-10', 'Recent momentum separated from base strength, weighted by how fresh each match is.'],
      ['FTSR v2', 'Performance', 'xG+', 'Underlying match quality using xG, shots, possession, fouls, saves, offsides, and pressure signals.'],
      ['FTSR v3', 'Squad Quality', 'TM', 'Transfermarkt squad snapshots, top XI value, top 15 depth, age, positions, and player valuation coverage.'],
    ],
    pl: [
      ['FTSR v1', 'Bazowe Elo', '70%', 'Długoterminowa siła drużyny z wyników, jakości rywala, miejsca meczu, różnicy bramek i wagi rozgrywek.'],
      ['FTSR v1.5', 'Forma', '5-10', 'Aktualny trend oddzielony od bazowej siły, ważony świeżością ostatnich meczów.'],
      ['FTSR v2', 'Performance', 'xG+', 'Jakość gry z xG, strzałów, posiadania, fauli, obron, spalonych i sygnałów presji.'],
      ['FTSR v3', 'Jakość Kadry', 'TM', 'Snapshoty Transfermarkt, wartość top XI, głębia top 15, wiek, pozycje i pokrycie wycen zawodników.'],
    ],
  }[language]

  return copy.map(([label, title, value, description]) => ({ label, title, value, description }))
}

function getLists(language: Language) {
  return {
    pipeline:
      language === 'en'
        ? ['LiveScore sync', 'Match database', 'Statistics import', 'Squad snapshots', 'Rating rebuilds', 'Combined score']
        : ['Sync LiveScore', 'Baza meczów', 'Import statystyk', 'Snapshoty kadr', 'Przeliczenia ratingów', 'Rating łączny'],
    workspace:
      language === 'en'
        ? ['Tournament command center', 'Team rating profiles', 'Match timeline and incidents', 'Fixture monitoring', 'Performance diagnostics', 'Prediction lab']
        : ['Centrum turnieju', 'Profile ratingowe drużyn', 'Timeline i zdarzenia meczu', 'Monitoring terminarza', 'Diagnostyka performance', 'Laboratorium predykcji'],
    admin:
      language === 'en'
        ? [
            'Schedule, live, results, and finalize services',
            'Transfermarkt team mapping and squad imports',
            'Base Elo, form, performance, and combined rebuilds',
            'Data quality checks for missing stats and stale matches',
          ]
        : [
            'Serwisy schedule, live, results i finalize',
            'Mapowanie Transfermarkt i import kadr',
            'Przeliczenia Base Elo, formy, performance i ratingu łącznego',
            'Kontrola brakujących statystyk i nieaktualnych meczów',
          ],
  }
}
function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let animationFrame = 0
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawPitch = (time: number) => {
      context.clearRect(0, 0, width, height)
      const gradient = context.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#0b1713')
      gradient.addColorStop(0.48, '#16231d')
      gradient.addColorStop(1, '#311716')
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)
      context.save()
      context.translate(width * 0.5, height * 0.51)
      context.rotate(-0.11)

      const pitchWidth = Math.min(width * 0.92, 1120)
      const pitchHeight = Math.min(height * 0.64, 520)
      const left = -pitchWidth / 2
      const top = -pitchHeight / 2

      context.strokeStyle = 'rgba(231, 247, 226, 0.15)'
      context.lineWidth = 1
      for (let x = left; x <= pitchWidth / 2; x += pitchWidth / 12) {
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, top + pitchHeight)
        context.stroke()
      }
      for (let y = top; y <= pitchHeight / 2; y += pitchHeight / 8) {
        context.beginPath()
        context.moveTo(left, y)
        context.lineTo(left + pitchWidth, y)
        context.stroke()
      }

      context.strokeStyle = 'rgba(245, 242, 220, 0.34)'
      context.lineWidth = 2
      context.strokeRect(left, top, pitchWidth, pitchHeight)
      context.beginPath()
      context.moveTo(0, top)
      context.lineTo(0, top + pitchHeight)
      context.stroke()
      context.beginPath()
      context.arc(0, 0, 72, 0, Math.PI * 2)
      context.stroke()

      const nodes: Array<[number, number, string]> = [
        [-0.38, -0.21, '#d8ff76'],
        [-0.2, 0.12, '#f2b84b'],
        [0.03, -0.28, '#76e4bd'],
        [0.25, 0.03, '#ff6c5f'],
        [0.42, -0.13, '#f5e7b2'],
        [0.11, 0.27, '#76e4bd'],
      ]

      for (let index = 0; index < nodes.length - 1; index += 1) {
        const [x1, y1] = nodes[index]
        const [x2, y2] = nodes[index + 1]
        const pulse = (Math.sin(time / 520 + index) + 1) / 2
        context.strokeStyle = `rgba(216, 255, 118, ${0.16 + pulse * 0.24})`
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(x1 * pitchWidth, y1 * pitchHeight)
        context.quadraticCurveTo(
          (x1 + x2) * pitchWidth * 0.5,
          (y1 + y2) * pitchHeight * 0.5 - 42,
          x2 * pitchWidth,
          y2 * pitchHeight,
        )
        context.stroke()
      }

      nodes.forEach(([x, y, color], index) => {
        const radius = 9 + Math.sin(time / 420 + index) * 2
        context.fillStyle = color
        context.shadowColor = color
        context.shadowBlur = 18
        context.beginPath()
        context.arc(x * pitchWidth, y * pitchHeight, radius, 0, Math.PI * 2)
        context.fill()
      })

      context.restore()
    }

    const animate = (time: number) => {
      drawPitch(time)
      animationFrame = window.requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas className="hero-field" ref={canvasRef} aria-hidden="true" />
}

async function postAuth(path: string, body: object): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as Partial<AuthResponse> | null

  if (!response.ok || !data?.success) {
    return {
      success: false,
      message: data?.message ?? response.statusText,
    }
  }

  return {
    success: true,
    message: data.message ?? '',
    token: data.token,
    apiKey: data.apiKey,
  }
}

async function confirmEmail(userId: string, token: string, language: Language): Promise<AuthResponse> {
  const params = new URLSearchParams({ userId, token, language })
  const requestKey = params.toString()
  const existingRequest = confirmEmailRequests.get(requestKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = fetch(`${API_BASE_URL}/api/auth/confirm-email?${requestKey}`)
    .then(async (response) => {
      const data = (await response.json().catch(() => null)) as Partial<AuthResponse> | null

      if (!response.ok || !data?.success) {
        return {
          success: false,
          message: data?.message ?? response.statusText,
        }
      }

      return {
        success: true,
        message: data.message ?? '',
      }
    })

  confirmEmailRequests.set(requestKey, request)
  return request
}

async function resetPassword(userId: string, token: string, newPassword: string, language: Language): Promise<AuthResponse> {
  return postAuth('/api/auth/reset-password', {
    userId,
    token,
    newPassword,
    language,
  })
}

async function authorizedRequest<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data?: T; message?: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  const hasBody = response.status !== 204
  const data = hasBody ? await response.json().catch(() => null) : null

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: typeof data?.message === 'string' ? data.message : response.statusText,
    }
  }

  return {
    ok: true,
    status: response.status,
    data: data as T,
  }
}

function validateEmail(email: string, t: (typeof translations)[Language]): string | undefined {
  if (!email.trim()) {
    return t.required
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : t.emailInvalid
}

function validatePassword(password: string, t: (typeof translations)[Language]): string | undefined {
  if (!password) {
    return t.required
  }

  return password.length >= 6 ? undefined : t.passwordShort
}

function formatDate(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  return new Date(value).toLocaleString()
}

function formatEuroValue(value: number | null | undefined, fallback = '-') {
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

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} h`
  }

  return `${minutes} min`
}

function compareText(left: string | null | undefined, right: string | null | undefined) {
  return (left || '').localeCompare(right || '', undefined, { numeric: true, sensitivity: 'base' })
}

function toDateTimeLocalInput(value: string | null | undefined) {
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

function nullableNumber(value: string) {
  return value.trim() === '' ? null : Number(value)
}

function enumValue(value: string | number, fallback: number, labels: Record<string, number>) {
  if (typeof value === 'number') {
    return value
  }

  return labels[value] ?? (Number(value) || fallback)
}

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  })
  const location = useLocation()
  const navigateTo = useNavigate()
  const view = getViewFromPath(location.pathname)
  const t = translations[language]
  const lists = useMemo(() => getLists(language), [language])
  const modules = useMemo(() => getModules(language), [language])
  const queryLanguage = new URLSearchParams(location.search).get('language')
  const requestLanguage: Language = queryLanguage === 'en' || queryLanguage === 'pl' ? queryLanguage : language

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    setIsAppMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const routeLanguage = new URLSearchParams(location.search).get('language')
    if (routeLanguage === 'en' || routeLanguage === 'pl') {
      setLanguage(routeLanguage)
    }
  }, [location.search])

  useEffect(() => {
    if ((view === 'home' || view === 'ratings' || view === 'rating-details' || view === 'api' || view === 'admin' || view === 'admin-ratings' || view === 'admin-rating-details' || view === 'admin-squads' || view === 'admin-squad-details' || view === 'admin-users' || view === 'admin-system-jobs' || view === 'admin-data-quality' || view === 'admin-tournaments' || view === 'admin-tournament-form' || view === 'admin-tournament-details' || view === 'profile') && !user) {
      navigateTo(routes.login, { replace: true })
    }
  }, [navigateTo, user, view])

  const navigate = (nextView: View) => {
    setIsAppMenuOpen(false)
    navigateTo(routes[nextView])
  }

  const showToast = (message: string, tone: ToastTone) => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
    setIsAppMenuOpen(false)
    navigate('home')
    showToast(t.logoutSuccess, 'info')
  }

  const handleLoginSuccess = (nextUser: AuthUser) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    navigate('landing')
    showToast(t.loginSuccess, 'success')
  }

  return (
    <main className="app">
      <header className="site-header">
        <div className="brand-shell">
          <button
            className="brand-menu-trigger"
            type="button"
            aria-label={user ? t.openMenu : t.backHome}
            aria-expanded={user ? isAppMenuOpen : undefined}
            onClick={() => {
              if (!user) {
                navigate('landing')
                return
              }

              setIsAppMenuOpen((current) => !current)
            }}
          >
            <FootballIcon />
          </button>
          <button className="brand-name" type="button" onClick={() => navigate('landing')}>
            {t.brand}
          </button>
        </div>
        <div className="header-controls">
          {!user && (
            <button className="header-action" type="button" onClick={() => navigate('login')}>
              {t.loginRegister}
            </button>
          )}
          <div className="language-menu">
            <button
              aria-label={t.language}
              aria-expanded={isLanguageMenuOpen}
              className="language-trigger"
              type="button"
              onClick={() => setIsLanguageMenuOpen((current) => !current)}
            >
              {language.toUpperCase()}
            </button>
            {isLanguageMenuOpen && (
              <div className="language-options">
                {(['en', 'pl'] as const).map((option) => (
                  <button
                    className={language === option ? 'active' : ''}
                    key={option}
                    type="button"
                    onClick={() => {
                      setLanguage(option)
                      setIsLanguageMenuOpen(false)
                    }}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {user && (
        <AppMenu
          isOpen={isAppMenuOpen}
          t={t}
          onClose={() => setIsAppMenuOpen(false)}
          onLogout={handleLogout}
          onNavigate={navigate}
        />
      )}

      {view === 'landing' && !user && (
        <LandingPage
          t={t}
          modules={modules}
          lists={lists}
          onLogin={() => navigate('login')}
        />
      )}

      {view === 'landing' && user && (
        <LoggedInDashboard
          t={t}
          user={user}
          onOpenProfile={() => navigate('profile')}
        />
      )}

      {view === 'login' && (
        <AuthPage
          key="login"
          mode="login"
          language={requestLanguage}
          t={t}
          onSwitch={() => navigate('register')}
          onToast={showToast}
          onLoginSuccess={handleLoginSuccess}
          onForgotPassword={() => navigate('forgot-password')}
          onResendActivation={() => navigate('resend-activation')}
        />
      )}

      {view === 'register' && (
        <AuthPage
          key="register"
          mode="register"
          language={requestLanguage}
          t={t}
          onSwitch={() => navigate('login')}
          onToast={showToast}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {view === 'forgot-password' && (
        <EmailActionPage
          key="forgot-password"
          mode="forgot-password"
          language={language}
          t={t}
          onBackLogin={() => navigate('login')}
          onToast={showToast}
        />
      )}

      {view === 'resend-activation' && (
        <EmailActionPage
          key="resend-activation"
          mode="resend-activation"
          language={language}
          t={t}
          onBackLogin={() => navigate('login')}
          onToast={showToast}
        />
      )}

      {view === 'confirm-email' && (
        <ConfirmEmailPage
          t={t}
          language={requestLanguage}
          search={location.search}
          onBackLogin={() => navigate('login')}
          onResendActivation={() => navigate('resend-activation')}
          onToast={showToast}
        />
      )}

      {view === 'reset-password' && (
        <ResetPasswordPage
          t={t}
          language={requestLanguage}
          search={location.search}
          onBackLogin={() => navigate('login')}
          onToast={showToast}
        />
      )}

      {view === 'home' && user && (
        <LoggedInDashboard
          t={t}
          user={user}
          onOpenProfile={() => navigate('profile')}
        />
      )}

      {view === 'ratings' && user && (
        <UserRatingsPanel
          t={t}
          user={user}
          onToast={showToast}
          onOpen={(id) => navigateTo(`/ratings/${id}`)}
        />
      )}

      {view === 'rating-details' && user && (
        <UserRatingDetailsPanel
          t={t}
          user={user}
          tournamentId={Number(location.pathname.match(/^\/ratings\/(\d+)$/)?.[1] ?? 0)}
          onToast={showToast}
          onBack={() => navigateTo('/ratings')}
        />
      )}

      {view === 'api' && user && (
        <ApiPanel
          t={t}
          onProfile={() => navigate('profile')}
        />
      )}

      {view === 'admin' && user && (
        <AdminDashboard
          t={t}
          onNavigate={navigate}
        />
      )}

      {view === 'admin-ratings' && user && (
        <RatingsPanel
          t={t}
          user={user}
          onToast={showToast}
          onBack={() => navigate('admin')}
          onOpen={(id) => navigateTo(`/admin/ratings/${id}`)}
        />
      )}

      {view === 'admin-rating-details' && user && (
        <RatingTournamentDetailsPanel
          t={t}
          user={user}
          tournamentId={Number(location.pathname.match(/^\/admin\/ratings\/(\d+)$/)?.[1] ?? 0)}
          onToast={showToast}
          onBack={() => navigateTo('/admin/ratings')}
        />
      )}

      {view === 'admin-squads' && user && (
        <SquadsPanel
          t={t}
          user={user}
          onToast={showToast}
          onBack={() => navigate('admin')}
          onEdit={(id) => navigateTo(`/admin/squads/${id}`)}
        />
      )}

      {view === 'admin-squad-details' && user && (
        <SquadDetailsPanel
          t={t}
          user={user}
          tournamentId={location.pathname.match(/^\/admin\/squads\/(\d+)$/)?.[1] ?? ''}
          onToast={showToast}
          onBack={() => navigateTo('/admin/squads')}
        />
      )}

      {view === 'admin-users' && user && (
        <UsersAccessPanel
          t={t}
          user={user}
          language={language}
          onToast={showToast}
          onBack={() => navigate('admin')}
        />
      )}

      {view === 'admin-system-jobs' && user && (
        <SystemJobsPanel
          t={t}
          user={user}
          onToast={showToast}
          onBack={() => navigate('admin')}
        />
      )}

      {view === 'admin-data-quality' && user && (
        <DataQualityPanel
          t={t}
          user={user}
          onToast={showToast}
          onBack={() => navigate('admin')}
        />
      )}

      {view === 'admin-tournaments' && user && (
        <TournamentsPanel
          t={t}
          user={user}
          onToast={showToast}
          onBack={() => navigate('admin')}
          onCreate={() => navigateTo('/admin/tournaments/new')}
          onOpen={(id) => navigateTo(`/admin/tournaments/${id}`)}
          onEdit={(id) => navigateTo(`/admin/tournaments/${id}/edit`)}
        />
      )}

      {view === 'admin-tournament-details' && user && (
        <TournamentDetailsPage
          t={t}
          user={user}
          tournamentId={location.pathname.match(/^\/admin\/tournaments\/(\d+)$/)?.[1] ?? ''}
          onBack={() => navigateTo('/admin/tournaments')}
          onEdit={(id) => navigateTo(`/admin/tournaments/${id}/edit`)}
          onToast={showToast}
        />
      )}

      {view === 'admin-tournament-form' && user && (
        <TournamentFormPage
          t={t}
          user={user}
          tournamentId={location.pathname.match(/^\/admin\/tournaments\/(\d+)\/edit$/)?.[1]}
          onBack={() => navigateTo('/admin/tournaments')}
          onSaved={() => navigateTo('/admin/tournaments')}
          onToast={showToast}
        />
      )}

      {view === 'profile' && user && (
        <SignedInPreview
          t={t}
          language={language}
          user={user}
          onSessionExpired={handleLogout}
          onToast={showToast}
        />
      )}

      {view === 'terms' && <TermsPage t={t} />}

      <SiteFooter t={t} />
      <ToastStack toasts={toasts} />
    </main>
  )
}

function FootballIcon() {
  return (
    <span className="brand-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.2 16.1 10l-1.6 4.8h-5L7.9 10 12 7.2Z" />
        <path d="m12 7.2.3-4.1M16.1 10l4-1.3M14.5 14.8l2.4 3.4M9.5 14.8l-2.4 3.4M7.9 10l-4-1.3" />
      </svg>
    </span>
  )
}

function MenuIcon({ name }: { name: MenuIconName }) {
  const paths: Record<MenuIconName, string[]> = {
    home: ['M4 11.2 12 4l8 7.2', 'M6.8 10.2V20h10.4v-9.8', 'M10 20v-5h4v5'],
    ratings: ['M5 19V9', 'M12 19V5', 'M19 19v-7', 'M4 19h16'],
    teams: ['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M3.8 19a4.2 4.2 0 0 1 8.4 0', 'M11.8 19a4.2 4.2 0 0 1 8.4 0'],
    matches: ['M7 3v4', 'M17 3v4', 'M4 8h16', 'M5 5h14v15H5Z', 'M8 12h3', 'M13 12h3', 'M8 16h3'],
    api: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M14 5l-4 14'],
    tournaments: ['M7 4h10v3a5 5 0 0 1-10 0Z', 'M9 19h6', 'M12 12v7', 'M5 5H3v2a3 3 0 0 0 4 2.8', 'M19 5h2v2a3 3 0 0 1-4 2.8'],
    predictions: ['M4 17c4-8 12-8 16 0', 'M8 17c2.7-4.4 5.3-4.4 8 0', 'M12 17v-4', 'M12 4v3', 'M18 6l-2 2', 'M6 6l2 2'],
    admin: ['M12 3l7 3v5c0 4.5-2.8 7.6-7 9-4.2-1.4-7-4.5-7-9V6Z', 'M9.5 12.2l1.7 1.7 3.4-4'],
    profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
    logout: ['M10 5H5v14h5', 'M14 8l4 4-4 4', 'M8 12h10'],
    'arrow-left': ['M19 12H5', 'M12 5l-7 7 7 7'],
  }

  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  )
}

function AppMenu({
  isOpen,
  t,
  onClose,
  onLogout,
  onNavigate,
}: {
  isOpen: boolean
  t: (typeof translations)[Language]
  onClose: () => void
  onLogout: () => void
  onNavigate: (view: View) => void
}) {
  const futureItems: Array<[MenuIconName, string]> = [
    ['teams', t.menuTeams],
    ['matches', t.menuMatches],
    ['predictions', t.menuPredictions],
  ]

  return (
    <>
      <button
        className={`app-menu-backdrop ${isOpen ? 'open' : ''}`}
        type="button"
        aria-label={t.closeMenu}
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside className={`app-menu ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <nav className="app-menu-nav" aria-label={t.openMenu}>
          <button type="button" onClick={() => onNavigate('home')}>
            <span className="menu-label">
              <MenuIcon name="home" />
              <span>{t.menuHome}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('ratings')}>
            <span className="menu-label">
              <MenuIcon name="ratings" />
              <span>{t.menuRatings}</span>
            </span>
          </button>
          {futureItems.map(([icon, item]) => (
            <button className="muted" type="button" disabled key={item}>
              <span className="menu-label">
                <MenuIcon name={icon} />
                <span>{item}</span>
              </span>
              <small>{t.menuSoon}</small>
            </button>
          ))}
          <button type="button" onClick={() => onNavigate('api')}>
            <span className="menu-label">
              <MenuIcon name="api" />
              <span>{t.menuApi}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('admin')}>
            <span className="menu-label">
              <MenuIcon name="admin" />
              <span>{t.menuAdmin}</span>
            </span>
          </button>
        </nav>
        <div className="app-menu-bottom">
          <button type="button" onClick={() => onNavigate('profile')}>
            <span className="menu-label">
              <MenuIcon name="profile" />
              <span>{t.profile}</span>
            </span>
          </button>
          <button className="logout" type="button" onClick={onLogout}>
            <span className="menu-label">
              <MenuIcon name="logout" />
              <span>{t.logout}</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

function LandingPage({
  t,
  modules,
  lists,
  onLogin,
}: {
  t: (typeof translations)[Language]
  modules: ReturnType<typeof getModules>
  lists: ReturnType<typeof getLists>
  onLogin: () => void
}) {
  return (
    <>
      <section className="hero" id="top">
        <HeroField />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-copy">{t.heroCopy}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#workspace">
              {t.explore}
            </a>
            <button className="secondary-action" type="button" onClick={onLogin}>
              {t.signIn}
            </button>
          </div>
        </div>
        <div className="hero-metrics" id="preview" aria-label="Platform highlights">
          <div>
            <span>{t.combinedRating}</span>
            <strong>FTSR v3.5</strong>
          </div>
          <div>
            <span>{t.dataFeeds}</span>
            <strong>LiveScore + TM</strong>
          </div>
          <div>
            <span>{t.adminJobs}</span>
            <strong>4 sync modes</strong>
          </div>
        </div>
      </section>

      <section className="section" id="model">
        <div className="section-heading">
          <p className="eyebrow">{t.modelEyebrow}</p>
          <h2>{t.modelTitle}</h2>
          <p>{t.modelCopy}</p>
        </div>
        <div className="module-grid">
          {modules.map((module) => (
            <article className="module-card" key={module.title}>
              <div className="module-topline">
                <span>{module.label}</span>
                <strong>{module.value}</strong>
              </div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section" id="workspace">
        <div className="workspace-copy">
          <p className="eyebrow">{t.workspaceEyebrow}</p>
          <h2>{t.workspaceTitle}</h2>
          <p>{t.workspaceCopy}</p>
        </div>
        <div className="product-frame" aria-label="Application preview">
          <div className="frame-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="rating-board">
            {[
              ['Arsenal', '1798', '+54 form'],
              ['Manchester City', '1764', '+31 squad'],
              ['Liverpool', '1689', '+22 performance'],
              ['Chelsea', '1612', '-8 confidence'],
            ].map(([team, rating, detail], index) => (
              <div className={`rating-row ${index === 0 ? 'leader' : ''}`} key={team}>
                <span>{team}</span>
                <strong>{rating}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
          <div className="signal-panel">
            <span>{t.dataCoverage}</span>
            <div className="signal-bars">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>

      <section className="section compact">
        <div className="view-grid">
          {lists.workspace.map((view) => (
            <div className="view-pill" key={view}>
              <span />
              {view}
            </div>
          ))}
        </div>
      </section>

      <section className="pipeline-section">
        <div className="section-heading narrow">
          <p className="eyebrow">{t.pipelineEyebrow}</p>
          <h2>{t.pipelineTitle}</h2>
        </div>
        <div className="pipeline">
          {lists.pipeline.map((step, index) => (
            <div className="pipeline-step" key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section" id="admin">
        <div className="admin-panel">
          <p className="eyebrow">{t.adminEyebrow}</p>
          <h2>{t.adminTitle}</h2>
          <div className="admin-list">
            {lists.admin.map((job) => (
              <div className="admin-item" key={job}>
                <span />
                <p>{job}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="status-wall">
          <div>
            <span>Live sync</span>
            <strong>Healthy</strong>
          </div>
          <div>
            <span>Latest Elo run</span>
            <strong>Complete</strong>
          </div>
          <div>
            <span>Squad imports</span>
            <strong>Queued</strong>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <p className="eyebrow">{t.ctaEyebrow}</p>
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaCopy}</p>
      </section>
    </>
  )
}

function AuthPage({
  mode,
  language,
  t,
  onSwitch,
  onToast,
  onLoginSuccess,
  onForgotPassword,
  onResendActivation,
}: {
  mode: 'login' | 'register'
  language: Language
  t: (typeof translations)[Language]
  onSwitch: () => void
  onToast: (message: string, tone: ToastTone) => void
  onLoginSuccess: (user: AuthUser) => void
  onForgotPassword?: () => void
  onResendActivation?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors: FieldErrors = {
      email: validateEmail(email, t),
      password: validatePassword(password, t),
    }

    if (mode === 'register') {
      if (!confirmPassword) {
        nextErrors.confirmPassword = t.required
      } else if (password !== confirmPassword) {
        nextErrors.confirmPassword = t.passwordMismatch
      }

      if (!termsAccepted) {
        nextErrors.termsAccepted = t.termsRequired
      }
    }

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as keyof FieldErrors]) {
        delete nextErrors[key as keyof FieldErrors]
      }
    })

    setErrors(nextErrors)
    const isValid = Object.keys(nextErrors).length === 0
    if (!isValid) {
      onToast(t.validationFailed, 'error')
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        const result = await postAuth('/api/auth/login', { email, password, language })
        if (!result.success || !result.token) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        onLoginSuccess({ email, token: result.token })
        return
      }

      const result = await postAuth('/api/auth/register', {
        email,
        password,
        displayName: null,
        language,
      })
      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(result.message || t.registerSuccess, 'success')
      onSwitch()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-section">
      <HeroField />
      <div className="hero-shade" />
      <div className="auth-card">
        <p className="eyebrow">{mode === 'login' ? t.submitLogin : t.submitRegister}</p>
        <h1>{mode === 'login' ? t.loginTitle : t.registerTitle}</h1>
        <p className="auth-copy">{mode === 'login' ? t.loginCopy : t.registerCopy}</p>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <FormField
            error={errors.email}
            label={t.email}
            type="email"
            value={email}
            onChange={setEmail}
          />
          <FormField
            error={errors.password}
            label={t.password}
            type="password"
            value={password}
            onChange={setPassword}
          />
          {mode === 'register' && (
            <FormField
              error={errors.confirmPassword}
              label={t.confirmPassword}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          )}
          {mode === 'register' && (
            <label className="terms-field">
              <span className="terms-row">
                <span className="terms-control">
                  <input
                    checked={termsAccepted}
                    type="checkbox"
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                  <span>
                    {t.acceptTermsPrefix} <Link to="/terms">{t.termsAndConditions}</Link>
                  </span>
                </span>
                {errors.termsAccepted && <small>{errors.termsAccepted}</small>}
              </span>
            </label>
          )}
          <button className="form-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '...' : mode === 'login' ? t.submitLogin : t.submitRegister}
          </button>
        </form>
        <div className="auth-switch">
          <span>{mode === 'login' ? t.noAccount : t.hasAccount}</span>
          <button type="button" onClick={onSwitch}>
            {mode === 'login' ? t.createAccount : t.useExisting}
          </button>
        </div>
        {mode === 'login' && (
          <div className="auth-links">
            <button type="button" onClick={onForgotPassword}>
              {t.forgotPassword}
            </button>
            <button type="button" onClick={onResendActivation}>
              {t.resendActivation}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function EmailActionPage({
  mode,
  language,
  t,
  onBackLogin,
  onToast,
}: {
  mode: 'forgot-password' | 'resend-activation'
  language: Language
  t: (typeof translations)[Language]
  onBackLogin: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isForgotPassword = mode === 'forgot-password'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const emailError = validateEmail(email, t)
    setErrors(emailError ? { email: emailError } : {})

    if (emailError) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await postAuth(
        isForgotPassword ? '/api/auth/request-password-reset' : '/api/auth/resend-confirmation-email',
        { email, language },
      )

      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(
        result.message || (isForgotPassword ? t.resetRequested : t.activationRequested),
        'success',
      )
      onBackLogin()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-section">
      <HeroField />
      <div className="hero-shade" />
      <div className="auth-card">
        <p className="eyebrow">{isForgotPassword ? t.forgotPasswordEyebrow : t.resendActivationEyebrow}</p>
        <h1>{isForgotPassword ? t.forgotPasswordTitle : t.resendActivationTitle}</h1>
        <p className="auth-copy">{isForgotPassword ? t.forgotPasswordCopy : t.resendActivationCopy}</p>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <FormField
            error={errors.email}
            label={t.email}
            type="email"
            value={email}
            onChange={setEmail}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '...' : isForgotPassword ? t.sendResetLink : t.resendEmail}
          </button>
        </form>
        <div className="auth-switch">
          <button type="button" onClick={onBackLogin}>
            {t.backToLogin}
          </button>
        </div>
      </div>
    </section>
  )
}

function ConfirmEmailPage({
  t,
  language,
  search,
  onBackLogin,
  onResendActivation,
  onToast,
}: {
  t: (typeof translations)[Language]
  language: Language
  search: string
  onBackLogin: () => void
  onResendActivation: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [status, setStatus] = useState<'loading' | 'success' | 'failure'>('loading')
  const [message, setMessage] = useState('')
  const hasRequested = useRef(false)

  useEffect(() => {
    if (hasRequested.current) {
      return
    }

    hasRequested.current = true
    const params = new URLSearchParams(search)
    const userId = params.get('userId')
    const token = params.get('token')

    if (!userId || !token) {
      setStatus('failure')
      setMessage(t.confirmEmailFailureCopy)
      onToast(t.confirmEmailFailureTitle, 'error')
      return
    }

    confirmEmail(userId, token, language)
      .then((result) => {
        if (result.success) {
          setStatus('success')
          setMessage(result.message || t.confirmEmailSuccessCopy)
          onToast(result.message || t.confirmEmailSuccessTitle, 'success')
          return
        }

        setStatus('failure')
        setMessage(result.message || t.confirmEmailFailureCopy)
        onToast(result.message || t.confirmEmailFailureTitle, 'error')
      })
      .catch(() => {
        setStatus('failure')
        setMessage(t.genericError)
        onToast(t.genericError, 'error')
      })
  }, [language, onToast, search, t])

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const title = isLoading
    ? t.confirmEmailLoadingTitle
    : isSuccess
      ? t.confirmEmailSuccessTitle
      : t.confirmEmailFailureTitle
  const copy = isLoading
    ? t.confirmEmailLoadingCopy
    : message || (isSuccess ? t.confirmEmailSuccessCopy : t.confirmEmailFailureCopy)

  return (
    <section className="auth-section">
      <HeroField />
      <div className="hero-shade" />
      <div className={`auth-card status-card ${status}`}>
        <p className="eyebrow">{t.confirmEmailEyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-copy">{copy}</p>
        {!isLoading && (
          <button
            className="form-submit"
            type="button"
            onClick={isSuccess ? onBackLogin : onResendActivation}
          >
            {isSuccess ? t.backToLogin : t.goToResendActivation}
          </button>
        )}
        {!isLoading && !isSuccess && (
          <div className="auth-switch">
            <button type="button" onClick={onBackLogin}>
              {t.backToLogin}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ResetPasswordPage({
  t,
  language,
  search,
  onBackLogin,
  onToast,
}: {
  t: (typeof translations)[Language]
  language: Language
  search: string
  onBackLogin: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const params = useMemo(() => new URLSearchParams(search), [search])
  const userId = params.get('userId')
  const token = params.get('token')
  const isLinkValid = Boolean(userId && token)

  const validate = () => {
    const nextErrors: FieldErrors = {
      password: validatePassword(password, t),
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t.required
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = t.passwordMismatch
    }

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as keyof FieldErrors]) {
        delete nextErrors[key as keyof FieldErrors]
      }
    })

    setErrors(nextErrors)
    const isValid = Object.keys(nextErrors).length === 0
    if (!isValid) {
      onToast(t.validationFailed, 'error')
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isLinkValid || !userId || !token) {
      onToast(t.resetPasswordInvalidLink, 'error')
      return
    }

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await resetPassword(userId, token, password, language)

      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(result.message || t.passwordResetSuccess, 'success')
      onBackLogin()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-section">
      <HeroField />
      <div className="hero-shade" />
      <div className="auth-card">
        <p className="eyebrow">{t.resetPasswordEyebrow}</p>
        <h1>{t.resetPasswordTitle}</h1>
        <p className="auth-copy">{isLinkValid ? t.resetPasswordCopy : t.resetPasswordInvalidLink}</p>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <FormField
            error={errors.password}
            label={t.newPassword}
            type="password"
            value={password}
            onChange={setPassword}
          />
          <FormField
            error={errors.confirmPassword}
            label={t.confirmNewPassword}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting || !isLinkValid}>
            {isSubmitting ? '...' : t.setNewPassword}
          </button>
        </form>
        <div className="auth-switch">
          <button type="button" onClick={onBackLogin}>
            {t.backToLogin}
          </button>
        </div>
      </div>
    </section>
  )
}

function FormField({
  label,
  type,
  value,
  error,
  placeholder,
  disabled,
  onChange,
}: {
  label: string
  type: string
  value: string
  error?: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="form-field">
      <span>
        <span>{label}</span>
        {error && <small>{error}</small>}
      </span>
      <input
        aria-invalid={Boolean(error)}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function LoggedInDashboard({
  t,
  user,
  onOpenProfile,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onOpenProfile: () => void
}) {
  const displayName = user.displayName || user.email.split('@')[0]

  return (
    <section className="home-dashboard">
      <HeroField />
      <div className="hero-shade" />
      <div className="home-dashboard-content">
        <div className="dashboard-hero">
          <p className="eyebrow">{t.dashboardEyebrow}</p>
          <h1>{t.dashboardHomeTitle}</h1>
          <p>{t.dashboardHomeCopy}</p>
          <div className="dashboard-user-strip">
            <span>{displayName}</span>
            <button className="form-submit compact" type="button" onClick={onOpenProfile}>
              {t.dashboardProfileAction}
            </button>
          </div>
        </div>

        <div className="dashboard-card-grid">
          {t.dashboardCards.map(([title, value, description]) => (
            <article className="dashboard-card" key={title}>
              <span>{value}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="dashboard-signal-panel">
          <h2>{t.dashboardSignalsTitle}</h2>
          <div>
            {t.dashboardSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AdminDashboard({
  t,
  onNavigate,
}: {
  t: (typeof translations)[Language]
  onNavigate: (view: View) => void
}) {
  const overviewCards: Array<{
    icon: MenuIconName
    title: string
    description: string
    action?: () => void
    active?: boolean
  }> = [
    {
      icon: 'tournaments',
      title: t.adminTournamentOps,
      description: t.adminTournamentOpsCopy,
      action: () => onNavigate('admin-tournaments'),
    },
    {
      icon: 'ratings',
      title: t.adminRatingOps,
      description: t.adminRatingOpsCopy,
      action: () => onNavigate('admin-ratings'),
    },
    {
      icon: 'teams',
      title: t.adminSquadOps,
      description: t.adminSquadOpsCopy,
      action: () => onNavigate('admin-squads'),
    },
    {
      icon: 'admin',
      title: t.adminQualityOps,
      description: t.adminQualityOpsCopy,
      action: () => onNavigate('admin-data-quality'),
    },
    {
      icon: 'profile',
      title: t.adminUsersOps,
      description: t.adminUsersOpsCopy,
      action: () => onNavigate('admin-users'),
    },
    {
      icon: 'matches',
      title: t.adminSystemJobsOps,
      description: t.adminSystemJobsOpsCopy,
      action: () => onNavigate('admin-system-jobs'),
    },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.adminPanelEyebrow}</p>
          <h1>{t.adminPanelTitle}</h1>
          <p>{t.adminPanelCopy}</p>
        </div>

        <div className="admin-overview-grid">
          {overviewCards.map((card) => {
            const content = (
              <>
                <MenuIcon name={card.icon} />
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </>
            )

            return card.action ? (
              <button
                className={`admin-overview-card action ${card.active ? 'active' : ''}`}
                type="button"
                aria-expanded={card.active}
                key={card.title}
                onClick={card.action}
              >
                {content}
              </button>
            ) : (
              <article className="admin-overview-card clean" key={card.title}>
                {content}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ApiPanel({
  t,
  onProfile,
}: {
  t: (typeof translations)[Language]
  onProfile: () => void
}) {
  const endpoints = [
    [t.apiEndpointAll, 'GET /api/tournaments/{tournamentId}/matches'],
    [t.apiEndpointResults, 'GET /api/tournaments/{tournamentId}/matches/results'],
    [t.apiEndpointLive, 'GET /api/tournaments/{tournamentId}/matches/live'],
    [t.apiEndpointUpcoming, 'GET /api/tournaments/{tournamentId}/matches/upcoming'],
    [t.apiEndpointSingle, 'GET /api/tournaments/{tournamentId}/matches/{matchId}'],
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content api-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.apiPanelEyebrow}</p>
          <h1>{t.apiPanelTitle}</h1>
          <p>{t.apiPanelCopy}</p>
        </div>

        <section className="details-panel api-doc-card">
          <div className="details-panel-heading">
            <MenuIcon name="api" />
            <h2>{t.apiHeaderTitle}</h2>
          </div>
          <p>{t.apiHeaderCopy}</p>
          <div className="api-key-example">
            <span>{t.apiKeyHeader}</span>
            <code>X-Api-Key: &lt;your-api-key&gt;</code>
          </div>
          <button type="button" onClick={onProfile}>
            {t.profile}
          </button>
        </section>

        <section className="details-panel api-doc-card">
          <div className="details-panel-heading">
            <MenuIcon name="matches" />
            <h2>{t.apiEndpointsTitle}</h2>
          </div>
          <div className="api-endpoint-list">
            {endpoints.map(([label, endpoint]) => (
              <div className="api-endpoint-row" key={endpoint}>
                <span>{label}</span>
                <code>{endpoint}</code>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function toRecordByTeamId<T extends { teamId: number }>(items: T[]): Record<number, T> {
  return Object.fromEntries(items.map((item) => [item.teamId, item]))
}

function groupByTeamId<T extends { teamId: number }>(items: T[]): Record<number, T[]> {
  return items.reduce<Record<number, T[]>>((groups, item) => {
    groups[item.teamId] = [...(groups[item.teamId] ?? []), item]
    return groups
  }, {})
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function formatNullableScore(value?: number | null): string {
  return value === null || value === undefined ? '-' : value.toFixed(3)
}

function formatMoney(value?: number | null): string {
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

function RatingValue({
  value,
  children,
}: {
  value: ReactNode
  children: ReactNode
}) {
  return (
    <span className="rating-value-tooltip" tabIndex={0}>
      <span className="rating-value-display">{value}</span>
      <span className="rating-tooltip-panel" role="tooltip">
        {children}
      </span>
    </span>
  )
}

function TooltipMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function UserRatingsPanel({
  t,
  user,
  onToast,
  onOpen,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onOpen: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<TournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const result = await authorizedRequest<TournamentSummary[]>(user.token, '/api/tournaments')
        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        setTournaments(result.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [onToast, t.genericError, user.token])

  const sortedTournaments = useMemo(() => {
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

      if (comparison === 0) {
        comparison = compareText(left.name, right.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [search, sortDirection, sortKey, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'teams' || key === 'matches' || key === 'lastSync' ? 'desc' : 'asc')
  }

  const tournamentHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.teams },
    { key: 'matches', label: t.matches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.userRatingsPanelEyebrow}</p>
          <h1>{t.userRatingsPanelTitle}</h1>
          <p>{t.userRatingsPanelCopy}</p>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="tournaments" />
              <h2>{t.ratingTournamentListTitle}</h2>
            </div>
            <label className="tournament-search compact">
              <span>{t.tournamentSearch}</span>
              <input
                placeholder={t.tournamentSearchPlaceholder}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-tournament-table">
              <thead>
                <tr>
                  {tournamentHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td><strong>{tournament.name}</strong></td>
                    <td>{tournament.season}</td>
                    <td>{tournament.competitionCountry}</td>
                    <td>{tournament.teamCount}</td>
                    <td>{tournament.matchCount}</td>
                    <td>{formatDate(tournament.lastSyncedAtUtc, '-')}</td>
                    <td>
                      <button type="button" onClick={() => onOpen(tournament.id)}>
                        {t.ratingOpenTournament}
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedTournaments.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

function UserRatingDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: number
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [combinedRatings, setCombinedRatings] = useState<CombinedRatingsResponse | null>(null)
  const [formDetailsByTeamId, setFormDetailsByTeamId] = useState<Record<number, TeamFormRatingDetail>>({})
  const [formSnapshotsByTeamId, setFormSnapshotsByTeamId] = useState<Record<number, TeamFormMatchSnapshot[]>>({})
  const [performanceDetailsByTeamId, setPerformanceDetailsByTeamId] = useState<Record<number, TeamPerformanceRatingDetail>>({})
  const [performanceSnapshotsByTeamId, setPerformanceSnapshotsByTeamId] = useState<Record<number, TeamPerformanceMatchSnapshot[]>>({})
  const [squadDetailsByTeamId, setSquadDetailsByTeamId] = useState<Record<number, TeamSquadQualityRatingDetail>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<RatingTeamSortKey>('finalRating')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [checkpoint, setCheckpoint] = useState('latest')
  const [comparison, setComparison] = useState('previous')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const [tournamentResult, ratingsResult] = await Promise.all([
          authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`),
          authorizedRequest<CombinedRatingsResponse>(user.token, `/api/tournaments/${tournamentId}/ratings/combined/teams`),
        ])

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data) {
          onToast(tournamentResult.message || t.genericError, 'error')
          return
        }

        if (!ratingsResult.ok || !ratingsResult.data) {
          onToast(ratingsResult.message || t.genericError, 'error')
          return
        }

        const [formResult, performanceResult, squadResult, formSnapshotsResult, performanceSnapshotsResult] = await Promise.all([
          authorizedRequest<TeamFormRatingDetail[]>(user.token, `/api/tournaments/${tournamentId}/ratings/form/teams`),
          authorizedRequest<TeamPerformanceRatingDetail[]>(user.token, `/api/tournaments/${tournamentId}/ratings/performance/teams`),
          authorizedRequest<TeamSquadQualityRatingDetail[]>(user.token, `/api/tournaments/${tournamentId}/ratings/squad-quality/teams`),
          ratingsResult.data.runContext.formRatingRunId
            ? authorizedRequest<TeamFormMatchSnapshot[]>(user.token, `/api/rating-runs/${ratingsResult.data.runContext.formRatingRunId}/form/snapshots`)
            : Promise.resolve({ ok: true, data: [] as TeamFormMatchSnapshot[] }),
          ratingsResult.data.runContext.performanceRatingRunId
            ? authorizedRequest<TeamPerformanceMatchSnapshot[]>(user.token, `/api/rating-runs/${ratingsResult.data.runContext.performanceRatingRunId}/performance/snapshots`)
            : Promise.resolve({ ok: true, data: [] as TeamPerformanceMatchSnapshot[] }),
        ])

        setTournament(tournamentResult.data)
        setCombinedRatings(ratingsResult.data)
        setFormDetailsByTeamId(toRecordByTeamId(formResult.ok && formResult.data ? formResult.data : []))
        setPerformanceDetailsByTeamId(toRecordByTeamId(performanceResult.ok && performanceResult.data ? performanceResult.data : []))
        setSquadDetailsByTeamId(toRecordByTeamId(squadResult.ok && squadResult.data ? squadResult.data : []))
        setFormSnapshotsByTeamId(groupByTeamId(formSnapshotsResult.ok && formSnapshotsResult.data ? formSnapshotsResult.data : []))
        setPerformanceSnapshotsByTeamId(groupByTeamId(performanceSnapshotsResult.ok && performanceSnapshotsResult.data ? performanceSnapshotsResult.data : []))
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [onToast, t.genericError, tournamentId, user.token])

  const displayedTeams = useMemo(() => {
    return [...(combinedRatings?.teams ?? [])].sort((left, right) => {
      let comparison = 0

      if (sortKey === 'team') {
        comparison = compareText(left.teamName, right.teamName)
      } else if (sortKey === 'baseElo') {
        comparison = left.baseElo - right.baseElo
      } else if (sortKey === 'form') {
        comparison = left.formAdjustment - right.formAdjustment
      } else if (sortKey === 'performance') {
        comparison = left.performanceAdjustment - right.performanceAdjustment
      } else if (sortKey === 'squad') {
        comparison = left.squadQualityAdjustment - right.squadQualityAdjustment
      } else if (sortKey === 'finalRating') {
        comparison = left.finalRating - right.finalRating
      } else if (sortKey === 'confidence') {
        comparison = left.ratingConfidence - right.ratingConfidence
      }

      if (comparison === 0) {
        comparison = compareText(left.teamName, right.teamName)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [combinedRatings, sortDirection, sortKey])

  const requestSort = (key: RatingTeamSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'team' ? 'asc' : 'desc')
  }

  const ratingHeaders: Array<{ key: RatingTeamSortKey; label: string }> = [
    { key: 'team', label: t.ratingTeam },
    { key: 'baseElo', label: t.ratingBaseElo },
    { key: 'form', label: t.ratingForm },
    { key: 'performance', label: t.ratingPerformance },
    { key: 'squad', label: t.ratingSquad },
    { key: 'finalRating', label: t.ratingFinal },
    { key: 'confidence', label: t.ratingConfidence },
  ]

  const renderBaseTooltip = (team: CombinedTeamRating) => (
    <>
      <strong className="rating-tooltip-title">{team.teamName} - {t.ratingBaseElo}</strong>
      <span className="rating-tooltip-grid">
        <TooltipMetric label="Rating" value={team.baseElo.toFixed(2)} />
        <TooltipMetric label="Last match" value={formatDate(team.lastBaseEloMatchUtc, '-')} />
      </span>
    </>
  )

  const renderFormTooltip = (team: CombinedTeamRating) => {
    const detail = formDetailsByTeamId[team.teamId]
    const snapshots = formSnapshotsByTeamId[team.teamId] ?? []

    return (
      <>
        <strong className="rating-tooltip-title">{team.teamName} - {t.ratingForm}</strong>
        <span className="rating-tooltip-grid">
          <TooltipMetric label="Adjustment" value={formatSigned(team.formAdjustment)} />
          <TooltipMetric label="Matches" value={detail?.matchCount ?? team.formMatchesPlayed} />
          <TooltipMetric label="Weighted actual" value={detail ? detail.weightedActual.toFixed(4) : '-'} />
          <TooltipMetric label="Weighted expected" value={detail ? detail.weightedExpected.toFixed(4) : '-'} />
          <TooltipMetric label="Weighted delta" value={detail ? formatSigned(detail.weightedDelta) : '-'} />
          <TooltipMetric label="Average delta" value={detail ? formatSigned(detail.averageDelta) : '-'} />
        </span>
        {snapshots.length > 0 && (
          <span className="rating-tooltip-list">
            {snapshots.map((snapshot) => (
              <span key={`${snapshot.kickoffUtc}-${snapshot.opponentTeamName}`}>
                vs <strong>{snapshot.opponentTeamName}</strong>: actual {snapshot.actual.toFixed(2)}, expected {snapshot.expected.toFixed(2)}, weighted {formatSigned(snapshot.weightedDelta)}
              </span>
            ))}
          </span>
        )}
      </>
    )
  }

  const renderPerformanceTooltip = (team: CombinedTeamRating) => {
    const detail = performanceDetailsByTeamId[team.teamId]
    const snapshots = performanceSnapshotsByTeamId[team.teamId] ?? []

    return (
      <>
        <strong className="rating-tooltip-title">{team.teamName} - {t.ratingPerformance}</strong>
        <span className="rating-tooltip-grid">
          <TooltipMetric label="Adjustment" value={formatSigned(team.performanceAdjustment)} />
          <TooltipMetric label="Matches" value={detail?.matchCount ?? team.performanceMatchesPlayed} />
          <TooltipMetric label="Data coverage" value={detail ? `${Math.round(detail.dataCoverage * 100)}%` : '-'} />
          <TooltipMetric label="Raw score" value={detail ? detail.rawPerformanceScore.toFixed(4) : '-'} />
        </span>
        {snapshots.length > 0 && (
          <span className="rating-tooltip-list">
            {snapshots.map((snapshot) => (
              <span key={`${snapshot.kickoffUtc}-${snapshot.opponentTeamName}`}>
                vs <strong>{snapshot.opponentTeamName}</strong>: xG {formatNullableScore(snapshot.xgScore)}, shots {formatNullableScore(snapshot.shotScore)}, possession {formatNullableScore(snapshot.possessionScore)}, weighted {formatSigned(snapshot.weightedPerformanceScore)}
              </span>
            ))}
          </span>
        )}
      </>
    )
  }

  const renderSquadTooltip = (team: CombinedTeamRating) => {
    const detail = squadDetailsByTeamId[team.teamId]

    return (
      <>
        <strong className="rating-tooltip-title">{team.teamName} - {t.ratingSquad}</strong>
        <span className="rating-tooltip-grid">
          <TooltipMetric label="Adjustment" value={formatSigned(team.squadQualityAdjustment)} />
          <TooltipMetric label="Players" value={detail?.playerCount ?? team.squadPlayerCount} />
          <TooltipMetric label="Total value" value={formatMoney(detail?.totalMarketValueEur)} />
          <TooltipMetric label="Top XI value" value={formatMoney(detail?.topElevenMarketValueEur)} />
          <TooltipMetric label="Top 15 value" value={formatMoney(detail?.topFifteenMarketValueEur)} />
          <TooltipMetric label="Squad score" value={detail ? detail.squadQualityScore.toFixed(4) : '-'} />
          <TooltipMetric label="Top XI score" value={formatNullableScore(detail?.topElevenScore)} />
          <TooltipMetric label="Depth score" value={formatNullableScore(detail?.topFifteenScore)} />
          <TooltipMetric label="Prime age" value={formatNullableScore(detail?.primeAgeScore)} />
          <TooltipMetric label="Balance score" value={formatNullableScore(detail?.positionalBalanceScore)} />
        </span>
      </>
    )
  }

  const renderFinalTooltip = (team: CombinedTeamRating) => (
    <>
      <strong className="rating-tooltip-title">{team.teamName} - {t.ratingFinal}</strong>
      <span className="rating-tooltip-grid">
        <TooltipMetric label={t.ratingBaseElo} value={team.baseElo.toFixed(2)} />
        <TooltipMetric label={t.ratingForm} value={formatSigned(team.formAdjustment)} />
        <TooltipMetric label={t.ratingPerformance} value={formatSigned(team.performanceAdjustment)} />
        <TooltipMetric label={t.ratingSquad} value={formatSigned(team.squadQualityAdjustment)} />
        <TooltipMetric label="Total adjustment" value={formatSigned(team.totalAdjustment)} />
        <TooltipMetric label={t.ratingFinal} value={team.finalRating.toFixed(2)} />
      </span>
    </>
  )

  const renderConfidenceTooltip = (team: CombinedTeamRating) => (
    <>
      <strong className="rating-tooltip-title">{team.teamName} - {t.ratingConfidence}</strong>
      <span className="rating-tooltip-grid">
        <TooltipMetric label="Confidence" value={`${Math.round(team.ratingConfidence * 100)}%`} />
        <TooltipMetric label="Form sample" value={`${team.formMatchesPlayed} matches`} />
        <TooltipMetric label="Performance sample" value={`${team.performanceMatchesPlayed} matches`} />
        <TooltipMetric label="Squad snapshot" value={team.hasSquadQualityRating ? formatDate(team.squadSnapshotFetchedAtUtc, '-') : '-'} />
      </span>
    </>
  )

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.userRatingDetailsEyebrow}</p>
          <h1>{tournament?.name || t.userRatingDetailsTitle}</h1>
          <p>{t.userRatingDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToRatings}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="teams" />
              <h2>{t.ratingTeamRatings}</h2>
            </div>
            <div className="rating-checkpoint-controls" aria-label="Rating checkpoint controls">
              <label>
                <span>{t.ratingCheckpoint}</span>
                <select value={checkpoint} onChange={(event) => setCheckpoint(event.target.value)}>
                  <option value="latest">{t.ratingCheckpointLatest}</option>
                  <option value="round-1">{t.ratingCheckpointRoundOne}</option>
                  <option value="round-2">{t.ratingCheckpointRoundTwo}</option>
                </select>
              </label>
              <label>
                <span>{t.ratingCompare}</span>
                <select value={comparison} onChange={(event) => setComparison(event.target.value)}>
                  <option value="previous">{t.ratingComparePrevious}</option>
                  <option value="season-start">{t.ratingCompareSeasonStart}</option>
                </select>
              </label>
              <div className="rating-updated-control">
                <span>{t.ratingUpdated}</span>
                <strong>{combinedRatings ? formatDate(combinedRatings.runContext.calculatedAtUtc, '-') : '-'}</strong>
              </div>
            </div>
          </div>
          <div className="tournament-table-shell compact-table-shell rating-tooltip-table-shell">
            <table className="tournament-table ratings-team-table">
              <thead>
                <tr>
                  {ratingHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td>
                      <strong>{team.teamName}</strong>
                      <span>{team.teamAbbreviation}</span>
                    </td>
                    <td>
                      <RatingValue value={team.baseElo.toFixed(2)}>
                        {renderBaseTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={formatSigned(team.formAdjustment)}>
                        {renderFormTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={formatSigned(team.performanceAdjustment)}>
                        {renderPerformanceTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={formatSigned(team.squadQualityAdjustment)}>
                        {renderSquadTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={<strong>{team.finalRating.toFixed(2)}</strong>}>
                        {renderFinalTooltip(team)}
                      </RatingValue>
                    </td>
                    <td>
                      <RatingValue value={`${Math.round(team.ratingConfidence * 100)}%`}>
                        {renderConfidenceTooltip(team)}
                      </RatingValue>
                    </td>
                  </tr>
                ))}
                {!isLoading && displayedTeams.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

function RatingsPanel({
  t,
  user,
  onToast,
  onBack,
  onOpen,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
  onOpen: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [config, setConfig] = useState<RatingConfiguration | null>(null)
  const [draft, setDraft] = useState<RatingConfiguration | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [sortKey, setSortKey] = useState<TournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      try {
        const [tournamentsResult, configResult] = await Promise.all([
          authorizedRequest<TournamentSummary[]>(user.token, '/api/tournaments'),
          authorizedRequest<RatingConfiguration>(user.token, '/api/admin/ratings/configuration'),
        ])

        if (!isMounted) {
          return
        }

        if (!tournamentsResult.ok || !tournamentsResult.data) {
          onToast(tournamentsResult.message || t.genericError, 'error')
          return
        }

        if (!configResult.ok || !configResult.data) {
          onToast(configResult.message || t.genericError, 'error')
          return
        }

        setTournaments(tournamentsResult.data)
        setConfig(configResult.data)
        setDraft(configResult.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [t.genericError, user.token])

  const updateDraft = (key: keyof RatingConfiguration, value: string) => {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      [key]: key === 'bootstrapSeasonCount' || key === 'formMatchCount' || key === 'performanceMatchCount'
        ? Math.max(0, Number(value) || 0)
        : Number(value) || 0,
    })
  }

  const saveConfig = async () => {
    if (!draft) {
      return
    }

    setIsSaving(true)
    try {
      const result = await authorizedRequest<RatingConfiguration>(user.token, '/api/admin/ratings/configuration', {
        method: 'PUT',
        body: JSON.stringify({
          baseEloWeight: draft.baseEloWeight,
          formWeight: draft.formWeight,
          performanceWeight: draft.performanceWeight,
          squadQualityWeight: draft.squadQualityWeight,
          leagueStrengthWeight: draft.leagueStrengthWeight,
          uncertaintyPenaltyWeight: draft.uncertaintyPenaltyWeight,
          baseRating: draft.baseRating,
          promotedBaselineRating: draft.promotedBaselineRating,
          kFactor: draft.kFactor,
          homeAdvantage: draft.homeAdvantage,
          bootstrapSeasonCount: draft.bootstrapSeasonCount,
          formMatchCount: draft.formMatchCount,
          formScale: draft.formScale,
          formMaxAdjustment: draft.formMaxAdjustment,
          performanceMatchCount: draft.performanceMatchCount,
          performanceScale: draft.performanceScale,
          performanceMaxAdjustment: draft.performanceMaxAdjustment,
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setConfig(result.data)
      setDraft(result.data)
      onToast(t.ratingConfigSaved, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const weightTotal = draft
    ? draft.baseEloWeight + draft.formWeight + draft.performanceWeight + draft.squadQualityWeight + draft.leagueStrengthWeight - draft.uncertaintyPenaltyWeight
    : 0

  const sortedTournaments = useMemo(() => {
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

      if (comparison === 0) {
        comparison = compareText(left.name, right.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [search, sortDirection, sortKey, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'teams' || key === 'matches' || key === 'lastSync' ? 'desc' : 'asc')
  }

  const tournamentHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.teams },
    { key: 'matches', label: t.matches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  const weightFields: Array<{ key: keyof RatingConfiguration; label: string }> = [
    { key: 'baseEloWeight', label: t.ratingConfigBaseEloWeight },
    { key: 'formWeight', label: t.ratingConfigFormWeight },
    { key: 'performanceWeight', label: t.ratingConfigPerformanceWeight },
    { key: 'squadQualityWeight', label: t.ratingConfigSquadWeight },
    { key: 'leagueStrengthWeight', label: t.ratingConfigLeagueWeight },
    { key: 'uncertaintyPenaltyWeight', label: t.ratingConfigUncertaintyWeight },
  ]

  const parameterFields: Array<{ key: keyof RatingConfiguration; label: string }> = [
    { key: 'baseRating', label: t.ratingConfigBaseRating },
    { key: 'promotedBaselineRating', label: t.ratingConfigPromotedBaseline },
    { key: 'kFactor', label: t.ratingConfigKFactor },
    { key: 'homeAdvantage', label: t.ratingConfigHomeAdvantage },
    { key: 'bootstrapSeasonCount', label: t.ratingConfigBootstrapSeasons },
    { key: 'formMatchCount', label: t.ratingConfigFormMatches },
    { key: 'formScale', label: t.ratingConfigFormScale },
    { key: 'formMaxAdjustment', label: t.ratingConfigFormMax },
    { key: 'performanceMatchCount', label: t.ratingConfigPerformanceMatches },
    { key: 'performanceScale', label: t.ratingConfigPerformanceScale },
    { key: 'performanceMaxAdjustment', label: t.ratingConfigPerformanceMax },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.ratingsPanelEyebrow}</p>
          <h1>{t.ratingsPanelTitle}</h1>
          <p>{t.ratingsPanelCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="tournaments" />
            <h2>{t.ratingTournamentListTitle}</h2>
          </div>
          <div className="rating-table-search">
            <label className="tournament-search">
              <span>{t.tournamentSearch}</span>
              <input
                placeholder={t.tournamentSearchPlaceholder}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-tournament-table">
              <thead>
                <tr>
                  {tournamentHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td><strong>{tournament.name}</strong></td>
                    <td>{tournament.season}</td>
                    <td>{tournament.competitionCountry}</td>
                    <td>{tournament.teamCount}</td>
                    <td>{tournament.matchCount}</td>
                    <td>{formatDate(tournament.lastSyncedAtUtc, '-')}</td>
                    <td>
                      <button type="button" onClick={() => onOpen(tournament.id)}>
                        {t.ratingOpenTournament}
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedTournaments.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {draft && (
          <div className="rating-admin-grid rating-control-grid">
            <section className="details-panel">
              <div className="details-panel-heading">
                <MenuIcon name="ratings" />
                <h2>{t.ratingWeightsTitle}</h2>
              </div>
              <div className="rating-config-form compact">
                {weightFields.map((field) => (
                  <label className="form-field" key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={String(draft[field.key])}
                      onChange={(event) => updateDraft(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="rating-config-footer">
                <div>
                  <span>{t.ratingWeightTotal}</span>
                  <strong>{weightTotal.toFixed(2)}</strong>
                </div>
                <button type="button" onClick={saveConfig} disabled={isSaving}>
                  {t.ratingSaveConfig}
                </button>
              </div>
            </section>

            <section className="details-panel">
              <div className="details-panel-heading">
                <MenuIcon name="admin" />
                <h2>{t.ratingParametersTitle}</h2>
              </div>
              <div className="rating-config-form">
                {parameterFields.map((field) => (
                  <label className="form-field" key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={String(draft[field.key])}
                      onChange={(event) => updateDraft(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="rating-config-footer">
                <div>
                  <span>{t.ratingUpdated}</span>
                  <strong>{config ? formatDate(config.updatedAtUtc, '-') : '-'}</strong>
                </div>
                <button type="button" onClick={saveConfig} disabled={isSaving}>
                  {t.ratingSaveConfig}
                </button>
              </div>
            </section>
          </div>
        )}

      </div>
    </section>
  )
}

function RatingTournamentDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: number
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [config, setConfig] = useState<RatingConfiguration | null>(null)
  const [baseRun, setBaseRun] = useState<EloRatingRun | null>(null)
  const [formRun, setFormRun] = useState<LayerRatingRun | null>(null)
  const [performanceRun, setPerformanceRun] = useState<LayerRatingRun | null>(null)
  const [combinedRatings, setCombinedRatings] = useState<CombinedRatingsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeRebuild, setActiveRebuild] = useState<'base' | 'form' | 'performance' | null>(null)
  const [snapshotStartSeasonOffset, setSnapshotStartSeasonOffset] = useState<number | null>(null)
  const [draftSnapshotStartSeasonOffset, setDraftSnapshotStartSeasonOffset] = useState<number | null>(null)
  const [includedLayers, setIncludedLayers] = useState({
    form: true,
    performance: true,
    squad: true,
  })
  const [draftIncludedLayers, setDraftIncludedLayers] = useState({
    form: true,
    performance: true,
    squad: true,
  })
  const [ratingSortKey, setRatingSortKey] = useState<RatingTeamSortKey>('finalRating')
  const [ratingSortDirection, setRatingSortDirection] = useState<SortDirection>('desc')

  const loadDetails = async () => {
    setIsLoading(true)
    try {
      const [tournamentResult, configResult, baseResult, formResult, performanceResult, combinedResult, setupResult] = await Promise.all([
        authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`),
        authorizedRequest<RatingConfiguration>(user.token, '/api/admin/ratings/configuration'),
        authorizedRequest<EloRatingRun>(user.token, `/api/tournaments/${tournamentId}/ratings/base-elo/latest-run`),
        authorizedRequest<LayerRatingRun>(user.token, `/api/tournaments/${tournamentId}/ratings/form/latest-run`),
        authorizedRequest<LayerRatingRun>(user.token, `/api/tournaments/${tournamentId}/ratings/performance/latest-run`),
        authorizedRequest<CombinedRatingsResponse>(user.token, `/api/tournaments/${tournamentId}/ratings/combined/teams`),
        authorizedRequest<TournamentRatingSetup>(user.token, `/api/tournaments/${tournamentId}/rating-setup`),
      ])

      if (!tournamentResult.ok || !tournamentResult.data) {
        onToast(tournamentResult.message || t.genericError, 'error')
        return
      }

      if (!configResult.ok || !configResult.data) {
        onToast(configResult.message || t.genericError, 'error')
        return
      }

      const nextConfig = configResult.data
      const setup = setupResult.ok && setupResult.data
        ? setupResult.data
        : {
            includeForm: true,
            includePerformance: true,
            includeSquad: true,
            snapshotStartSeasonOffset: -Math.max(0, nextConfig.bootstrapSeasonCount),
          }
      const nextLayers = {
        form: setup.includeForm,
        performance: setup.includePerformance,
        squad: setup.includeSquad,
      }
      const nextSnapshotOffset = setup.snapshotStartSeasonOffset ?? -Math.max(0, nextConfig.bootstrapSeasonCount)
      setTournament(tournamentResult.data)
      setConfig(nextConfig)
      setIncludedLayers(nextLayers)
      setDraftIncludedLayers(nextLayers)
      setSnapshotStartSeasonOffset(nextSnapshotOffset)
      setDraftSnapshotStartSeasonOffset(nextSnapshotOffset)
      setBaseRun(baseResult.ok && baseResult.data ? baseResult.data : null)
      setFormRun(formResult.ok && formResult.data ? formResult.data : null)
      setPerformanceRun(performanceResult.ok && performanceResult.data ? performanceResult.data : null)
      setCombinedRatings(combinedResult.ok && combinedResult.data ? combinedResult.data : null)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDetails()
  }, [tournamentId, user.token])

  const rebuild = async (layer: 'base' | 'form' | 'performance') => {
    if (!config) {
      return
    }

    setActiveRebuild(layer)
    try {
      const endpoint = layer === 'base'
        ? `/api/tournaments/${tournamentId}/ratings/base-elo/rebuild`
        : layer === 'form'
          ? `/api/tournaments/${tournamentId}/ratings/form/rebuild`
          : `/api/tournaments/${tournamentId}/ratings/performance/rebuild`

      const body = layer === 'base'
        ? {
            baseRating: config.baseRating,
            promotedBaselineRating: config.promotedBaselineRating,
            kFactor: config.kFactor,
            homeAdvantage: tournament?.applyHomeAdvantage ? config.homeAdvantage : 0,
            bootstrapSeasonCount: config.bootstrapSeasonCount,
            scope: tournament?.competitionName || 'Tournament',
            snapshotStartSeasonOffset: snapshotStartSeasonOffset ?? -Math.max(0, config.bootstrapSeasonCount),
          }
        : layer === 'form'
          ? {
              matchCount: config.formMatchCount,
              scale: config.formScale,
              maxAdjustment: config.formMaxAdjustment,
            }
          : {
              matchCount: config.performanceMatchCount,
              scale: config.performanceScale,
              maxAdjustment: config.performanceMaxAdjustment,
            }

      const result = await authorizedRequest<unknown>(user.token, endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(t.ratingRefreshDone, 'success')
      await loadDetails()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setActiveRebuild(null)
    }
  }

  const runCards = [
    { key: 'base', title: 'Base Elo', run: baseRun, action: t.ratingRefreshBase, onClick: () => rebuild('base'), processed: baseRun?.processedMatches ?? 0 },
    { key: 'form', title: 'Form', run: formRun, action: t.ratingRefreshForm, onClick: () => rebuild('form'), processed: formRun?.processedTeams ?? 0 },
    { key: 'performance', title: 'Performance', run: performanceRun, action: t.ratingRefreshPerformance, onClick: () => rebuild('performance'), processed: performanceRun?.processedTeams ?? 0 },
  ]

  const displayedTeams = useMemo(() => {
    return (combinedRatings?.teams ?? [])
      .map((team) => {
        const formAdjustment = includedLayers.form ? team.formAdjustment : 0
        const performanceAdjustment = includedLayers.performance ? team.performanceAdjustment : 0
        const squadQualityAdjustment = includedLayers.squad ? team.squadQualityAdjustment : 0
        const totalAdjustment = formAdjustment + performanceAdjustment + squadQualityAdjustment

        return {
          ...team,
          formAdjustment,
          performanceAdjustment,
          squadQualityAdjustment,
          totalAdjustment,
          finalRating: team.baseElo + totalAdjustment,
        }
      })
      .sort((left, right) => {
        let comparison = 0
        if (ratingSortKey === 'team') {
          comparison = compareText(left.teamName, right.teamName)
        } else if (ratingSortKey === 'baseElo') {
          comparison = left.baseElo - right.baseElo
        } else if (ratingSortKey === 'form') {
          comparison = left.formAdjustment - right.formAdjustment
        } else if (ratingSortKey === 'performance') {
          comparison = left.performanceAdjustment - right.performanceAdjustment
        } else if (ratingSortKey === 'squad') {
          comparison = left.squadQualityAdjustment - right.squadQualityAdjustment
        } else if (ratingSortKey === 'finalRating') {
          comparison = left.finalRating - right.finalRating
        } else if (ratingSortKey === 'confidence') {
          comparison = left.ratingConfidence - right.ratingConfidence
        }

        if (comparison === 0) {
          comparison = compareText(left.teamName, right.teamName)
        }

        return ratingSortDirection === 'asc' ? comparison : -comparison
      })
  }, [combinedRatings, includedLayers, ratingSortDirection, ratingSortKey])

  const requestRatingSort = (key: RatingTeamSortKey) => {
    if (ratingSortKey === key) {
      setRatingSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setRatingSortKey(key)
    setRatingSortDirection(key === 'team' ? 'asc' : 'desc')
  }

  const layerToggles: Array<{ key: keyof typeof includedLayers; label: string }> = [
    { key: 'form', label: t.ratingForm },
    { key: 'performance', label: t.ratingPerformance },
    { key: 'squad', label: t.ratingSquad },
  ]

  const snapshotStartOptions = [
    { value: 0, label: t.ratingSnapshotStartCurrent },
    { value: -1, label: t.ratingSnapshotStartOneBack },
    { value: -2, label: t.ratingSnapshotStartTwoBack },
    { value: -3, label: t.ratingSnapshotStartThreeBack },
    { value: -4, label: t.ratingSnapshotStartFourBack },
    { value: -5, label: t.ratingSnapshotStartFiveBack },
  ]

  const ratingTeamHeaders: Array<{ key: RatingTeamSortKey; label: string }> = [
    { key: 'team', label: t.ratingTeam },
    { key: 'baseElo', label: t.ratingBaseElo },
    { key: 'form', label: t.ratingForm },
    { key: 'performance', label: t.ratingPerformance },
    { key: 'squad', label: t.ratingSquad },
    { key: 'finalRating', label: t.ratingFinal },
    { key: 'confidence', label: t.ratingConfidence },
  ]

  const snapshotStartLabel = (offset: number | null | undefined) => {
    if (offset === null || offset === undefined) {
      return '-'
    }

    return snapshotStartOptions.find((option) => option.value === offset)?.label ?? String(offset)
  }

  const effectiveDraftSnapshotStart = draftSnapshotStartSeasonOffset ?? -Math.max(0, config?.bootstrapSeasonCount ?? 3)
  const effectiveSnapshotStart = snapshotStartSeasonOffset ?? -Math.max(0, config?.bootstrapSeasonCount ?? 3)
  const hasModelSetupChanges =
    effectiveDraftSnapshotStart !== effectiveSnapshotStart ||
    draftIncludedLayers.form !== includedLayers.form ||
    draftIncludedLayers.performance !== includedLayers.performance ||
    draftIncludedLayers.squad !== includedLayers.squad

  const updateModelSetup = async () => {
    try {
      const result = await authorizedRequest<TournamentRatingSetup>(user.token, `/api/tournaments/${tournamentId}/rating-setup`, {
        method: 'PUT',
        body: JSON.stringify({
          includeForm: draftIncludedLayers.form,
          includePerformance: draftIncludedLayers.performance,
          includeSquad: draftIncludedLayers.squad,
          snapshotStartSeasonOffset: effectiveDraftSnapshotStart,
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      const nextLayers = {
        form: result.data.includeForm,
        performance: result.data.includePerformance,
        squad: result.data.includeSquad,
      }
      const nextSnapshotOffset = result.data.snapshotStartSeasonOffset ?? -Math.max(0, config?.bootstrapSeasonCount ?? 3)
      setSnapshotStartSeasonOffset(nextSnapshotOffset)
      setDraftSnapshotStartSeasonOffset(nextSnapshotOffset)
      setIncludedLayers(nextLayers)
      setDraftIncludedLayers(nextLayers)
      onToast(t.ratingModelSetupUpdated, 'success')
    } catch {
      onToast(t.genericError, 'error')
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.ratingDetailsEyebrow}</p>
          <h1>{tournament?.name ?? t.ratingDetailsEyebrow}</h1>
          <p>{t.ratingDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToRatings}</span>
          </button>
        </div>

        {(isLoading || activeRebuild) && (
          <FullPageProcessingOverlay label={activeRebuild ? t.ratingRefreshing : t.loading} />
        )}

        <section className="details-panel rating-model-setup-panel">
          <div className="details-panel-heading">
            <MenuIcon name="admin" />
            <h2>{t.ratingModelSetup}</h2>
          </div>
          <div className="rating-model-setup-grid">
            <div className="rating-model-box">
              <span>{t.ratingIncludedLayers}</span>
              <p>{t.ratingIncludedLayersCopy}</p>
              <div className="rating-layer-toggle-grid">
                <label className="rating-layer-toggle locked">
                  <input type="checkbox" checked readOnly />
                  <strong>{t.ratingBaseElo}</strong>
                </label>
                {layerToggles.map((layer) => (
                  <label className="rating-layer-toggle" key={layer.key}>
                    <input
                      type="checkbox"
                      checked={draftIncludedLayers[layer.key]}
                      onChange={() => setDraftIncludedLayers((current) => ({
                        ...current,
                        [layer.key]: !current[layer.key],
                      }))}
                    />
                    <strong>{layer.label}</strong>
                  </label>
                ))}
              </div>
            </div>
            <div className="rating-model-box">
              <span>{t.ratingSnapshotStart}</span>
              <p>{t.ratingSnapshotStartCopy}</p>
              <div className="rating-snapshot-selector">
                {snapshotStartOptions.map((option) => (
                  <button
                    type="button"
                    className={effectiveDraftSnapshotStart === option.value ? 'active' : ''}
                    key={option.value}
                    onClick={() => setDraftSnapshotStartSeasonOffset(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rating-config-footer">
            <div>
              <span>{t.ratingSnapshotStart}</span>
              <strong>{snapshotStartLabel(effectiveSnapshotStart)}</strong>
            </div>
            <button type="button" onClick={updateModelSetup} disabled={!hasModelSetupChanges}>
              {t.ratingUpdateModelSetup}
            </button>
          </div>
        </section>

        <section className="details-panel rating-snapshot-runs-panel">
          <div className="details-panel-heading">
            <MenuIcon name="ratings" />
            <h2>{t.ratingRunSnapshots}</h2>
          </div>
          <div className="rating-run-grid">
            {runCards.map((card) => (
              <article className="rating-run-card" key={card.key}>
                <div className="rating-run-card-head">
                  <div>
                    <h3>{card.title}</h3>
                    <span>{card.run ? `${t.ratingRunId}: ${card.run.id}` : t.ratingNoRun}</span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>{t.ratingStarted}</dt>
                    <dd>{card.run ? formatDate(card.run.startedAtUtc, '-') : '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.ratingFinished}</dt>
                    <dd>{card.run ? formatDate(card.run.finishedAtUtc, '-') : '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.ratingProcessed}</dt>
                    <dd>{card.processed}</dd>
                  </div>
                  {card.key === 'base' && (
                    <div>
                      <dt>{t.ratingSnapshotStart}</dt>
                      <dd>{snapshotStartLabel((card.run as EloRatingRun | null)?.snapshotStartSeasonOffset)}</dd>
                    </div>
                  )}
                </dl>
                <button type="button" onClick={card.onClick} disabled={Boolean(activeRebuild) || !config}>
                  {card.action}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="teams" />
            <h2>{t.ratingTeamRatings}</h2>
          </div>
          <div className="rating-context-strip">
            <span>{t.ratingBaseElo}: {combinedRatings?.runContext.baseEloRunId ?? '-'}</span>
            <span>{t.ratingForm}: {combinedRatings?.runContext.formRatingRunId ?? '-'}</span>
            <span>{t.ratingPerformance}: {combinedRatings?.runContext.performanceRatingRunId ?? '-'}</span>
            <span>{t.ratingUpdated}: {combinedRatings ? formatDate(combinedRatings.runContext.calculatedAtUtc, '-') : '-'}</span>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-team-table">
              <thead>
                <tr>
                  {ratingTeamHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={ratingSortKey === header.key ? (ratingSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestRatingSort(header.key)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{ratingSortKey === header.key ? (ratingSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td><strong>{team.teamName}</strong><span>{team.teamAbbreviation}</span></td>
                    <td>{team.baseElo.toFixed(2)}</td>
                    <td>{team.formAdjustment.toFixed(2)}</td>
                    <td>{team.performanceAdjustment.toFixed(2)}</td>
                    <td>{team.squadQualityAdjustment.toFixed(2)}</td>
                    <td><strong>{team.finalRating.toFixed(2)}</strong></td>
                    <td>{(team.ratingConfidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
                {!isLoading && displayedTeams.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>{t.ratingNoRun}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

function SystemJobsPanel({
  t,
  user,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [services, setServices] = useState<SystemJobService[]>(() => [...t.systemJobsCoreItems])
  const [editingService, setEditingService] = useState<SystemJobService | null>(null)
  const [healthService, setHealthService] = useState<SystemJobService | null>(null)
  const [editedInterval, setEditedInterval] = useState('')
  const [editedOnHold, setEditedOnHold] = useState(false)
  const [recentRuns, setRecentRuns] = useState<TournamentSyncRunSummary[]>([])
  const [serviceHealth, setServiceHealth] = useState<SyncServiceHealth[]>([])
  const [isLoadingRuns, setIsLoadingRuns] = useState(true)
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)
  const [isSavingService, setIsSavingService] = useState(false)
  const [activeGlobalSyncMode, setActiveGlobalSyncMode] = useState<'full' | 'schedule' | 'live' | 'finalize' | 'results' | null>(null)
  const isInitialLoading = isLoadingRuns || isLoadingHealth
  const syncButtons: Array<{ mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results'; label: string; copy: string }> = [
    { mode: 'full', label: t.fullSync, copy: t.fullSyncCopy },
    { mode: 'schedule', label: t.scheduleSync, copy: t.scheduleSyncCopy },
    { mode: 'live', label: t.liveSync, copy: t.liveSyncCopy },
    { mode: 'finalize', label: t.finalizeSync, copy: t.finalizeSyncCopy },
    { mode: 'results', label: t.resultsSync, copy: t.resultsSyncCopy },
  ]
  const activeGlobalSyncLabel = syncButtons.find((button) => button.mode === activeGlobalSyncMode)?.label

  useEffect(() => {
    setServices([...t.systemJobsCoreItems])
  }, [t])

  const loadRecentRuns = async () => {
    setIsLoadingRuns(true)
    try {
      const result = await authorizedRequest<TournamentSyncRunSummary[]>(user.token, '/api/tournament-sync-runs?limit=20')

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setRecentRuns(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoadingRuns(false)
    }
  }

  const loadServiceHealth = async () => {
    setIsLoadingHealth(true)
    try {
      const result = await authorizedRequest<SyncServiceHealth[]>(user.token, '/api/system-jobs/health')

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setServiceHealth(result.data)
      setServices((current) => current.map((service) => {
        const health = service.serviceKey
          ? result.data!.find((item) => item.serviceKey === service.serviceKey)
          : result.data!.find((item) => item.serviceName === service.title)

        return health
          ? {
            ...service,
            cadence: `${health.intervalMinutes} min`,
            status: health.isEnabled ? t.systemJobsLive : t.systemJobsOnHold,
          }
          : service
      }))
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoadingHealth(false)
    }
  }

  useEffect(() => {
    loadRecentRuns()
    loadServiceHealth()
  }, [user.token])

  const runGlobalSync = async (mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results') => {
    setActiveGlobalSyncMode(mode)
    try {
      const result = await authorizedRequest<SyncAllTournamentsResponse>(user.token, `/api/tournaments/sync/${mode}`, {
        method: 'POST',
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.syncFailed, 'error')
        return
      }

      onToast(`${t.syncStarted} ${result.data.succeededCount}/${result.data.tournamentCount}`, result.data.failedCount > 0 ? 'error' : 'success')
      await loadRecentRuns()
      await loadServiceHealth()
    } catch {
      onToast(t.syncFailed, 'error')
    } finally {
      setActiveGlobalSyncMode(null)
    }
  }

  const getServiceHealth = (service: SystemJobService) => serviceHealth.find((item) =>
    service.serviceKey ? item.serviceKey === service.serviceKey : item.serviceName === service.title)

  const openServiceEditor = (service: SystemJobService) => {
    const health = getServiceHealth(service)
    setEditingService(service)
    setEditedInterval(String(health?.intervalMinutes ?? (parseInt(service.cadence, 10) || 1)))
    setEditedOnHold(health ? !health.isEnabled : service.status !== t.systemJobsLive && service.status !== 'Live')
  }

  const saveServiceEditor = async () => {
    if (!editingService) {
      return
    }

    const intervalMinutes = Math.max(1, Number.parseInt(editedInterval, 10) || 1)

    if (editingService.serviceKey) {
      setIsSavingService(true)
      try {
        const result = await authorizedRequest<SyncServiceConfigurationResponse>(
          user.token,
          `/api/system-jobs/services/${editingService.serviceKey}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              isEnabled: !editedOnHold,
              intervalMinutes,
            }),
          },
        )

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        await loadServiceHealth()
        onToast(t.systemJobsServiceUpdated, 'success')
      } catch {
        onToast(t.genericError, 'error')
        return
      } finally {
        setIsSavingService(false)
      }
    }

    setServices((current) => current.map((service) => service.title === editingService.title
      ? {
        ...service,
        cadence: `${intervalMinutes} min`,
        status: editedOnHold ? t.systemJobsOnHold : t.systemJobsLive,
      }
      : service))
    setEditingService(null)
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content system-jobs-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.systemJobsPanelEyebrow}</p>
          <h1>{t.systemJobsPanelTitle}</h1>
          <p>{t.systemJobsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isInitialLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {activeGlobalSyncMode && (
          <FullPageProcessingOverlay label={activeGlobalSyncLabel ?? t.syncOperations} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="matches" />
            <h2>{t.systemJobsCoreTitle}</h2>
          </div>
          <div className="tournament-table-shell system-services-table-shell">
            <table className="tournament-table system-services-table">
              <thead>
                <tr>
                  <th>{t.systemJobsService}</th>
                  <th>Status</th>
                  <th>{t.systemJobsInterval}</th>
                  <th>{t.systemJobsNextRun}</th>
                  <th>{t.systemJobsPurpose}</th>
                  <th>{t.userActions}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.title}>
                    <td><strong>{service.title}</strong></td>
                    <td>
                      <span className={`access-status-pill ${service.status === t.systemJobsLive || service.status === 'Live' ? 'active' : 'pending'}`}>
                        {service.status}
                      </span>
                    </td>
                    <td>{service.cadence}</td>
                    <td>{service.nextRun}</td>
                    <td><span className="service-purpose-text">{service.copy}</span></td>
                    <td>
                      <div className="service-action-row">
                        <button type="button" onClick={() => setHealthService(service)}>
                          {t.systemJobsHealthTitle}
                        </button>
                        <button type="button" disabled={!service.serviceKey} onClick={() => openServiceEditor(service)}>
                          {t.edit}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="admin" />
            <h2>{t.systemJobsGlobalSyncTitle}</h2>
          </div>
          <p className="system-section-copy">{t.systemJobsGlobalSyncCopy}</p>
          <div className="sync-action-grid">
            {syncButtons.map((button) => (
              <button
                type="button"
                key={button.mode}
                disabled={Boolean(activeGlobalSyncMode)}
                onClick={() => runGlobalSync(button.mode)}
              >
                {activeGlobalSyncMode === button.mode ? <LoadingSpinner /> : <MenuIcon name="admin" />}
                <strong>{button.label}</strong>
                <span>{button.copy}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="tournaments" />
            <h2>{t.systemJobsRecentTitle}</h2>
          </div>
          <div className="tournament-table-shell system-runs-table-shell">
            <table className="tournament-table system-runs-table">
              <thead>
                <tr>
                  <th>{t.mode}</th>
                  <th>{t.tournamentName}</th>
                  <th>{t.status}</th>
                  <th>{t.started}</th>
                  <th>{t.finished}</th>
                  <th>{t.inserted}</th>
                  <th>{t.updatedRows}</th>
                  <th>{t.unchanged}</th>
                  <th>{t.error}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoadingRuns && recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.mode}</td>
                    <td><strong>{run.tournamentName}</strong></td>
                    <td>{run.status}</td>
                    <td>{formatDate(run.startedAtUtc, '-')}</td>
                    <td>{formatDate(run.finishedAtUtc, '-')}</td>
                    <td>{run.insertedMatches}</td>
                    <td>{run.updatedMatches}</td>
                    <td>{run.unchangedMatches}</td>
                    <td>{run.errorMessage || '-'}</td>
                  </tr>
                ))}
                {!isLoadingRuns && recentRuns.length === 0 && (
                  <tr>
                    <td colSpan={9}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editingService && (
          <SystemServiceModal
            t={t}
            service={editingService}
            interval={editedInterval}
            onHold={editedOnHold}
            isSaving={isSavingService}
            onIntervalChange={setEditedInterval}
            onHoldChange={setEditedOnHold}
            onCancel={() => setEditingService(null)}
            onSave={saveServiceEditor}
          />
        )}

        {healthService && (
          <SystemServiceHealthModal
            t={t}
            service={healthService}
            health={getServiceHealth(healthService)}
            isLoading={isLoadingHealth}
            onCancel={() => setHealthService(null)}
          />
        )}
      </div>
    </section>
  )
}

function DataQualityPanel({
  t,
  user,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const checkIcons: MenuIconName[] = ['tournaments', 'matches', 'admin', 'ratings', 'teams', 'predictions']
  const [checks, setChecks] = useState<DataQualityTournamentCheck[]>([])
  const [selectedCheck, setSelectedCheck] = useState<(typeof t.dataQualityChecks)[number] | null>(null)
  const [selectedCheckIssues, setSelectedCheckIssues] = useState<DataQualityIssue[]>([])
  const [isLoadingIssues, setIsLoadingIssues] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadChecks = async () => {
      setIsLoading(true)
      try {
        const result = await authorizedRequest<DataQualityTournamentCheck[]>(user.token, '/api/admin/data-quality/tournament-checks')

        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        setChecks(result.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadChecks()

    return () => {
      isMounted = false
    }
  }, [t.genericError, user.token])

  const getStatusLabel = (status: string) => {
    if (status === 'Healthy') {
      return t.dataQualityStatusHealthy
    }

    if (status === 'Critical') {
      return t.dataQualityStatusCritical
    }

    return t.dataQualityStatusReview
  }

  const openIssuesModal = async (metadata: (typeof t.dataQualityChecks)[number]) => {
    setSelectedCheck(metadata)
    setSelectedCheckIssues([])
    setIsLoadingIssues(true)

    try {
      const result = await authorizedRequest<DataQualityIssue[]>(
        user.token,
        `/api/admin/data-quality/tournament-checks/${metadata.key}/issues`,
      )

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setSelectedCheckIssues(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoadingIssues(false)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content data-quality-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.dataQualityPanelEyebrow}</p>
          <h1>{t.dataQualityPanelTitle}</h1>
          <p>{t.dataQualityPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="data-quality-live-checks">
          <div className="data-quality-check-grid">
            {t.dataQualityChecks.map((metadata, index) => {
              const liveCheck = checks.find((check) => check.key === metadata.key)
              const status = liveCheck?.status ?? 'Healthy'

              return (
              <button
                type="button"
                className="data-quality-check-card"
                key={metadata.key}
                onClick={() => openIssuesModal(metadata)}
              >
                <div className="data-quality-check-head">
                  <MenuIcon name={checkIcons[index]} />
                  <div className="data-quality-check-title-row">
                    <h3>{metadata.title}</h3>
                    <p>{metadata.copy}</p>
                  </div>
                </div>
                <div className="data-quality-check-live">
                  <strong className={`quality-status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {getStatusLabel(status)}
                  </strong>
                  <dl>
                    <div>
                      <dt>{t.dataQualityIssuesFound}</dt>
                      <dd>{liveCheck?.issueCount ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>{t.dataQualityCheckedRecords}</dt>
                      <dd>{liveCheck?.checkedCount ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>{t.dataQualityLastSample}</dt>
                      <dd>{liveCheck?.lastSampleUtc ? formatDate(liveCheck.lastSampleUtc, t.dataQualityNoSample) : t.dataQualityNoSample}</dd>
                    </div>
                  </dl>
                </div>
              </button>
            )})}
          </div>
        </section>

        {selectedCheck && (
          <DataQualityIssuesModal
            t={t}
            check={selectedCheck}
            issues={selectedCheckIssues}
            isLoading={isLoadingIssues}
            onCancel={() => setSelectedCheck(null)}
          />
        )}
      </div>
    </section>
  )
}

function DataQualityIssuesModal({
  t,
  check,
  issues,
  isLoading,
  onCancel,
}: {
  t: (typeof translations)[Language]
  check: (typeof t.dataQualityChecks)[number]
  issues: DataQualityIssue[]
  isLoading: boolean
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal data-quality-issues-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-quality-issues-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="admin" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.dataQualityProblems}</p>
          <h2 id="data-quality-issues-title">{check.title}</h2>
          <p>{check.copy}</p>
        </div>

        {isLoading ? (
          <div className="modal-loading-block">
            <LoadingSpinner />
            <strong>{t.loading}</strong>
          </div>
        ) : issues.length > 0 ? (
          <div className="tournament-table-shell compact-table-shell data-quality-issues-table-shell">
            <table className="tournament-table data-quality-issues-table">
              <thead>
                <tr>
                  <th>{t.dataQualitySeverity}</th>
                  <th>{t.dataQualityTournament}</th>
                  <th>{t.dataQualityEntity}</th>
                  <th>{t.dataQualityProblem}</th>
                  <th>{t.dataQualitySample}</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <tr key={`${issue.key}-${issue.entityId ?? issue.entityLabel}-${index}`}>
                    <td>
                      <span className={`quality-severity-pill ${issue.severity.toLowerCase()}`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td>{issue.tournamentName}</td>
                    <td>
                      <strong>{issue.entityLabel}</strong>
                      <span>{issue.entityType}{issue.entityId ? ` #${issue.entityId}` : ''}</span>
                    </td>
                    <td>{issue.issue}</td>
                    <td>{issue.sampleUtc ? formatDate(issue.sampleUtc, t.dataQualityNoSample) : t.dataQualityNoSample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="delete-modal-target">
            <strong>{t.dataQualityNoProblems}</strong>
          </div>
        )}

        <div className="delete-modal-actions single">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function SystemServiceModal({
  t,
  service,
  interval,
  onHold,
  isSaving,
  onIntervalChange,
  onHoldChange,
  onCancel,
  onSave,
}: {
  t: (typeof translations)[Language]
  service: SystemJobService
  interval: string
  onHold: boolean
  isSaving: boolean
  onIntervalChange: (value: string) => void
  onHoldChange: (value: boolean) => void
  onCancel: () => void
  onSave: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal system-service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-service-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="matches" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.systemJobsEditService}</p>
          <h2 id="system-service-title">{service.title}</h2>
          <p>{service.copy}</p>
          <div className="delete-modal-target">
            <strong>{service.cadence}</strong>
            <span>{t.systemJobsNextRun}: {service.nextRun}</span>
          </div>
        </div>
        <div className="system-service-form">
          <label className="form-field">
            <span>{t.systemJobsInterval}</span>
            <input
              type="number"
              min="1"
              value={interval}
              disabled={isSaving}
              onChange={(event) => onIntervalChange(event.target.value)}
            />
          </label>
          <label className="system-service-toggle">
            <input
              type="checkbox"
              checked={onHold}
              disabled={isSaving}
              onChange={(event) => onHoldChange(event.target.checked)}
            />
            <span>{t.systemJobsHoldService}</span>
          </label>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="button" disabled={isSaving} onClick={onSave}>
            {isSaving ? '...' : t.systemJobsSaveService}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function SystemServiceHealthModal({
  t,
  service,
  health,
  isLoading,
  onCancel,
}: {
  t: (typeof translations)[Language]
  service: SystemJobService
  health?: SyncServiceHealth
  isLoading: boolean
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal system-health-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-health-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="ratings" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.systemJobsHealthTitle}</p>
          <h2 id="system-health-title">{service.title}</h2>
          <p>{service.copy}</p>
        </div>

        {isLoading && (
          <div className="system-health-card loading">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && health && (
          <article className="system-health-card modal-health-card">
            <div className="system-health-card-heading">
              <MenuIcon name="matches" />
              <div>
                <span>{health.mode || service.title}</span>
                <strong>{health.status}</strong>
              </div>
            </div>
            <dl>
              <div><dt>{t.systemJobsInterval}</dt><dd>{formatMinutes(health.intervalMinutes)}</dd></div>
              <div><dt>{t.systemJobsLastRun}</dt><dd>{formatDate(health.lastRunUtc, '-')}</dd></div>
              <div><dt>{t.systemJobsLastSuccess}</dt><dd>{formatDate(health.lastSuccessUtc, '-')}</dd></div>
              <div><dt>{t.systemJobsLastFailure}</dt><dd>{formatDate(health.lastFailureUtc, '-')}</dd></div>
              <div><dt>{t.systemJobsEligibleTournaments}</dt><dd>{health.eligibleTournamentCount} / {health.activeTournamentCount}</dd></div>
              <div><dt>{t.systemJobsRuns24h}</dt><dd>{health.runsLast24Hours}</dd></div>
              <div><dt>{t.systemJobsFailures24h}</dt><dd>{health.failuresLast24Hours}</dd></div>
              <div><dt>{t.error}</dt><dd>{health.lastError || '-'}</dd></div>
            </dl>
            <small>{health.notes}</small>
          </article>
        )}

        {!isLoading && !health && (
          <div className="delete-modal-target">
            <strong>-</strong>
            <span>{t.genericError}</span>
          </div>
        )}

        <div className="delete-modal-actions single">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function UsersAccessPanel({
  t,
  user,
  language,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  language: Language
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null)
  const [actionUser, setActionUser] = useState<AdminUser | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'locked'>('all')
  const [sortKey, setSortKey] = useState<UserSortKey>('email')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      setIsLoading(true)
      try {
        const result = await authorizedRequest<AdminUser[]>(user.token, '/api/admin/users')

        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        setUsers(result.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [t, user.token])

  const userStatusKey = (adminUser: AdminUser): 'active' | 'pending' | 'locked' => {
    if (adminUser.isLockedOut) {
      return 'locked'
    }

    if (!adminUser.emailConfirmed) {
      return 'pending'
    }

    return 'active'
  }

  const userStatus = (adminUser: AdminUser) => {
    const key = userStatusKey(adminUser)

    if (key === 'locked') {
      return { className: key, label: t.accessLocked }
    }

    if (key === 'pending') {
      return { className: key, label: t.accessPending }
    }

    return { className: key, label: t.accessActive }
  }

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users
      .filter((adminUser) => {
        const statusKey = userStatusKey(adminUser)

        if (statusFilter !== 'all' && statusKey !== statusFilter) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const searchable = [
          adminUser.email,
          adminUser.displayName || '',
          adminUser.roles.join(', '),
          userStatus(adminUser).label,
        ].join(' ').toLowerCase()

        return searchable.includes(normalizedSearch)
      })
      .sort((left, right) => {
        let comparison = 0

        if (sortKey === 'email') {
          comparison = compareText(left.email, right.email)
        } else if (sortKey === 'displayName') {
          comparison = compareText(left.displayName || '', right.displayName || '')
        } else if (sortKey === 'role') {
          comparison = compareText(left.roles.join(', '), right.roles.join(', '))
        } else if (sortKey === 'status') {
          comparison = compareText(userStatus(left).label, userStatus(right).label)
        } else {
          comparison = new Date(left.memberSinceUtc).getTime() - new Date(right.memberSinceUtc).getTime()
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
  }, [search, sortDirection, sortKey, statusFilter, t, users])

  const requestUserSort = (key: UserSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const userHeaders: Array<{ key: UserSortKey; label: string }> = [
    { key: 'email', label: t.userEmail },
    { key: 'displayName', label: t.userDisplayName },
    { key: 'role', label: t.userRole },
    { key: 'status', label: t.userStatus },
    { key: 'memberSince', label: t.memberSince },
  ]

  const toggleUserSuspension = async (target: AdminUser) => {
    const nextIsLockedOut = !target.isLockedOut
    setProcessingUserId(target.id)

    try {
      const result = await authorizedRequest<void>(
        user.token,
        `/api/admin/users/${target.id}/${nextIsLockedOut ? 'suspend' : 'unsuspend'}`,
        { method: 'POST' },
      )

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setUsers((current) => current.map((adminUser) => adminUser.id === target.id
        ? { ...adminUser, isLockedOut: nextIsLockedOut }
        : adminUser))
      setActionUser(null)
      onToast(nextIsLockedOut ? t.userSuspendSuccess : t.userUnsuspendSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  const deleteUser = async (target: AdminUser) => {
    setProcessingUserId(target.id)

    try {
      const result = await authorizedRequest<void>(user.token, `/api/admin/users/${target.id}`, {
        method: 'DELETE',
      })

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setUsers((current) => current.filter((adminUser) => adminUser.id !== target.id))
      setActionUser(null)
      onToast(t.userDeleteSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  const changeUserRole = async (target: AdminUser, role: string) => {
    setProcessingUserId(target.id)

    try {
      const result = await authorizedRequest<AdminUser>(user.token, `/api/admin/users/${target.id}/role`, {
        method: 'POST',
        body: JSON.stringify({
          role,
          language,
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setUsers((current) => current.map((adminUser) => adminUser.id === target.id ? result.data! : adminUser))
      setActionUser(result.data)
      onToast(t.userRoleChangeSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  const resendConfirmation = async (target: AdminUser) => {
    setProcessingUserId(target.id)

    try {
      const result = await authorizedRequest<void>(user.token, `/api/admin/users/${target.id}/resend-confirmation`, {
        method: 'POST',
        body: JSON.stringify({ language }),
      })

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(t.userConfirmationResent, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content users-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.usersPanelEyebrow}</p>
          <h1>{t.usersPanelTitle}</h1>
          <p>{t.usersPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <div className="tournament-toolbar user-toolbar">
          <label className="tournament-search">
            <span>{t.userSearch}</span>
            <input
              type="search"
              value={search}
              placeholder={t.userSearchPlaceholder}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="tournament-filter user-filter" aria-label={t.userStatus}>
            {([
              ['all', t.userFilterAll],
              ['active', t.userFilterActive],
              ['pending', t.userFilterPending],
              ['locked', t.userFilterLocked],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={statusFilter === key ? 'active' : ''}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="profile" />
            <h2>{t.usersDirectoryTitle}</h2>
          </div>
          <div className="tournament-table-shell users-table-shell">
            <table className="tournament-table users-table">
              <thead>
                <tr>
                  {userHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestUserSort(header.key)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.userActions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && visibleUsers.map((adminUser) => {
                  const status = userStatus(adminUser)
                  return (
                  <tr key={adminUser.id}>
                    <td>
                      <strong>{adminUser.email}</strong>
                    </td>
                    <td>{adminUser.displayName || '-'}</td>
                    <td>
                      <span className="access-role-pill">{adminUser.roles.join(', ') || '-'}</span>
                    </td>
                    <td>
                      <span className={`access-status-pill ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>{formatDate(adminUser.memberSinceUtc, '-')}</td>
                    <td>
                      <div className="user-action-row">
                        <button type="button" onClick={() => setDetailsUser(adminUser)}>
                          {t.details}
                        </button>
                        <button type="button" disabled={processingUserId === adminUser.id} onClick={() => setActionUser(adminUser)}>
                          {t.actions}
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {!isLoading && visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={6}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {detailsUser && (
          <UserDetailsModal
            t={t}
            user={detailsUser}
            status={userStatus(detailsUser).label}
            onCancel={() => setDetailsUser(null)}
          />
        )}

        {actionUser && (
          <UserActionsModal
            t={t}
            user={actionUser}
            currentUserEmail={user.email}
            isProcessing={processingUserId === actionUser.id}
            onCancel={() => setActionUser(null)}
            onChangeRole={(role) => changeUserRole(actionUser, role)}
            onResendConfirmation={() => resendConfirmation(actionUser)}
            onToggleSuspension={() => toggleUserSuspension(actionUser)}
            onDelete={() => deleteUser(actionUser)}
          />
        )}
      </div>
    </section>
  )
}

function SquadsPanel({
  t,
  user,
  onToast,
  onBack,
  onEdit,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
  onEdit: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [squadFilter, setSquadFilter] = useState<'all' | 'unlinked' | 'missing-snapshots'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [bulkImportingTournamentId, setBulkImportingTournamentId] = useState<number | null>(null)
  const [coverageByTournamentId, setCoverageByTournamentId] = useState<Record<number, SquadTournamentCoverage>>({})
  const [sortKey, setSortKey] = useState<SquadTournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const toCoverageMap = (items: TournamentSquadCoverageResponse[]) => Object.fromEntries(
    items.map((item) => [
      item.tournamentId,
      {
        tournamentId: item.tournamentId,
        teamCount: item.teamCount,
        linkedTeams: item.transfermarktMappedTeams,
        snapshotTeams: item.snapshotTeams,
        lastSnapshotUtc: item.lastSnapshotUtc,
      },
    ]),
  )

  const getTournamentCoverage = async (tournament: TournamentSummary): Promise<SquadTournamentCoverage> => {
    const teamsResult = await authorizedRequest<TeamSummary[]>(user.token, `/api/tournaments/${tournament.id}/teams`)

    if (!teamsResult.ok || !teamsResult.data) {
      return {
        linkedTeams: 0,
        snapshotTeams: 0,
        lastSnapshotUtc: null,
      }
    }

    const teamStates = await Promise.all(teamsResult.data.map(async (team) => {
      const [mappingsResult, snapshotResult] = await Promise.all([
        authorizedRequest<ExternalTeamMapping[]>(user.token, `/api/teams/${team.id}/external-mappings`),
        authorizedRequest<SquadQualitySnapshot>(user.token, `/api/teams/${team.id}/squad-quality/latest`),
      ])

      return {
        hasMapping: Boolean(mappingsResult.data?.some((mapping) => mapping.provider.toLowerCase() === 'transfermarkt')),
        snapshot: snapshotResult.ok ? snapshotResult.data : undefined,
      }
    }))

    const snapshots = teamStates
      .map((state) => state.snapshot?.fetchedAtUtc)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

    return {
      linkedTeams: teamStates.filter((state) => state.hasMapping).length,
      snapshotTeams: teamStates.filter((state) => Boolean(state.snapshot)).length,
      lastSnapshotUtc: snapshots[0] ?? null,
    }
  }

  const refreshTournamentCoverage = async (tournament: TournamentSummary) => {
    const coverage = await getTournamentCoverage(tournament)

    setCoverageByTournamentId((current) => ({
      ...current,
      [tournament.id]: coverage,
    }))
  }

  useEffect(() => {
    let isMounted = true

    async function loadTournamentsWithCoverage() {
      setIsLoading(true)
      try {
        const [tournamentsResult, coverageResult] = await Promise.all([
          authorizedRequest<TournamentSummary[]>(user.token, '/api/tournaments'),
          authorizedRequest<TournamentSquadCoverageResponse[]>(user.token, '/api/tournaments/squad-quality/coverage'),
        ])

        if (!isMounted) {
          return
        }

        if (!tournamentsResult.ok || !tournamentsResult.data) {
          onToast(tournamentsResult.message || t.squadLoadFailed, 'error')
          return
        }

        if (!coverageResult.ok || !coverageResult.data) {
          onToast(coverageResult.message || t.squadLoadFailed, 'error')
          return
        }

        setTournaments(tournamentsResult.data)
        setCoverageByTournamentId(toCoverageMap(coverageResult.data))
      } catch {
        if (isMounted) {
          onToast(t.squadLoadFailed, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTournamentsWithCoverage()

    return () => {
      isMounted = false
    }
  }, [t, user.token])

  const sortedTournaments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = tournaments
      .filter((tournament) => {
        const matchesSearch = !normalizedSearch ||
          [
          tournament.name,
          tournament.season,
          tournament.competitionName,
          tournament.competitionCountry,
          ].some((value) => value.toLowerCase().includes(normalizedSearch))

        const coverage = coverageByTournamentId[tournament.id]
        const hasMissingSquadLinks = tournament.teamCount > 0 && (coverage?.linkedTeams ?? 0) < tournament.teamCount
        const hasMissingSnapshot = tournament.teamCount > 0 && (coverage?.snapshotTeams ?? 0) < tournament.teamCount

        const matchesFilter =
          squadFilter === 'all' ||
          (squadFilter === 'unlinked' && hasMissingSquadLinks) ||
          (squadFilter === 'missing-snapshots' && hasMissingSnapshot)

        return matchesSearch && matchesFilter
      })

    return filtered.sort((left, right) => {
      const leftCoverage = coverageByTournamentId[left.id]
      const rightCoverage = coverageByTournamentId[right.id]
      let comparison = 0

      if (sortKey === 'name') {
        comparison = compareText(left.name, right.name)
      } else if (sortKey === 'season') {
        comparison = compareText(left.season || '', right.season || '')
      } else if (sortKey === 'teams') {
        comparison = left.teamCount - right.teamCount
      } else if (sortKey === 'coverage') {
        comparison = (leftCoverage?.linkedTeams ?? 0) - (rightCoverage?.linkedTeams ?? 0)
      } else if (sortKey === 'snapshot') {
        comparison = new Date(leftCoverage?.lastSnapshotUtc ?? 0).getTime() - new Date(rightCoverage?.lastSnapshotUtc ?? 0).getTime()
      }

      if (comparison === 0) {
        comparison = compareText(left.name, right.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [coverageByTournamentId, search, sortDirection, sortKey, squadFilter, tournaments])

  const requestSort = (key: SquadTournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'coverage' || key === 'snapshot' ? 'desc' : 'asc')
  }

  const squadTournamentHeaders: Array<{ key: SquadTournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'teams', label: t.squadTeamCount },
    { key: 'coverage', label: t.squadCoverage },
    { key: 'snapshot', label: t.squadLastImport },
  ]

  const importTournamentSnapshots = async (tournament: TournamentSummary) => {
    setBulkImportingTournamentId(tournament.id)
    let completionToast: { message: string; tone: ToastTone } | null = null
    try {
      const teamsResult = await authorizedRequest<TeamSummary[]>(user.token, `/api/tournaments/${tournament.id}/teams`)

      if (!teamsResult.ok || !teamsResult.data) {
        completionToast = { message: teamsResult.message || t.squadTeamLoadFailed, tone: 'error' }
        return
      }

      const rows = await Promise.all(teamsResult.data.map(async (team) => {
        const mappingsResult = await authorizedRequest<ExternalTeamMapping[]>(user.token, `/api/teams/${team.id}/external-mappings`)
        return {
          team,
          mapping: mappingsResult.data?.find((mapping) => mapping.provider.toLowerCase() === 'transfermarkt'),
        }
      }))

      const mappedRows = rows.filter((row): row is { team: TeamSummary; mapping: ExternalTeamMapping } => Boolean(row.mapping))

      if (mappedRows.length === 0) {
        completionToast = { message: t.squadBulkImportNoMappings, tone: 'info' }
        return
      }

      const results = await Promise.all(mappedRows.map((row) => authorizedRequest<ImportTransfermarktSquadResponse>(
        user.token,
        `/api/admin/teams/${row.team.id}/transfermarkt/import`,
        {
          method: 'POST',
          body: JSON.stringify({
            transfermarktUrl: row.mapping.sourceUrl,
            season: tournament.season || null,
          }),
        },
      )))

      const failedCount = results.filter((result) => !result.ok).length

      if (failedCount > 0) {
        await refreshTournamentCoverage(tournament)
        completionToast = { message: `${t.squadBulkImportSuccess} ${mappedRows.length - failedCount}/${mappedRows.length}`, tone: 'error' }
        return
      }

      await refreshTournamentCoverage(tournament)
      completionToast = { message: `${t.squadBulkImportSuccess} ${mappedRows.length}/${mappedRows.length}`, tone: 'success' }
    } catch {
      completionToast = { message: t.squadImportFailed, tone: 'error' }
    } finally {
      setBulkImportingTournamentId(null)
      if (completionToast) {
        const nextToast = completionToast
        window.setTimeout(() => onToast(nextToast.message, nextToast.tone), 0)
      }
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content squads-panel tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.squadsPanelEyebrow}</p>
          <h1>{t.squadsPanelTitle}</h1>
          <p>{t.squadsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        <div className="tournament-toolbar squad-toolbar">
          <label className="tournament-search">
            <span>{t.tournamentSearch}</span>
            <input
              placeholder={t.tournamentSearchPlaceholder}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="tournament-filter squad-filter" aria-label={t.squadCoverage}>
            {[
              ['all', t.squadFilterAll],
              ['unlinked', t.squadFilterUnlinked],
              ['missing-snapshots', t.squadFilterMissingSnapshots],
            ].map(([value, label]) => (
              <button
                className={squadFilter === value ? 'active' : ''}
                type="button"
                key={value}
                onClick={() => setSquadFilter(value as 'all' | 'unlinked' | 'missing-snapshots')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {bulkImportingTournamentId !== null && (
          <FullPageProcessingOverlay label={t.importRunning} />
        )}

        <div className="tournament-table-shell">
          {!isLoading && (
            <table className="tournament-table squads-table">
              <thead>
                <tr>
                  {squadTournamentHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.squadActions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td>
                      <strong>{tournament.name}</strong>
                      <small>{tournament.competitionCountry || tournament.competitionName}</small>
                    </td>
                    <td>{tournament.season || '-'}</td>
                    <td>{tournament.teamCount}</td>
                    <td>
                      <span className={`squad-coverage-pill ${(coverageByTournamentId[tournament.id]?.linkedTeams ?? 0) >= tournament.teamCount && tournament.teamCount > 0 ? 'linked' : 'missing'}`}>
                        {tournament.teamCount > 0 ? `${coverageByTournamentId[tournament.id]?.linkedTeams ?? 0} / ${tournament.teamCount}` : '-'}
                      </span>
                    </td>
                    <td>{formatDate(coverageByTournamentId[tournament.id]?.lastSnapshotUtc, t.notImported)}</td>
                    <td>
                      <div className="squad-action-row">
                        <button type="button" onClick={() => onEdit(tournament.id)}>
                          {t.editSquads}
                        </button>
                        <button
                          type="button"
                          disabled={bulkImportingTournamentId === tournament.id}
                          onClick={() => importTournamentSnapshots(tournament)}
                        >
                          {t.importSnapshot}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedTournaments.length === 0 && (
                  <tr>
                    <td colSpan={6}>{t.noSquadTournaments}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

function SquadDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: string
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [squadRows, setSquadRows] = useState<SquadTeamRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [importingTeamId, setImportingTeamId] = useState<number | null>(null)
  const [squadEditCandidate, setSquadEditCandidate] = useState<SquadTeamRow | null>(null)
  const [sortKey, setSortKey] = useState<SquadTeamSortKey>('team')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function loadSquadDetails() {
      setIsLoading(true)
      try {
        const tournamentResult = await authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`)

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data) {
          onToast(tournamentResult.message || t.squadTeamLoadFailed, 'error')
          return
        }

        const nextTournament = tournamentResult.data
        const rows = await Promise.all(nextTournament.teams.map(async (team) => {
          const [mappingsResult, snapshotResult] = await Promise.all([
            authorizedRequest<ExternalTeamMapping[]>(user.token, `/api/teams/${team.id}/external-mappings`),
            authorizedRequest<SquadQualitySnapshot>(user.token, `/api/teams/${team.id}/squad-quality/latest`),
          ])

          return {
            team,
            mapping: mappingsResult.data?.find((mapping) => mapping.provider.toLowerCase() === 'transfermarkt'),
            snapshot: snapshotResult.ok ? snapshotResult.data : undefined,
          }
        }))

        if (isMounted) {
          setTournament(nextTournament)
          setSquadRows(rows)
        }
      } catch {
        if (isMounted) {
          onToast(t.squadTeamLoadFailed, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSquadDetails()

    return () => {
      isMounted = false
    }
  }, [t, tournamentId, user.token])

  const importSnapshot = async (row: SquadTeamRow, transfermarktUrl?: string) => {
    const url = transfermarktUrl?.trim() || row.mapping?.sourceUrl

    if (!url) {
      setSquadEditCandidate(row)
      return
    }

    setImportingTeamId(row.team.id)
    let completionToast: { message: string; tone: ToastTone } | null = null
    try {
      const result = await authorizedRequest<ImportTransfermarktSquadResponse>(
        user.token,
        `/api/admin/teams/${row.team.id}/transfermarkt/import`,
        {
          method: 'POST',
          body: JSON.stringify({
            transfermarktUrl: url,
            season: tournament?.season || null,
          }),
        },
      )

      if (!result.ok || !result.data) {
        completionToast = { message: result.message || t.squadImportFailed, tone: 'error' }
        return
      }

      const imported = result.data
      setSquadRows((current) => current.map((item) => item.team.id === row.team.id
        ? {
            ...item,
            mapping: {
              id: imported.mappingId,
              teamId: imported.teamId,
              teamName: imported.teamName,
              provider: 'Transfermarkt',
              externalTeamId: imported.externalTeamId,
              externalSlug: imported.externalSlug,
              sourceUrl: imported.sourceUrl,
              createdAtUtc: new Date().toISOString(),
              updatedAtUtc: new Date().toISOString(),
            },
            snapshot: {
              id: imported.snapshotId,
              teamId: imported.teamId,
              teamName: imported.teamName,
              teamAbbreviation: item.team.abbreviation,
              provider: 'Transfermarkt',
              externalTeamId: imported.externalTeamId,
              externalSlug: imported.externalSlug,
              sourceUrl: imported.sourceUrl,
              season: imported.season,
              fetchedAtUtc: new Date().toISOString(),
              clubName: imported.clubName,
              playerCount: imported.playerCount,
              totalMarketValueEur: imported.totalMarketValueEur,
              topElevenMarketValueEur: imported.topElevenMarketValueEur,
              topFifteenMarketValueEur: imported.topFifteenMarketValueEur,
            },
          }
        : item))
      setSquadEditCandidate(null)
      completionToast = { message: t.squadImportSuccess, tone: 'success' }
    } catch {
      completionToast = { message: t.squadImportFailed, tone: 'error' }
    } finally {
      setImportingTeamId(null)
      if (completionToast) {
        const nextToast = completionToast
        window.setTimeout(() => onToast(nextToast.message, nextToast.tone), 0)
      }
    }
  }

  const requestSort = (key: SquadTeamSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'value' ? 'desc' : 'asc')
  }

  const sortedSquadRows = useMemo(() => {
    return [...squadRows].sort((left, right) => {
      let comparison = 0
      if (sortKey === 'team') {
        comparison = compareText(left.team.name, right.team.name)
      } else if (sortKey === 'value') {
        comparison = (left.snapshot?.totalMarketValueEur ?? -1) - (right.snapshot?.totalMarketValueEur ?? -1)
      } else if (sortKey === 'mapping') {
        comparison = Number(Boolean(left.mapping)) - Number(Boolean(right.mapping))
      } else if (sortKey === 'snapshot') {
        comparison = new Date(left.snapshot?.fetchedAtUtc ?? 0).getTime() - new Date(right.snapshot?.fetchedAtUtc ?? 0).getTime()
      }

      if (comparison === 0) {
        comparison = compareText(left.team.name, right.team.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [sortDirection, sortKey, squadRows])

  const squadHeaders: Array<{ key: SquadTeamSortKey; label: string }> = [
    { key: 'team', label: t.teamName },
    { key: 'value', label: t.totalTeamValue },
    { key: 'mapping', label: t.transfermarktMapping },
    { key: 'snapshot', label: t.latestSnapshot },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content squads-panel tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.squadsPanelEyebrow}</p>
          <h1>{t.squadTeamsTitle}</h1>
          <p>{t.squadTeamsCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToSquads}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {!isLoading && tournament ? (
          <section className="details-panel squad-team-panel">
            {importingTeamId !== null && (
              <FullPageProcessingOverlay label={t.importRunning} />
            )}
            <div className="details-panel-heading">
              <MenuIcon name="teams" />
              <h2>{tournament.name}</h2>
            </div>
            <p>{tournament.season}</p>

            <div className="tournament-table-shell squad-team-table-shell">
              <table className="tournament-table squads-table squad-team-table">
                <thead>
                  <tr>
                    {squadHeaders.map((header) => (
                      <th key={header.key}>
                        <button
                          type="button"
                          className="table-sort-button"
                          aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                          onClick={() => requestSort(header.key)}
                        >
                          <span>{header.label}</span>
                          <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                        </button>
                      </th>
                    ))}
                    <th>{t.squadActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSquadRows.map((row) => (
                    <tr key={row.team.id}>
                      <td>
                        <strong>{row.team.name}</strong>
                        <small>{row.team.abbreviation || '-'}</small>
                      </td>
                      <td>
                        <strong>{formatEuroValue(row.snapshot?.totalMarketValueEur, t.notImported)}</strong>
                        {row.snapshot?.topElevenMarketValueEur !== null && row.snapshot?.topElevenMarketValueEur !== undefined && (
                          <small>Top XI {formatEuroValue(row.snapshot.topElevenMarketValueEur)}</small>
                        )}
                      </td>
                      <td>
                        <span className={`squad-coverage-pill ${row.mapping ? 'linked' : 'missing'}`}>
                          {row.mapping ? t.linked : t.notLinked}
                        </span>
                      </td>
                      <td>
                        <strong>{row.snapshot ? formatDate(row.snapshot.fetchedAtUtc, t.notImported) : t.notImported}</strong>
                        {row.snapshot && (
                          <small>{row.snapshot.playerCount} players</small>
                        )}
                      </td>
                      <td>
                        <div className="squad-action-row">
                          <button type="button" disabled={importingTeamId === row.team.id} onClick={() => setSquadEditCandidate(row)}>
                            {t.edit}
                          </button>
                          <button type="button" disabled={importingTeamId === row.team.id} onClick={() => importSnapshot(row)}>
                            {t.importSnapshot}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {squadEditCandidate && tournament && (
          <EditSquadMappingModal
            t={t}
            row={squadEditCandidate}
            tournament={tournament}
            isSaving={importingTeamId === squadEditCandidate.team.id}
            onCancel={() => setSquadEditCandidate(null)}
            onImport={(url) => importSnapshot(squadEditCandidate, url)}
            onToast={onToast}
          />
        )}
      </div>
    </section>
  )
}

function FullPageProcessingOverlay({ label }: { label: string }) {
  return createPortal(
    <div className="processing-overlay page-processing-overlay" role="status" aria-live="polite">
      <div>
        <LoadingSpinner />
        <strong>{label}</strong>
      </div>
    </div>,
    document.body,
  )
}

function UserDetailsModal({
  t,
  user,
  status,
  onCancel,
}: {
  t: (typeof translations)[Language]
  user: AdminUser
  status: string
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="profile" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.details}</p>
          <h2 id="user-details-title">{t.userDetailsTitle}</h2>
          <p>{t.userDetailsCopy}</p>
          <div className="user-detail-grid">
            <div><span>{t.userEmail}</span><strong>{user.email}</strong></div>
            <div><span>{t.userDisplayName}</span><strong>{user.displayName || '-'}</strong></div>
            <div><span>{t.userRole}</span><strong>{user.roles.join(', ') || '-'}</strong></div>
            <div><span>{t.userStatus}</span><strong>{status}</strong></div>
            <div><span>{t.memberSince}</span><strong>{formatDate(user.memberSinceUtc, '-')}</strong></div>
            <div><span>{t.emailConfirmed}</span><strong>{user.emailConfirmed ? t.yes : t.no}</strong></div>
          </div>
        </div>
        <div className="delete-modal-actions single">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function UserActionsModal({
  t,
  user,
  currentUserEmail,
  isProcessing,
  onCancel,
  onChangeRole,
  onResendConfirmation,
  onToggleSuspension,
  onDelete,
}: {
  t: (typeof translations)[Language]
  user: AdminUser
  currentUserEmail: string
  isProcessing: boolean
  onCancel: () => void
  onChangeRole: (role: string) => void
  onResendConfirmation: () => void
  onToggleSuspension: () => void
  onDelete: () => void
}) {
  const [role, setRole] = useState(user.roles.includes('Admin') ? 'Admin' : 'User')
  const [confirmAction, setConfirmAction] = useState<'access' | 'delete' | null>(null)
  const isCurrentUser = user.email.toLowerCase() === currentUserEmail.toLowerCase()

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isProcessing, onCancel])

  const confirmedActionLabel = confirmAction === 'delete'
    ? t.delete
    : user.isLockedOut ? t.unsuspend : t.suspend

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isProcessing && onCancel()}>
      <section
        className="delete-modal user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-actions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="profile" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.actions}</p>
          <h2 id="user-actions-title">{t.adminUserActionsTitle}</h2>
          <p>{t.adminUserActionsCopy}</p>
          <div className="delete-modal-target">
            <strong>{user.email}</strong>
            <span>{user.displayName || '-'}</span>
          </div>
        </div>

        <div className="user-actions-grid">
          <label className="form-field">
            <span>{t.userRole}</span>
            <select value={role} disabled={isProcessing} onChange={(event) => setRole(event.target.value)}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <button type="button" disabled={isProcessing || user.roles.includes(role)} onClick={() => onChangeRole(role)}>
            {t.changeRole}
          </button>
          <button type="button" disabled={isProcessing || user.emailConfirmed} onClick={onResendConfirmation}>
            {t.resendConfirmation}
          </button>
          <button type="button" disabled={isProcessing || isCurrentUser} onClick={() => setConfirmAction('access')}>
            {user.isLockedOut ? t.unsuspend : t.suspend}
          </button>
          <button className="danger" type="button" disabled={isProcessing || isCurrentUser} onClick={() => setConfirmAction('delete')}>
            {t.delete}
          </button>
        </div>

        {confirmAction && (
          <div className="user-action-confirm">
            <strong>{t.confirmAction}</strong>
            <span>{confirmAction === 'delete' ? t.userDeleteCopy : user.isLockedOut ? t.userUnsuspendCopy : t.userSuspendCopy}</span>
            <div>
              <button type="button" disabled={isProcessing} onClick={() => setConfirmAction(null)}>
                {t.cancel}
              </button>
              <button
                className={confirmAction === 'delete' ? 'danger' : ''}
                type="button"
                disabled={isProcessing}
                onClick={confirmAction === 'delete' ? onDelete : onToggleSuspension}
              >
                {isProcessing ? '...' : confirmedActionLabel}
              </button>
            </div>
          </div>
        )}

        <div className="delete-modal-actions single">
          <button type="button" disabled={isProcessing} onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function TournamentsPanel({
  t,
  user,
  onToast,
  onBack,
  onCreate,
  onOpen,
  onEdit,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
  onCreate: () => void
  onOpen: (id: number) => void
  onEdit: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'not-synced'>('all')
  const [sortKey, setSortKey] = useState<TournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<TournamentSummary | null>(null)

  useEffect(() => {
    let isMounted = true

    authorizedRequest<TournamentSummary[]>(user.token, '/api/tournaments')
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.tournamentLoadFailed, 'error')
          return
        }

        setTournaments(result.data)
      })
      .catch(() => {
        if (isMounted) {
          onToast(t.tournamentLoadFailed, 'error')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [onToast, t, user.token])

  const filteredTournaments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = tournaments.filter((tournament) => {
      const matchesSearch = !normalizedSearch ||
        [
          tournament.name,
          tournament.competitionName,
          tournament.competitionCountry,
        ].some((value) => value.toLowerCase().includes(normalizedSearch))

      const matchesSync =
        syncFilter === 'all' ||
        (syncFilter === 'synced' && Boolean(tournament.lastSyncedAtUtc)) ||
        (syncFilter === 'not-synced' && !tournament.lastSyncedAtUtc)

      return matchesSearch && matchesSync
    })

    return [...filtered].sort((left, right) => {
      let comparison = 0

      if (sortKey === 'name') {
        comparison = compareText(left.name, right.name)
      } else if (sortKey === 'season') {
        comparison = compareText(left.season, right.season)
      } else if (sortKey === 'country') {
        comparison = compareText(left.competitionCountry, right.competitionCountry)
      } else if (sortKey === 'teams') {
        comparison = left.teamCount - right.teamCount
      } else if (sortKey === 'matches') {
        comparison = left.matchCount - right.matchCount
      } else if (sortKey === 'lastSync') {
        comparison = new Date(left.lastSyncedAtUtc || 0).getTime() - new Date(right.lastSyncedAtUtc || 0).getTime()
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [search, sortDirection, sortKey, syncFilter, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const deleteTournament = async () => {
    if (!deleteCandidate) {
      return
    }

    const tournament = deleteCandidate
    setIsDeletingId(tournament.id)
    try {
      const result = await authorizedRequest<void>(user.token, `/api/tournaments/${tournament.id}`, {
        method: 'DELETE',
      })

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setTournaments((current) => current.filter((item) => item.id !== tournament.id))
      setDeleteCandidate(null)
      onToast(t.tournamentDeleteSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsDeletingId(null)
    }
  }

  const sortableHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.tournamentTeams },
    { key: 'matches', label: t.tournamentMatches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.tournamentsPanelEyebrow}</p>
          <h1>{t.tournamentsPanelTitle}</h1>
          <p>{t.tournamentsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <div className="tournament-toolbar">
          <button
            className="form-submit compact"
            type="button"
            onClick={onCreate}
          >
            {t.addTournament}
          </button>
          <label className="tournament-search">
            <span>{t.tournamentSearch}</span>
            <input
              placeholder={t.tournamentSearchPlaceholder}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="tournament-filter" aria-label={t.tournamentLastSync}>
            {[
              ['all', t.tournamentFilterAll],
              ['synced', t.tournamentFilterSynced],
              ['not-synced', t.tournamentFilterNotSynced],
            ].map(([value, label]) => (
              <button
                className={syncFilter === value ? 'active' : ''}
                type="button"
                key={value}
                onClick={() => setSyncFilter(value as 'all' | 'synced' | 'not-synced')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="tournament-table-shell">
          <table className="tournament-table">
            <thead>
              <tr>
                {sortableHeaders.map((header) => (
                  <th key={header.key}>
                    <button
                      className="table-sort-button"
                      type="button"
                      aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                      onClick={() => requestSort(header.key)}
                    >
                      <span>{header.label}</span>
                      <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                    </button>
                  </th>
                ))}
                <th>{t.tournamentActions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTournaments.map((tournament) => (
                <tr key={tournament.id}>
                  <td>
                    <strong>{tournament.name}</strong>
                    <small>{tournament.competitionName}</small>
                  </td>
                  <td>{tournament.season || '-'}</td>
                  <td>{tournament.competitionCountry || '-'}</td>
                  <td>{tournament.teamCount}</td>
                  <td>{tournament.matchCount}</td>
                  <td>{formatDate(tournament.lastSyncedAtUtc, t.neverSynced)}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => onOpen(tournament.id)}>{t.open}</button>
                      <button type="button" onClick={() => onEdit(tournament.id)}>
                        {t.edit}
                      </button>
                      <button
                        className="danger"
                        type="button"
                        disabled={isDeletingId === tournament.id}
                        onClick={() => setDeleteCandidate(tournament)}
                      >
                        {isDeletingId === tournament.id ? '...' : t.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredTournaments.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan={7}>{t.noTournaments}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {deleteCandidate && (
        <DeleteTournamentModal
          t={t}
          tournament={deleteCandidate}
          isDeleting={isDeletingId === deleteCandidate.id}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={deleteTournament}
        />
      )}
    </section>
  )
}

function TournamentFormPage({
  t,
  user,
  tournamentId,
  onBack,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId?: string
  onBack: () => void
  onSaved: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const isEditMode = Boolean(tournamentId)
  const [liveScoreUrl, setLiveScoreUrl] = useState('')
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [applyHomeAdvantage, setApplyHomeAdvantage] = useState(true)
  const [locale, setLocale] = useState('en')
  const [timezoneOffset, setTimezoneOffset] = useState('0')
  const [preview, setPreview] = useState<TournamentPreview | null>(null)
  const [loadedTournament, setLoadedTournament] = useState<TournamentDetails | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingActiveValue, setPendingActiveValue] = useState<boolean | null>(null)

  useEffect(() => {
    if (!tournamentId) {
      return
    }

    let isMounted = true
    authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`)
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (result.status === 404) {
          onToast(t.tournamentNotFound, 'error')
          onBack()
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.tournamentLoadFailed, 'error')
          return
        }

        setLoadedTournament(result.data)
        setLiveScoreUrl(result.data.baseUrl)
        setName(result.data.name)
        setSeason(result.data.season)
        setIsActive(result.data.isActive)
        setApplyHomeAdvantage(result.data.applyHomeAdvantage)
        setLocale(result.data.locale)
        setTimezoneOffset(result.data.timezoneOffset)
      })
      .catch(() => {
        if (isMounted) {
          onToast(t.tournamentLoadFailed, 'error')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [onBack, onToast, t, tournamentId, user.token])

  const validate = (includeUrl: boolean) => {
    const nextErrors: Record<string, string> = {}

    if (includeUrl) {
      try {
        const parsedUrl = new URL(liveScoreUrl)
        if (!parsedUrl.hostname.includes('livescore.com')) {
          nextErrors.liveScoreUrl = t.tournamentUrlInvalid
        }
      } catch {
        nextErrors.liveScoreUrl = t.tournamentUrlInvalid
      }
    }

    if (!locale.trim()) {
      nextErrors.locale = t.required
    }

    if (!timezoneOffset.trim()) {
      nextErrors.timezoneOffset = t.required
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const previewTournament = async () => {
    const nextErrors = validate(true)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsPreviewing(true)
    try {
      const result = await authorizedRequest<TournamentPreview>(user.token, '/api/tournaments/preview', {
        method: 'POST',
        body: JSON.stringify({
          liveScoreUrl: liveScoreUrl.trim(),
          name: name.trim() || null,
          season: season.trim() || null,
          locale: locale.trim(),
          timezoneOffset: timezoneOffset.trim(),
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setPreview(result.data)
      setName((current) => current || result.data?.name || '')
      setSeason((current) => current || result.data?.season || '')
      setLocale(result.data.locale)
      setTimezoneOffset(result.data.timezoneOffset)
      onToast(t.tournamentPreviewLoaded, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsPreviewing(false)
    }
  }

  const saveTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(true)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = isEditMode
        ? await authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: name.trim() || null,
              season: season.trim() || null,
              isActive,
              applyHomeAdvantage,
              liveScoreUrl: liveScoreUrl.trim(),
              locale: locale.trim(),
              timezoneOffset: timezoneOffset.trim(),
            }),
          })
        : await authorizedRequest<TournamentDetails>(user.token, '/api/tournaments', {
            method: 'POST',
            body: JSON.stringify({
              liveScoreUrl: liveScoreUrl.trim(),
              name: name.trim() || null,
              season: season.trim() || null,
              applyHomeAdvantage,
              locale: locale.trim(),
              timezoneOffset: timezoneOffset.trim(),
            }),
          })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(isEditMode ? t.tournamentUpdated : t.tournamentCreated, 'success')
      onSaved()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const metadata = preview || loadedTournament

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournament-form-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{isEditMode ? t.tournamentEditEyebrow : t.tournamentCreateEyebrow}</p>
          <h1>{isEditMode ? t.tournamentEditTitle : t.tournamentCreateTitle}</h1>
          <p>{isEditMode ? t.tournamentEditCopy : t.tournamentCreateCopy}</p>
        </div>

        {isLoading ? (
          <div className="tournament-form-card centered">
            <LoadingSpinner />
          </div>
        ) : (
          <form className="tournament-form-card" noValidate onSubmit={saveTournament}>
            {isSubmitting && (
              <div className="form-loading-overlay" role="status" aria-live="polite">
                <LoadingSpinner />
                <strong>{isEditMode ? t.tournamentSaving : t.tournamentCreating}</strong>
              </div>
            )}
            {!isEditMode && (
              <div className="tournament-url-row">
                <FormField
                  error={errors.liveScoreUrl}
                  label={t.liveScoreUrl}
                  placeholder={t.liveScoreUrlPlaceholder}
                  type="url"
                  value={liveScoreUrl}
                  onChange={setLiveScoreUrl}
                />
                <button type="button" disabled={isPreviewing || isSubmitting} onClick={previewTournament}>
                  {isPreviewing ? '...' : t.previewTournament}
                </button>
              </div>
            )}
            {isEditMode && (
              <FormField
                error={errors.liveScoreUrl}
                label={t.liveScoreUrl}
                placeholder={t.liveScoreUrlPlaceholder}
                type="url"
                value={liveScoreUrl}
                onChange={setLiveScoreUrl}
              />
            )}

            <FormField
              error={errors.name}
              label={t.tournamentDisplayName}
              placeholder={t.tournamentDisplayNamePlaceholder}
              type="text"
              value={name}
              onChange={setName}
            />

            <FormField
              error={errors.season}
              label={t.tournamentSeason}
              placeholder="2026/2027"
              type="text"
              value={season}
              onChange={setSeason}
            />

            <label className="tournament-active-field">
              <span>
                <span>{t.homeAdvantage}</span>
                <small>{applyHomeAdvantage ? t.homeAdvantageEnabled : t.homeAdvantageDisabled}</small>
              </span>
              <button
                className={applyHomeAdvantage ? 'active-toggle on' : 'active-toggle off'}
                type="button"
                disabled={isSubmitting}
                onClick={() => setApplyHomeAdvantage((current) => !current)}
              >
                {applyHomeAdvantage ? t.homeAdvantageEnabled : t.homeAdvantageDisabled}
              </button>
            </label>

            {isEditMode && (
              <label className="tournament-active-field">
                <span>
                  <span>{t.status}</span>
                  <small>{isActive ? t.activeTournament : t.inactiveTournament}</small>
                </span>
                <button
                  className={isActive ? 'active-toggle on' : 'active-toggle off'}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPendingActiveValue(!isActive)}
                >
                  {isActive ? t.activeTournament : t.inactiveTournament}
                </button>
              </label>
            )}

            <div className="tournament-settings-grid">
              <FormField
                error={errors.locale}
                label={t.locale}
                type="text"
                value={locale}
                onChange={setLocale}
              />
              <FormField
                error={errors.timezoneOffset}
                label={t.timezoneOffset}
                type="text"
                value={timezoneOffset}
                onChange={setTimezoneOffset}
              />
            </div>

            {metadata && (
              <div className="tournament-preview-card">
                <h2>{t.tournamentPreviewTitle}</h2>
                <dl>
                  <div>
                    <dt>{t.tournamentName}</dt>
                    <dd>{metadata.name}</dd>
                  </div>
                  <div>
                    <dt>{t.tournamentSeason}</dt>
                    <dd>{metadata.season || '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.competition}</dt>
                    <dd>{metadata.competitionName}</dd>
                  </div>
                  <div>
                    <dt>{t.tournamentCountry}</dt>
                    <dd>{metadata.competitionCountry || '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.locale}</dt>
                    <dd>{metadata.locale}</dd>
                  </div>
                  <div>
                    <dt>{t.timezoneOffset}</dt>
                    <dd>{metadata.timezoneOffset}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="tournament-form-actions">
              <button type="button" disabled={isSubmitting} onClick={onBack}>
                {t.cancel}
              </button>
              <button className="form-submit" type="submit" disabled={isSubmitting || isPreviewing}>
                {isSubmitting ? '...' : isEditMode ? t.saveTournament : t.createTournament}
              </button>
            </div>
            {pendingActiveValue !== null && loadedTournament && (
              <TournamentActiveModal
                t={t}
                tournament={loadedTournament}
                nextIsActive={pendingActiveValue}
                onCancel={() => setPendingActiveValue(null)}
                onConfirm={() => {
                  setIsActive(pendingActiveValue)
                  setPendingActiveValue(null)
                }}
              />
            )}
          </form>
        )}
      </div>
    </section>
  )
}

function TournamentDetailsPage({
  t,
  user,
  tournamentId,
  onBack,
  onEdit,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: string
  onBack: () => void
  onEdit: (id: number) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [syncRuns, setSyncRuns] = useState<TournamentSyncRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeSyncMode, setActiveSyncMode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'teams' | 'matches'>('details')
  const [teamEditCandidate, setTeamEditCandidate] = useState<TournamentDetails['teams'][number] | null>(null)
  const [matchEditCandidate, setMatchEditCandidate] = useState<MatchSummary | null>(null)
  const [teamSortKey, setTeamSortKey] = useState<TeamSortKey>('name')
  const [teamSortDirection, setTeamSortDirection] = useState<SortDirection>('asc')
  const [matchSortKey, setMatchSortKey] = useState<MatchSortKey>('kickoff')
  const [matchSortDirection, setMatchSortDirection] = useState<SortDirection>('asc')

  const loadTournamentData = async () => {
    if (!tournamentId) {
      onBack()
      return
    }

    setIsLoading(true)
    try {
      const [detailsResult, matchesResult, syncRunsResult] = await Promise.all([
        authorizedRequest<TournamentDetails>(user.token, `/api/tournaments/${tournamentId}`),
        authorizedRequest<MatchSummary[]>(user.token, `/api/tournaments/${tournamentId}/matches`),
        authorizedRequest<TournamentSyncRun[]>(user.token, `/api/tournaments/${tournamentId}/sync-runs`),
      ])

      if (detailsResult.status === 404) {
        onToast(t.tournamentNotFound, 'error')
        onBack()
        return
      }

      if (!detailsResult.ok || !detailsResult.data) {
        onToast(detailsResult.message || t.tournamentLoadFailed, 'error')
        return
      }

      setTournament(detailsResult.data)
      setMatches(matchesResult.ok && matchesResult.data ? matchesResult.data : [])
      setSyncRuns(syncRunsResult.ok && syncRunsResult.data ? syncRunsResult.data : [])

      if (!matchesResult.ok) {
        onToast(matchesResult.message || t.genericError, 'error')
      }

      if (!syncRunsResult.ok) {
        onToast(syncRunsResult.message || t.genericError, 'error')
      }
    } catch {
      onToast(t.tournamentLoadFailed, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTournamentData()
  }, [tournamentId, user.token])

  const runSync = async (mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results') => {
    setActiveSyncMode(mode)
    try {
      const result = await authorizedRequest<SyncTournamentResponse>(user.token, `/api/tournaments/${tournamentId}/sync/${mode}`, {
        method: 'POST',
      })

      if (!result.ok) {
        onToast(result.message || t.syncFailed, 'error')
        return
      }

      onToast(t.syncStarted, 'success')
      await loadTournamentData()
    } catch {
      onToast(t.syncFailed, 'error')
    } finally {
      setActiveSyncMode(null)
    }
  }

  const finishedMatches = matches.filter((match) => ['Finished', 'AfterExtraTime', 'AfterPenalties', '3'].includes(String(match.status)) || String(match.syncState) === 'Finalized' || String(match.syncState) === '3')
  const liveMatches = matches.filter((match) => String(match.status) === 'Live' || String(match.status) === '2' || String(match.syncState) === 'Live' || String(match.syncState) === '2')
  const upcomingMatches = matches.filter((match) => String(match.status) === 'Upcoming' || String(match.status) === '1' || String(match.syncState) === 'Scheduled' || String(match.syncState) === '1')
  const problemMatches = matches.filter((match) => ['Cancelled', 'Postponed', 'Interrupted', 'Abandoned', '4', '5'].includes(String(match.status)))
  const missingTeamMatches = matches.filter((match) => !match.homeTeam || !match.awayTeam)
  const sortedWithDates = matches
    .filter((match) => match.kickoffUtc)
    .sort((left, right) => new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime())
  const now = Date.now()
  const nextMatch = sortedWithDates.find((match) => new Date(match.kickoffUtc || 0).getTime() >= now)
  const recentRuns = syncRuns.slice(0, 8)
  const syncButtons: Array<{ mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results'; label: string; copy: string }> = [
    { mode: 'full', label: t.fullSync, copy: t.fullSyncCopy },
    { mode: 'schedule', label: t.scheduleSync, copy: t.scheduleSyncCopy },
    { mode: 'live', label: t.liveSync, copy: t.liveSyncCopy },
    { mode: 'finalize', label: t.finalizeSync, copy: t.finalizeSyncCopy },
    { mode: 'results', label: t.resultsSync, copy: t.resultsSyncCopy },
  ]
  const activeSyncLabel = syncButtons.find((button) => button.mode === activeSyncMode)?.label

  const requestTeamSort = (key: TeamSortKey) => {
    if (teamSortKey === key) {
      setTeamSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTeamSortKey(key)
    setTeamSortDirection('asc')
  }

  const requestMatchSort = (key: MatchSortKey) => {
    if (matchSortKey === key) {
      setMatchSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setMatchSortKey(key)
    setMatchSortDirection('asc')
  }

  const sortedTeams = useMemo(() => {
    if (!tournament) {
      return []
    }

    return [...tournament.teams].sort((left, right) => {
      const comparison = teamSortKey === 'name'
        ? compareText(left.name, right.name)
        : compareText(left.abbreviation, right.abbreviation)

      return teamSortDirection === 'asc' ? comparison : -comparison
    })
  }, [teamSortDirection, teamSortKey, tournament])

  const sortedMatches = useMemo(() => {
    return [...matches].sort((left, right) => {
      let comparison = 0
      if (matchSortKey === 'kickoff') {
        comparison = new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime()
      } else if (matchSortKey === 'round') {
        comparison = compareText(left.roundInfo, right.roundInfo)
      } else if (matchSortKey === 'home') {
        comparison = compareText(left.homeTeam?.name || left.homeTeamNameSnapshot, right.homeTeam?.name || right.homeTeamNameSnapshot)
      } else if (matchSortKey === 'away') {
        comparison = compareText(left.awayTeam?.name || left.awayTeamNameSnapshot, right.awayTeam?.name || right.awayTeamNameSnapshot)
      } else if (matchSortKey === 'score') {
        comparison = (left.homeScore ?? -1) - (right.homeScore ?? -1) || (left.awayScore ?? -1) - (right.awayScore ?? -1)
      } else if (matchSortKey === 'status') {
        comparison = compareText(String(left.status), String(right.status))
      }

      return matchSortDirection === 'asc' ? comparison : -comparison
    })
  }, [matchSortDirection, matchSortKey, matches])

  const teamHeaders: Array<{ key: TeamSortKey; label: string }> = [
    { key: 'name', label: t.teamName },
    { key: 'abbreviation', label: t.abbreviation },
  ]

  const matchHeaders: Array<{ key: MatchSortKey; label: string }> = [
    { key: 'kickoff', label: t.kickoff },
    { key: 'round', label: t.round },
    { key: 'home', label: t.homeTeam },
    { key: 'away', label: t.awayTeam },
    { key: 'score', label: t.score },
    { key: 'status', label: t.status },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournament-details-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.tournamentDetailsEyebrow}</p>
          <h1>{tournament?.name ?? t.tournamentDetailsTitle}</h1>
          <p>{t.tournamentDetailsCopy}</p>
        </div>

        {isLoading && !activeSyncMode && (
          <FullPageProcessingOverlay label={t.loadingTournament} />
        )}

        {activeSyncMode && (
          <FullPageProcessingOverlay label={activeSyncLabel ?? t.syncOperations} />
        )}

        {!isLoading && tournament && (
          <>
            <div className="details-top-actions">
              <button type="button" onClick={onBack}>
                <MenuIcon name="arrow-left" />
                <span>{t.backToTournaments}</span>
              </button>
              <button type="button" onClick={() => onEdit(tournament.id)}>{t.edit}</button>
            </div>

            <div className="details-tabs">
              {[
                ['details', t.tabDetails],
                ['teams', t.tabTeams],
                ['matches', t.tabMatches],
              ].map(([value, label]) => (
                <button
                  className={activeTab === value ? 'active' : ''}
                  type="button"
                  key={value}
                  onClick={() => setActiveTab(value as 'details' | 'teams' | 'matches')}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <>
                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="tournaments" />
                    <h2>{t.overview}</h2>
                  </div>
                  <dl className="details-grid">
                    <div><dt>{t.tournamentName}</dt><dd>{tournament.name}</dd></div>
                    <div><dt>{t.tournamentSeason}</dt><dd>{tournament.season || '-'}</dd></div>
                    <div><dt>{t.competition}</dt><dd>{tournament.competitionName}</dd></div>
                    <div><dt>{t.tournamentCountry}</dt><dd>{tournament.competitionCountry || '-'}</dd></div>
                    <div><dt>{t.liveScoreCompetitionId}</dt><dd>{tournament.liveScoreCompetitionId || '-'}</dd></div>
                    <div><dt>{t.homeAdvantage}</dt><dd>{tournament.applyHomeAdvantage ? t.homeAdvantageEnabled : t.homeAdvantageDisabled}</dd></div>
                    <div><dt>{t.locale}</dt><dd>{tournament.locale}</dd></div>
                    <div><dt>{t.timezoneOffset}</dt><dd>{tournament.timezoneOffset}</dd></div>
                    <div><dt>{t.created}</dt><dd>{formatDate(tournament.createdAtUtc, '-')}</dd></div>
                    <div><dt>{t.tournamentLastSync}</dt><dd>{formatDate(tournament.lastSyncedAtUtc, t.neverSynced)}</dd></div>
                    <div><dt>{t.baseUrl}</dt><dd><a href={tournament.baseUrl} target="_blank" rel="noreferrer">{tournament.baseUrl}</a></dd></div>
                    <div><dt>{t.fixturesUrl}</dt><dd><a href={tournament.fixturesUrl} target="_blank" rel="noreferrer">{tournament.fixturesUrl}</a></dd></div>
                  </dl>
                </section>

                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="matches" />
                    <h2>{t.tournamentDataCoverage}</h2>
                  </div>
                  <div className="coverage-grid">
                    <div><span>{t.matches}</span><strong>{matches.length}</strong></div>
                    <div><span>{t.teams}</span><strong>{tournament.teams.length}</strong></div>
                    <div><span>{t.stages}</span><strong>{tournament.stages.length}</strong></div>
                    <div><span>{t.upcoming}</span><strong>{upcomingMatches.length}</strong></div>
                    <div><span>{t.live}</span><strong>{liveMatches.length}</strong></div>
                    <div><span>{t.finalized}</span><strong>{finishedMatches.length}</strong></div>
                    <div><span>{t.problemRecords}</span><strong>{problemMatches.length}</strong></div>
                    <div><span>{t.missingTeams}</span><strong>{missingTeamMatches.length}</strong></div>
                    <div><span>{t.nextMatch}</span><strong>{formatDate(nextMatch?.kickoffUtc, '-')}</strong></div>
                  </div>
                </section>

                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="admin" />
                    <h2>{t.syncOperations}</h2>
                  </div>
                  <div className="sync-action-grid">
                    {syncButtons.map((button) => (
                      <button
                        type="button"
                        key={button.mode}
                        disabled={Boolean(activeSyncMode)}
                        onClick={() => runSync(button.mode)}
                      >
                        {activeSyncMode === button.mode ? <LoadingSpinner /> : <MenuIcon name="admin" />}
                        <strong>{button.label}</strong>
                        <span>{button.copy}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="matches" />
                    <h2>{t.recentSyncRuns}</h2>
                  </div>
                  <div className="tournament-table-shell compact-table-shell">
                    <table className="tournament-table sync-runs-table">
                      <thead>
                        <tr>
                          <th>{t.mode}</th>
                          <th>{t.status}</th>
                          <th>{t.started}</th>
                          <th>{t.finished}</th>
                          <th>{t.inserted}</th>
                          <th>{t.updatedRows}</th>
                          <th>{t.unchanged}</th>
                          <th>{t.error}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentRuns.map((run) => (
                          <tr key={run.id}>
                            <td>{run.mode}</td>
                            <td>{run.status}</td>
                            <td>{formatDate(run.startedAtUtc, '-')}</td>
                            <td>{formatDate(run.finishedAtUtc, '-')}</td>
                            <td>{run.insertedMatches}</td>
                            <td>{run.updatedMatches}</td>
                            <td>{run.unchangedMatches}</td>
                            <td>{run.errorMessage || '-'}</td>
                          </tr>
                        ))}
                        {recentRuns.length === 0 && (
                          <tr>
                            <td className="empty-table" colSpan={8}>{t.noSyncRuns}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'teams' && (
              <section className="details-panel">
                <div className="details-panel-heading">
                  <MenuIcon name="teams" />
                  <h2>{t.teams}</h2>
                </div>
                <div className="tournament-table-shell compact-table-shell">
                  <table className="tournament-table sync-runs-table">
                    <thead>
                      <tr>
                        {teamHeaders.map((header) => (
                          <th key={header.key}>
                            <button
                              className="table-sort-button"
                              type="button"
                              aria-sort={teamSortKey === header.key ? (teamSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                              onClick={() => requestTeamSort(header.key)}
                            >
                              <span>{header.label}</span>
                              <span className="sort-indicator" aria-hidden="true">{teamSortKey === header.key ? (teamSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                            </button>
                          </th>
                        ))}
                        <th>{t.tournamentActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team) => (
                        <tr key={team.id}>
                          <td>{team.name}</td>
                          <td>{team.abbreviation || '-'}</td>
                          <td>
                            <div className="table-actions single-action">
                              <button type="button" onClick={() => setTeamEditCandidate(team)}>
                                {t.edit}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'matches' && (
              <section className="details-panel">
                <div className="details-panel-heading">
                  <MenuIcon name="matches" />
                  <h2>{t.matches}</h2>
                </div>
                <div className="tournament-table-shell compact-table-shell">
                  <table className="tournament-table matches-table">
                    <thead>
                      <tr>
                        {matchHeaders.map((header) => (
                          <th key={header.key}>
                            <button
                              className="table-sort-button"
                              type="button"
                              aria-sort={matchSortKey === header.key ? (matchSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                              onClick={() => requestMatchSort(header.key)}
                            >
                              <span>{header.label}</span>
                              <span className="sort-indicator" aria-hidden="true">{matchSortKey === header.key ? (matchSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                            </button>
                          </th>
                        ))}
                        <th>{t.tournamentActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMatches.map((match) => (
                        <tr key={match.id}>
                          <td>{formatDate(match.kickoffUtc, '-')}</td>
                          <td>{match.roundInfo || '-'}</td>
                          <td>{match.homeTeam?.name || match.homeTeamNameSnapshot || '-'}</td>
                          <td>{match.awayTeam?.name || match.awayTeamNameSnapshot || '-'}</td>
                          <td>{match.homeScore ?? '-'} : {match.awayScore ?? '-'}</td>
                          <td>{match.status}</td>
                          <td>
                            <div className="table-actions single-action">
                              <button type="button" onClick={() => setMatchEditCandidate(match)}>
                                {t.edit}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </>
        )}
        {teamEditCandidate && tournament && (
          <EditTeamModal
            t={t}
            team={teamEditCandidate}
            user={user}
            onCancel={() => setTeamEditCandidate(null)}
            onSaved={(updatedTeam) => {
              setTournament({
                ...tournament,
                teams: tournament.teams.map((team) => team.id === updatedTeam.id ? updatedTeam : team),
              })
              setMatches((current) => current.map((match) => ({
                ...match,
                homeTeam: match.homeTeam?.id === updatedTeam.id ? updatedTeam : match.homeTeam,
                awayTeam: match.awayTeam?.id === updatedTeam.id ? updatedTeam : match.awayTeam,
              })))
              setTeamEditCandidate(null)
              onToast(t.teamUpdated, 'success')
            }}
            onToast={onToast}
          />
        )}
        {matchEditCandidate && tournament && (
          <EditMatchModal
            t={t}
            user={user}
            tournament={tournament}
            match={matchEditCandidate}
            onCancel={() => setMatchEditCandidate(null)}
            onSaved={(updatedMatch) => {
              setMatches((current) => current.map((match) => match.id === updatedMatch.id ? updatedMatch : match))
              setMatchEditCandidate(null)
              onToast(t.matchUpdated, 'success')
            }}
            onToast={onToast}
          />
        )}
      </div>
    </section>
  )
}

function DeleteTournamentModal({
  t,
  tournament,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  t: (typeof translations)[Language]
  tournament: TournamentSummary
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isDeleting, onCancel])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isDeleting && onCancel()}>
      <section
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-tournament-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="tournaments" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.delete}</p>
          <h2 id="delete-tournament-title">{t.tournamentDeleteTitle}</h2>
          <p>{t.tournamentDeleteCopy}</p>
          <div className="delete-modal-target">
            <strong>{tournament.name}</strong>
            <span>{tournament.competitionName} - {tournament.competitionCountry || '-'}</span>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isDeleting} onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="danger" type="button" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? '...' : t.confirmDelete}
          </button>
        </div>
      </section>
    </div>
  )
}

function EditSquadMappingModal({
  t,
  row,
  tournament,
  isSaving,
  onCancel,
  onImport,
  onToast,
}: {
  t: (typeof translations)[Language]
  row: { team: TeamSummary; mapping?: ExternalTeamMapping; snapshot?: SquadQualitySnapshot }
  tournament: { name: string; season: string }
  isSaving: boolean
  onCancel: () => void
  onImport: (url: string) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [transfermarktUrl, setTransfermarktUrl] = useState(row.mapping?.sourceUrl || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const trimmedUrl = transfermarktUrl.trim()

    if (!trimmedUrl) {
      nextErrors.transfermarktUrl = t.required
    } else {
      try {
        const url = new URL(trimmedUrl)
        if (url.hostname.toLowerCase() !== 'www.transfermarkt.com') {
          nextErrors.transfermarktUrl = t.genericError
        }
      } catch {
        nextErrors.transfermarktUrl = t.genericError
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    onImport(trimmedUrl)
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-team-modal edit-squad-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-squad-title"
        noValidate
        onSubmit={submitImport}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="teams" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.editSquads}</p>
          <h2 id="edit-squad-title">{t.editSquadMappingTitle}</h2>
          <p>{t.editSquadMappingCopy}</p>
        </div>
        <div className="delete-modal-target">
          <strong>{row.team.name}</strong>
          <span>{tournament.name} - {tournament.season}</span>
        </div>
        <div className="edit-team-fields">
          <FormField
            error={errors.transfermarktUrl}
            label={t.transfermarktUrl}
            type="url"
            value={transfermarktUrl}
            onChange={setTransfermarktUrl}
          />
          <div className="squad-season-note">
            <span>{t.squadSeason}</span>
            <strong>{tournament.season || '-'}</strong>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? t.importRunning : t.saveAndImportSnapshot}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function TournamentActiveModal({
  t,
  tournament,
  nextIsActive,
  onCancel,
  onConfirm,
}: {
  t: (typeof translations)[Language]
  tournament: TournamentDetails
  nextIsActive: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-tournament-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="tournaments" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{nextIsActive ? t.confirmActivate : t.confirmDeactivate}</p>
          <h2 id="active-tournament-title">{nextIsActive ? t.activateTournamentTitle : t.deactivateTournamentTitle}</h2>
          <p>{nextIsActive ? t.activateTournamentCopy : t.deactivateTournamentCopy}</p>
          <div className="delete-modal-target">
            <strong>{tournament.name}</strong>
            <span>{tournament.season || '-'} - {tournament.competitionCountry || '-'}</span>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
          <button className={nextIsActive ? '' : 'danger'} type="button" onClick={onConfirm}>
            {nextIsActive ? t.confirmActivate : t.confirmDeactivate}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function EditTeamModal({
  t,
  user,
  team,
  onCancel,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  team: TournamentDetails['teams'][number]
  onCancel: () => void
  onSaved: (team: TournamentDetails['teams'][number]) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [name, setName] = useState(team.name)
  const [abbreviation, setAbbreviation] = useState(team.abbreviation)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const saveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) {
      nextErrors.name = t.required
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSaving(true)
    try {
      const result = await authorizedRequest<TournamentDetails['teams'][number]>(user.token, `/api/teams/${team.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          abbreviation: abbreviation.trim(),
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onSaved(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-team-title"
        noValidate
        onSubmit={saveTeam}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="teams" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.edit}</p>
          <h2 id="edit-team-title">{t.editTeamTitle}</h2>
          <p>{t.editTeamCopy}</p>
        </div>
        <div className="edit-team-fields">
          <FormField
            error={errors.name}
            label={t.teamName}
            type="text"
            value={name}
            onChange={setName}
          />
          <FormField
            label={t.abbreviation}
            type="text"
            value={abbreviation}
            onChange={setAbbreviation}
          />
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? '...' : t.saveTeam}
          </button>
        </div>
      </form>
    </div>
  )
}

function EditMatchModal({
  t,
  user,
  tournament,
  match,
  onCancel,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournament: TournamentDetails
  match: MatchSummary
  onCancel: () => void
  onSaved: (match: MatchSummary) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const statusLabels: Record<string, number> = { Unknown: 0, Upcoming: 1, Live: 2, Finished: 3, Postponed: 4, Cancelled: 5 }
  const syncStateLabels: Record<string, number> = { Unknown: 0, Scheduled: 1, Live: 2, Finalized: 3, Postponed: 4, Cancelled: 5 }
  const [stageId, setStageId] = useState(match.stageId?.toString() ?? '')
  const [kickoffUtc, setKickoffUtc] = useState(toDateTimeLocalInput(match.kickoffUtc))
  const [roundInfo, setRoundInfo] = useState(match.roundInfo)
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '')
  const [regularHomeScore, setRegularHomeScore] = useState(match.regularTimeHomeScore?.toString() ?? '')
  const [regularAwayScore, setRegularAwayScore] = useState(match.regularTimeAwayScore?.toString() ?? '')
  const [extraHomeScore, setExtraHomeScore] = useState(match.afterExtraTimeHomeScore?.toString() ?? '')
  const [extraAwayScore, setExtraAwayScore] = useState(match.afterExtraTimeAwayScore?.toString() ?? '')
  const [penaltyHomeScore, setPenaltyHomeScore] = useState(match.penaltyHomeScore?.toString() ?? '')
  const [penaltyAwayScore, setPenaltyAwayScore] = useState(match.penaltyAwayScore?.toString() ?? '')
  const [status, setStatus] = useState(enumValue(match.status, 0, statusLabels).toString())
  const [rawStatus, setRawStatus] = useState(match.rawStatus)
  const [syncState, setSyncState] = useState(enumValue(match.syncState, 0, syncStateLabels).toString())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const saveMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const result = await authorizedRequest<MatchSummary>(user.token, `/api/tournaments/${tournament.id}/matches/${match.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          stageId: stageId ? Number(stageId) : null,
          kickoffUtc: kickoffUtc ? new Date(kickoffUtc).toISOString() : null,
          homeScore: nullableNumber(homeScore),
          awayScore: nullableNumber(awayScore),
          regularTimeHomeScore: nullableNumber(regularHomeScore),
          regularTimeAwayScore: nullableNumber(regularAwayScore),
          afterExtraTimeHomeScore: nullableNumber(extraHomeScore),
          afterExtraTimeAwayScore: nullableNumber(extraAwayScore),
          penaltyHomeScore: nullableNumber(penaltyHomeScore),
          penaltyAwayScore: nullableNumber(penaltyAwayScore),
          status: Number(status),
          rawStatus,
          syncState: Number(syncState),
          roundInfo,
        }),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onSaved(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-match-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-match-title"
        noValidate
        onSubmit={saveMatch}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="matches" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.edit}</p>
          <h2 id="edit-match-title">{t.editMatchTitle}</h2>
          <p>{t.editMatchCopy}</p>
          <div className="delete-modal-target">
            <strong>{match.homeTeam?.name || match.homeTeamNameSnapshot} vs {match.awayTeam?.name || match.awayTeamNameSnapshot}</strong>
            <span>{formatDate(match.kickoffUtc, '-')}</span>
          </div>
        </div>

        <div className="edit-match-grid">
          <label className="form-field">
            <span><span>{t.stage}</span></span>
            <select value={stageId} onChange={(event) => setStageId(event.target.value)}>
              <option value="">{t.noStage}</option>
              {tournament.stages.map((stage) => (
                <option value={stage.id} key={stage.id}>{stage.name}</option>
              ))}
            </select>
          </label>
          <FormField label={t.round} type="text" value={roundInfo} onChange={setRoundInfo} />
          <FormField label={t.kickoff} type="datetime-local" value={kickoffUtc} onChange={setKickoffUtc} />
          <label className="form-field">
            <span><span>{t.status}</span></span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {Object.entries(statusLabels).map(([label, value]) => (
                <option value={value} key={label}>{label}</option>
              ))}
            </select>
          </label>
          <FormField label={t.rawStatus} type="text" value={rawStatus} onChange={setRawStatus} />
          <label className="form-field">
            <span><span>{t.syncState}</span></span>
            <select value={syncState} onChange={(event) => setSyncState(event.target.value)}>
              {Object.entries(syncStateLabels).map(([label, value]) => (
                <option value={value} key={label}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="score-edit-grid">
          <FormField label={`${t.finalScore} - ${t.homeTeam}`} type="number" value={homeScore} onChange={setHomeScore} />
          <FormField label={`${t.finalScore} - ${t.awayTeam}`} type="number" value={awayScore} onChange={setAwayScore} />
          <FormField label={`${t.regularTimeScore} - ${t.homeTeam}`} type="number" value={regularHomeScore} onChange={setRegularHomeScore} />
          <FormField label={`${t.regularTimeScore} - ${t.awayTeam}`} type="number" value={regularAwayScore} onChange={setRegularAwayScore} />
          <FormField label={`${t.afterExtraTimeScore} - ${t.homeTeam}`} type="number" value={extraHomeScore} onChange={setExtraHomeScore} />
          <FormField label={`${t.afterExtraTimeScore} - ${t.awayTeam}`} type="number" value={extraAwayScore} onChange={setExtraAwayScore} />
          <FormField label={`${t.penaltiesScore} - ${t.homeTeam}`} type="number" value={penaltyHomeScore} onChange={setPenaltyHomeScore} />
          <FormField label={`${t.penaltiesScore} - ${t.awayTeam}`} type="number" value={penaltyAwayScore} onChange={setPenaltyAwayScore} />
        </div>

        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? '...' : t.saveMatch}
          </button>
        </div>
      </form>
    </div>
  )
}

function SignedInPreview({
  t,
  language,
  user,
  onSessionExpired,
  onToast,
}: {
  t: (typeof translations)[Language]
  language: Language
  user: AuthUser
  onSessionExpired: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [newEmail, setNewEmail] = useState(user.email)
  const [emailPassword, setEmailPassword] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    authorizedRequest<UserProfile>(user.token, '/api/users/me')
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (result.status === 401) {
          onToast(t.sessionExpired, 'error')
          onSessionExpired()
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.profileLoadFailed, 'error')
          return
        }

        setProfile(result.data)
        setDisplayName(result.data.displayName ?? '')
        setNewEmail(result.data.email)
      })
      .catch(() => {
        if (isMounted) {
          onToast(t.profileLoadFailed, 'error')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [onSessionExpired, onToast, t, user.token])

  const handleUnauthorized = (status: number) => {
    if (status === 401) {
      onToast(t.sessionExpired, 'error')
      onSessionExpired()
      return true
    }

    return false
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting('profile')
    try {
      const result = await authorizedRequest<AuthActionResponse>(user.token, '/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ displayName: displayName.trim() || null, language }),
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setProfile((current) => current ? { ...current, displayName: displayName.trim() || null } : current)
      onToast(result.data?.message || t.profileSaved, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {
      password: validatePassword(newPassword, t),
    }

    if (!currentPassword) {
      nextErrors.currentPassword = t.required
    } else if (!confirmNewPassword) {
      nextErrors.confirmPassword = t.required
    } else if (newPassword !== confirmNewPassword) {
      nextErrors.confirmPassword = t.passwordMismatch
    }

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as keyof FieldErrors]) {
        delete nextErrors[key as keyof FieldErrors]
      }
    })

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting('password')
    try {
      const result = await authorizedRequest<AuthActionResponse>(user.token, '/api/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, language }),
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setErrors({})
      onToast(result.data?.message || t.passwordChanged, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const emailError = validateEmail(newEmail, t)
    if (emailError || !emailPassword) {
      setErrors({ email: emailError, password: emailPassword ? undefined : t.required })
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting('email')
    try {
      const result = await authorizedRequest<AuthActionResponse>(user.token, '/api/users/me/change-email', {
        method: 'POST',
        body: JSON.stringify({ newEmail, password: emailPassword, language }),
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setProfile((current) => current ? { ...current, email: newEmail } : current)
      setEmailPassword('')
      setErrors({})
      onToast(result.data?.message || t.emailChanged, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  const rotateApiKey = async () => {
    setIsSubmitting('apiKey')
    try {
      const params = new URLSearchParams({ language })
      const result = await authorizedRequest<RotateApiKeyResponse>(user.token, `/api/users/me/rotate-api-key?${params}`, {
        method: 'POST',
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setNewApiKey(result.data.apiKey)
      onToast(result.data.message || t.apiKeyRotated, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <section className="dashboard-section">
      <div className="dashboard-panel">
        <p className="eyebrow">{t.profileEyebrow}</p>
        <h1>{t.profileTitle}</h1>
        <p>{t.profileCopy}</p>
        <div className="profile-summary">
          <span>{profile?.email ?? user.email}</span>
          <small>{isLoading ? '...' : `${t.memberSince}: ${profile ? new Date(profile.memberSinceUtc).toLocaleDateString() : '-'}`}</small>
        </div>
        <form className="auth-form account-form" noValidate onSubmit={saveProfile}>
          <FormField
            label={t.displayName ?? 'Display name'}
            type="text"
            value={displayName}
            onChange={setDisplayName}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting === 'profile'}>
            {isSubmitting === 'profile' ? '...' : t.saveProfile}
          </button>
        </form>
        <form className="auth-form account-form" noValidate onSubmit={changePassword}>
          <h2>{t.changePasswordTitle}</h2>
          <FormField
            error={errors.currentPassword}
            label={t.currentPassword}
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <FormField
            error={errors.password}
            label={t.newPassword}
            type="password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <FormField
            error={errors.confirmPassword}
            label={t.confirmNewPassword}
            type="password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting === 'password'}>
            {isSubmitting === 'password' ? '...' : t.changePassword}
          </button>
        </form>
        <form className="auth-form account-form" noValidate onSubmit={changeEmail}>
          <h2>{t.changeEmailTitle}</h2>
          <FormField
            error={errors.email}
            label={t.newEmail}
            type="email"
            value={newEmail}
            onChange={setNewEmail}
          />
          <FormField
            error={errors.password}
            label={t.password}
            type="password"
            value={emailPassword}
            onChange={setEmailPassword}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting === 'email'}>
            {isSubmitting === 'email' ? '...' : t.changeEmail}
          </button>
        </form>
        <div className="account-form api-key-panel">
          <h2>{t.rotateApiKeyTitle}</h2>
          <button className="form-submit" type="button" disabled={isSubmitting === 'apiKey'} onClick={rotateApiKey}>
            {isSubmitting === 'apiKey' ? '...' : t.rotateApiKey}
          </button>
          {newApiKey && (
            <div className="auth-token-note">
              <span>{t.newApiKey}</span>
              <code>{newApiKey}</code>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TermsPage({ t }: { t: (typeof translations)[Language] }) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-panel">
        <p className="eyebrow">{t.termsAndConditions}</p>
        <h1>{t.termsTitle}</h1>
        <p>{t.termsCopy}</p>
      </div>
    </section>
  )
}

function SiteFooter({ t }: { t: (typeof translations)[Language] }) {
  return (
    <footer className="site-footer">
      <div>
        <div className="footer-brand">
          <FootballIcon />
          <strong>{t.brand}</strong>
        </div>
        <p>{t.footerCopy}</p>
      </div>
      <div className="footer-controls">
        <small>{t.legal}</small>
      </div>
    </footer>
  )
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast ${toast.tone}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="loading-spinner" aria-label="Loading" role="status">
      <span />
    </div>
  )
}

export default App




