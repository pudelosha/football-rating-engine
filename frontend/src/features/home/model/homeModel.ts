import type {
  BettingCouponSummary,
  CombinedRatingsResponse,
  CombinedTeamRating,
  Language,
  MatchSummary,
  TournamentSummary,
} from '../../../shared/types'
import { formatOdds, formatPercent, getFavoriteOutcomeKey, getTeamDisplayName, isPredictableMatch } from '../../../shared/utils'
import { calculateCalibratedPrediction, getPredictionShape } from '../../../shared/utils/predictionModel'
import type { FeaturedPredictionRow, HomeCopy, HomeDashboardData, HomeInsightItem, HomePulseCard, HomeTranslation, RatingsSnapshotRow } from '../types'

export function getHomeCopy(language: Language): HomeCopy {
  if (language === 'pl') {
    return {
      copy: 'Zacznij od ratingow, predykcji, danych meczowych albo wirtualnego kuponu. Ten dashboard szybko pokazuje, co model potrafi zaoferowac.',
      ready: 'Workspace gotowy',
      readyCopy: 'Przykladowe wskazniki ponizej pokazuja glowne obszary produktu; live widgety mozna pozniej podpiac w ten uklad.',
      actions: ['Zobacz ratingi', 'Sprawdz predykcje', 'Utworz kupon'],
      pulse: [
        ['Nadchodzace mecze', 'Spotkania oczekujace na start w najblizszych 48 godzinach.'],
        ['Sygnaly predykcji', 'Przyszle mecze z mierzalnym wskazaniem modelu w najblizszych 7 dniach.'],
        ['Swieze warstwy ratingu', 'Dostepne warstwy modelu: Base Elo, forma, performance i kadra.'],
        ['Wirtualne kupony', 'Oczekujace kupony symulacyjne do mierzenia ryzyka i zachowania modelu.'],
      ],
      featuredPredictions: 'Wyroznione predykcje',
      openPredictions: 'Otworz predykcje',
      ratingsSnapshot: 'Snapshot ratingow',
      openRatings: 'Otworz ratingi',
      matchExplorer: 'Eksplorator meczow',
      browseMatches: 'Przegladaj mecze',
      explorer: [
        ['Nadchodzace', 'Przegladaj terminarz wedlug turnieju i rundy.'],
        ['Wyniki', 'Sprawdzaj zakonczone mecze, wyniki i statusy.'],
        ['Live', 'Sledz mecze, gdy aktywny jest live sync.'],
      ],
      bettingLab: 'Betting lab',
      bettingCopy: 'Tworz wirtualne kupony, aby zrozumiec ryzyko akumulatorow. Chodzi o analize i feedback, nie promocje zakladow.',
      openBetting: 'Otworz betting lab',
      betting: [
        ['Oczekujace', 'Kupony czekajace na koncowe wyniki.'],
        ['Trafione', 'Kupony zakonczone pelnym sukcesem.'],
        ['Nietrafione', 'Kupony przegrane przez co najmniej jeden nietrafiony typ.'],
        ['Bilans', 'Wyplaty z trafionych kuponow minus stawki stracone na nietrafionych.'],
      ],
    }
  }

  return {
    copy: 'Start from ratings, predictions, match data, or the virtual betting lab. This dashboard gives you a fast read on what the model can do next.',
    ready: 'Workspace ready',
    readyCopy: 'Sample indicators below show the main product areas; live widgets can plug into this layout later.',
    actions: ['View ratings', 'Check predictions', 'Create slip'],
    pulse: [
      ['Upcoming matches', 'Fixtures waiting for kickoff in the next 48 hours.'],
      ['Prediction signals', 'Future matches with a measurable model lean in the next 7 days.'],
      ['Fresh rating layers', 'Available model layers: Base Elo, form, performance, and squad.'],
      ['Virtual slips', 'Pending simulated slips used to measure risk and model behavior.'],
    ],
    featuredPredictions: 'Featured predictions',
    openPredictions: 'Open predictions',
    ratingsSnapshot: 'Ratings snapshot',
    openRatings: 'Open ratings',
    matchExplorer: 'Match explorer',
    browseMatches: 'Browse matches',
    explorer: [
      ['Upcoming', 'Review fixtures by tournament and round.'],
      ['Results', 'Inspect completed matches, scores, and statuses.'],
      ['Live', 'Follow games when live sync is active.'],
    ],
    bettingLab: 'Betting lab',
    bettingCopy: 'Create virtual slips to understand accumulator risk. The point is analysis and feedback, not promotion.',
    openBetting: 'Open betting lab',
    betting: [
      ['Pending', 'Slips waiting for final results.'],
      ['Successful', 'Slips settled with every selected outcome matched.'],
      ['Unsuccessful', 'Slips lost because at least one selection missed.'],
      ['Net result', 'Winning payouts minus base stakes lost on unsuccessful slips.'],
    ],
  }
}

