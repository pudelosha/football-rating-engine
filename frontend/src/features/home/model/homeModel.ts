import type {
  BettingCoupon,
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
        ['Nadchodzace mecze', 'Spotkania oczekujace na start w sledzonych turniejach.'],
        ['Sygnaly predykcji', 'Przyszle mecze z mierzalnym wskazaniem modelu.'],
        ['Swieze warstwy ratingu', 'Base Elo, forma, performance i kadra jako osobne warstwy.'],
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
        ['Zamkniete', 'Rozliczone kupony oznaczone jako trafione lub nietrafione.'],
        ['Przykladowy mnoznik', 'Pokazuje jak szybko rosnie ryzyko przy wielu meczach.'],
      ],
    }
  }

  return {
    copy: 'Start from ratings, predictions, match data, or the virtual betting lab. This dashboard gives you a fast read on what the model can do next.',
    ready: 'Workspace ready',
    readyCopy: 'Sample indicators below show the main product areas; live widgets can plug into this layout later.',
    actions: ['View ratings', 'Check predictions', 'Create coupon'],
    pulse: [
      ['Upcoming matches', 'Fixtures waiting for kickoff across tracked tournaments.'],
      ['Prediction signals', 'Future matches with a measurable model lean.'],
      ['Fresh rating layers', 'Base Elo, form, performance, and squad snapshots prepared separately.'],
      ['Virtual coupons', 'Pending simulated slips used to measure risk and model behavior.'],
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
    bettingCopy: 'Create virtual coupons to understand accumulator risk. The point is analysis and feedback, not promotion.',
    openBetting: 'Open betting lab',
    betting: [
      ['Pending', 'Coupons waiting for final results.'],
      ['Closed', 'Finished coupons marked as won or lost.'],
      ['Sample multiplier', 'Shows how quickly multi-match risk compounds.'],
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

function getCouponStatus(coupon: BettingCoupon) {
  const value = String(coupon.status).toLowerCase()
  if (value === '1' || value === 'won') {
    return 'won'
  }

  if (value === '2' || value === 'lost') {
    return 'lost'
  }

  return 'pending'
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

export function buildHomeDashboardData({
  copy,
  coupons,
  datasets,
  t,
}: {
  copy: HomeCopy
  coupons: BettingCoupon[]
  datasets: HomeTournamentDataset[]
  t: HomeTranslation
}): HomeDashboardData {
  const matches = datasets.flatMap((dataset) => dataset.matches.map((match) => ({ match, tournament: dataset.tournament, ratings: dataset.ratings })))
  const upcomingMatches = matches.filter(({ match }) => isUpcomingMatch(match))
  const liveMatches = matches.filter(({ match }) => isLiveMatch(match))
  const finishedMatches = matches.filter(({ match }) => isFinishedMatch(match))
  const pendingCoupons = coupons.filter((coupon) => getCouponStatus(coupon) === 'pending')
  const closedCoupons = coupons.filter((coupon) => getCouponStatus(coupon) !== 'pending')
  const predictionLabels = { home: t.homeWin, draw: t.draw, away: t.awayWin }
  const predictionRows = matches
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
    .slice(0, 4)
    .map(({ team, tournament }) => ({
      team: team.teamName,
      tournament: tournament.name,
      base: formatRating(getOutcomeChance(team, 'base')),
      form: formatAdjustment(getOutcomeChance(team, 'form')),
      squad: formatAdjustment(getOutcomeChance(team, 'squad')),
      final: formatRating(getOutcomeChance(team, 'final')),
    }))

  const topPendingCoupon = [...pendingCoupons].sort((left, right) => right.totalOdds - left.totalOdds)[0]
  const predictionOpportunityCount = predictionRows.length
  const ratedTournamentCount = datasets.filter((dataset) => dataset.ratings?.teams.length).length

  return {
    pulseCards: [
      { icon: 'matches', value: formatNumber(upcomingMatches.length), label: copy.pulse[0][0], detail: copy.pulse[0][1] },
      { icon: 'predictions', value: formatNumber(predictionOpportunityCount), label: copy.pulse[1][0], detail: copy.pulse[1][1] },
      { icon: 'ratings', value: formatNumber(ratedTournamentCount), label: copy.pulse[2][0], detail: copy.pulse[2][1] },
      { icon: 'betting', value: formatNumber(pendingCoupons.length), label: copy.pulse[3][0], detail: copy.pulse[3][1] },
    ],
    featuredPredictions: predictionRows.slice(0, 3).map(({ sortChance, sortKickoff, ...row }) => row),
    ratingsSnapshot,
    matchExplorerItems: [
      { label: copy.explorer[0][0], value: formatNumber(upcomingMatches.length), copy: copy.explorer[0][1] },
      { label: copy.explorer[1][0], value: formatNumber(finishedMatches.length), copy: copy.explorer[1][1] },
      { label: copy.explorer[2][0], value: formatNumber(liveMatches.length), copy: copy.explorer[2][1] },
    ],
    bettingItems: [
      { label: copy.betting[0][0], value: formatNumber(pendingCoupons.length), copy: copy.betting[0][1] },
      { label: copy.betting[1][0], value: formatNumber(closedCoupons.length), copy: copy.betting[1][1] },
      { label: copy.betting[2][0], value: topPendingCoupon ? `x${formatOdds(topPendingCoupon.totalOdds)}` : 'x0.00', copy: copy.betting[2][1] },
    ],
  }
}