export function getPulseCards(copy: HomeCopy): HomePulseCard[] {
  return [
    { icon: 'matches', value: '18', label: copy.pulse[0][0], detail: copy.pulse[0][1] },
    { icon: 'predictions', value: '7', label: copy.pulse[1][0], detail: copy.pulse[1][1] },
    { icon: 'ratings', value: '2', label: copy.pulse[2][0], detail: copy.pulse[2][1] },
    { icon: 'betting', value: '4', label: copy.pulse[3][0], detail: copy.pulse[3][1] },
  ]
}

export function getMatchExplorerItems(copy: HomeCopy): HomeInsightItem[] {
  return [
    { label: copy.explorer[0][0], value: '306', copy: copy.explorer[0][1] },
    { label: copy.explorer[1][0], value: '89', copy: copy.explorer[1][1] },
    { label: copy.explorer[2][0], value: '1', copy: copy.explorer[2][1] },
  ]
}

export function getBettingItems(copy: HomeCopy): HomeInsightItem[] {
  return [
    { label: copy.betting[0][0], value: '3', copy: copy.betting[0][1] },
    { label: copy.betting[1][0], value: '12', copy: copy.betting[1][1] },
    { label: copy.betting[2][0], value: 'x7.48', copy: copy.betting[2][1] },
  ]
}

export type HomeTournamentDataset = {
  tournament: TournamentSummary
  matches: MatchSummary[]
  ratings?: CombinedRatingsResponse
}

function isLiveMatch(match: MatchSummary) {
  return String(match.status) === '2' || String(match.status) === 'Live' || String(match.syncState) === '2' || String(match.syncState) === 'Live'
}

function isFinishedMatch(match: MatchSummary) {
  return String(match.status) === '3' || String(match.status) === 'Finished' || String(match.syncState) === '3' || String(match.syncState) === 'Finalized'
}

function isUpcomingMatch(match: MatchSummary) {
  return String(match.status) === '1' || String(match.status) === 'Upcoming' || String(match.syncState) === '1' || String(match.syncState) === 'Scheduled'
}

function isWithinHours(match: MatchSummary, hours: number) {
  if (!match.kickoffUtc) {
    return false
  }

  const kickoffTime = new Date(match.kickoffUtc).getTime()
  const now = Date.now()
  return kickoffTime >= now && kickoffTime <= now + hours * 60 * 60 * 1000
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatRating(value: number) {
  return value.toFixed(2)
}

function formatAdjustment(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function getRatingByTeamId(ratings?: CombinedRatingsResponse) {
  return Object.fromEntries((ratings?.teams ?? []).map((team) => [team.teamId, team]))
}

function getOutcomeChance(team: CombinedTeamRating, key: 'base' | 'form' | 'squad' | 'final') {
  if (key === 'base') {
    return team.baseElo
  }

  if (key === 'form') {
    return team.formAdjustment
  }

  if (key === 'squad') {
    return team.squadQualityAdjustment
  }

  return team.finalRating
}

function countAvailableRatingLayers(datasets: HomeTournamentDataset[]) {
  const teams = datasets.flatMap((dataset) => dataset.ratings?.teams ?? [])

  if (teams.length === 0) {
    return 0
  }

  const layers = [
    teams.some((team) => Number.isFinite(team.baseElo)),
    teams.some((team) => team.hasFormRating),
    teams.some((team) => team.hasPerformanceRating),
    teams.some((team) => team.hasSquadQualityRating),
  ]

  return layers.filter(Boolean).length
}

export function buildHomeDashboardData({
  copy,
  bettingSummary,
  datasets,
  t,
}: {
  copy: HomeCopy
  bettingSummary?: BettingCouponSummary
  datasets: HomeTournamentDataset[]
  t: HomeTranslation
}): HomeDashboardData {
  const matches = datasets.flatMap((dataset) => dataset.matches.map((match) => ({ match, tournament: dataset.tournament, ratings: dataset.ratings })))
  const upcomingMatches = matches.filter(({ match }) => isUpcomingMatch(match))
  const upcomingMatchesIn48Hours = upcomingMatches.filter(({ match }) => isWithinHours(match, 48))
  const predictionWindowMatches = upcomingMatches.filter(({ match }) => isWithinHours(match, 24 * 7))
  const liveMatches = matches.filter(({ match }) => isLiveMatch(match))
  const finishedMatches = matches.filter(({ match }) => isFinishedMatch(match))
  const predictionLabels = { home: t.homeWin, draw: t.draw, away: t.awayWin }
  const predictionRows = predictionWindowMatches
    .filter(({ match }) => isPredictableMatch(match) && match.homeTeam && match.awayTeam)
    .map(({ match, tournament, ratings }) => {
      const ratingsByTeamId = getRatingByTeamId(ratings)
      const homeRating = match.homeTeam ? ratingsByTeamId[match.homeTeam.id] : undefined
      const awayRating = match.awayTeam ? ratingsByTeamId[match.awayTeam.id] : undefined

      if (!homeRating || !awayRating) {
        return null
      }

      const prediction = calculateCalibratedPrediction(homeRating, awayRating, tournament.applyHomeAdvantage, predictionLabels)
      const shape = getPredictionShape(prediction, t)
      const outcomeKey = getFavoriteOutcomeKey(prediction)
      const fairOdds = outcomeKey === 'home'
        ? prediction.homeFairOdds
        : outcomeKey === 'away'
          ? prediction.awayFairOdds
          : prediction.drawFairOdds

      return {
        time: match.kickoffUtc
          ? new Date(match.kickoffUtc).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '-',
        tournament: `${tournament.name}${tournament.season ? ` ${tournament.season}` : ''}`,
        home: getTeamDisplayName(match, 'home'),
        away: getTeamDisplayName(match, 'away'),
        outcome: prediction.favoriteLabel,
        chance: formatPercent(prediction.favoriteChance),
        drawRisk: `${shape.risk} (${formatOdds(fairOdds)})`,
        sortChance: prediction.favoriteChance,
        sortKickoff: new Date(match.kickoffUtc || 0).getTime(),
      }
    })
    .filter((row): row is FeaturedPredictionRow & { sortChance: number; sortKickoff: number } => Boolean(row))
    .sort((left, right) => right.sortChance - left.sortChance || left.sortKickoff - right.sortKickoff)

  const ratingsSnapshot: RatingsSnapshotRow[] = datasets
    .flatMap((dataset) => (dataset.ratings?.teams ?? []).map((team) => ({ team, tournament: dataset.tournament })))
    .sort((left, right) => right.team.finalRating - left.team.finalRating)
    .slice(0, 5)
    .map(({ team, tournament }) => ({
      team: team.teamName,
      tournament: tournament.name,
      base: formatRating(getOutcomeChance(team, 'base')),
      form: formatAdjustment(getOutcomeChance(team, 'form')),
      squad: formatAdjustment(getOutcomeChance(team, 'squad')),
      final: formatRating(getOutcomeChance(team, 'final')),
    }))

  const predictionOpportunityCount = predictionRows.length
  const availableRatingLayerCount = countAvailableRatingLayers(datasets)
  const pendingCouponCount = bettingSummary?.pendingCount ?? 0
  const successfulCouponCount = bettingSummary?.successfulCount ?? 0
  const unsuccessfulCouponCount = bettingSummary?.unsuccessfulCount ?? 0
  const netResult = bettingSummary?.netResult ?? 0

  return {
    pulseCards: [
      { icon: 'matches', value: formatNumber(upcomingMatchesIn48Hours.length), label: copy.pulse[0][0], detail: copy.pulse[0][1] },
      { icon: 'predictions', value: formatNumber(predictionOpportunityCount), label: copy.pulse[1][0], detail: copy.pulse[1][1] },
      { icon: 'ratings', value: formatNumber(availableRatingLayerCount), label: copy.pulse[2][0], detail: copy.pulse[2][1] },
      { icon: 'betting', value: formatNumber(pendingCouponCount), label: copy.pulse[3][0], detail: copy.pulse[3][1] },
    ],
    featuredPredictions: predictionRows.slice(0, 3).map(({ sortChance, sortKickoff, ...row }) => row),
    ratingsSnapshot,
    matchExplorerItems: [
      { label: copy.explorer[0][0], value: formatNumber(upcomingMatches.length), copy: copy.explorer[0][1] },
      { label: copy.explorer[1][0], value: formatNumber(finishedMatches.length), copy: copy.explorer[1][1] },
      { label: copy.explorer[2][0], value: formatNumber(liveMatches.length), copy: copy.explorer[2][1] },
    ],
    bettingItems: [
      { label: copy.betting[0][0], value: formatNumber(pendingCouponCount), copy: copy.betting[0][1] },
      { label: copy.betting[1][0], value: formatNumber(successfulCouponCount), copy: copy.betting[1][1] },
      { label: copy.betting[2][0], value: formatNumber(unsuccessfulCouponCount), copy: copy.betting[2][1] },
      { label: copy.betting[3][0], value: netResult.toFixed(2), copy: copy.betting[3][1] },
    ],
  }
}
