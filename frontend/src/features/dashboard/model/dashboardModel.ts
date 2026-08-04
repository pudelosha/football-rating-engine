import type { Language, MatchSummary } from '../../../shared/types'
import type { DashboardCopy, DashboardDataset, DashboardModel, LeagueTableRow, PositionTrendRow, TeamLastFiveRow } from '../types'

type DashboardRatingRow = DashboardDataset['ratings'][number]

export function getDashboardCopy(language: Language): DashboardCopy {
  if (language === 'pl') {
    return {
      eyebrow: 'Dashboard',
      title: 'Analytics Board',
      copy: 'Analiza realnych wynikow: tabela ligowa, gole, bilans dom/wyjazd/remis, forma rund i zmiany pozycji druzyn.',
      tournament: 'Turniej',
      round: 'Runda',
      allRounds: 'Wszystkie rundy',
      teamScope: 'Druzyny',
      allTeams: 'Wszystkie druzyny',
      refresh: 'Odswiez',
      loading: 'Budowanie Analytics Board.',
      kpis: [
        ['Rozegrane', 'Zakonczone mecze w aktualnym filtrze.', 'matches'],
        ['Srednia goli', 'Bramki na zakonczony mecz.', 'ratings'],
        ['Gole lacznie', 'Suma bramek w zakonczonych meczach.', 'home'],
        ['Najlepszy atak', 'Druzyna z najwyzsza srednia strzelonych goli.', 'predictions'],
      ],
      leagueTable: 'League table',
      resultSplit: 'Result split',
      roundGoals: 'Goals by round',
      positionTrend: 'Position changes',
      ratingDistribution: 'Rating context',
      noRows: 'Brak danych dla wybranego filtra.',
      points: 'Pkt',
      played: 'M',
      wins: 'W',
      draws: 'R',
      losses: 'P',
      goalsFor: 'GF',
      goalsAgainst: 'GA',
      goalDifference: 'GD',
      avgFor: 'Sr. strzelone',
      avgAgainst: 'Sr. stracone',
      finalRating: 'FTSR',
      positionNoChange: 'Bez zmiany pozycji w ostatnich 2 meczach',
      positionUp: 'Awans',
      positionDown: 'Spadek',
      positionPlace: 'miejsce',
      positionPlaces: 'miejsca',
      positionLastTwo: 'w ostatnich 2 meczach',
    }
  }

  return {
    eyebrow: 'Dashboard',
    title: 'Analytics Board',
    copy: 'Real match-result analysis: league table, goals, home/draw/away split, round trends, and team position movement.',
    tournament: 'Tournament',
    round: 'Round',
    allRounds: 'All rounds',
    teamScope: 'Teams',
    allTeams: 'All teams',
    refresh: 'Refresh',
    loading: 'Building Analytics Board.',
    kpis: [
      ['Played', 'Finished matches in the current filter.', 'matches'],
      ['Goal average', 'Goals per completed match.', 'ratings'],
      ['Total goals', 'Goals scored in completed matches.', 'home'],
      ['Best attack', 'Team with the highest average goals scored.', 'predictions'],
    ],
    leagueTable: 'League table',
    resultSplit: 'Result split',
    roundGoals: 'Goals by round',
    positionTrend: 'Position changes',
    ratingDistribution: 'Rating context',
    noRows: 'No data for the selected filter.',
    points: 'Pts',
    played: 'P',
    wins: 'W',
    draws: 'D',
    losses: 'L',
    goalsFor: 'GF',
    goalsAgainst: 'GA',
    goalDifference: 'GD',
    avgFor: 'Avg scored',
    avgAgainst: 'Avg conceded',
    finalRating: 'FTSR',
    positionNoChange: 'No position change over last 2 games',
    positionUp: 'Up',
    positionDown: 'Down',
    positionPlace: 'place',
    positionPlaces: 'places',
    positionLastTwo: 'over last 2 games',
  }
}

function isFinished(match: MatchSummary) {
  return String(match.status) === '3' || String(match.status) === 'Finished' || String(match.syncState) === 'Finalized'
}

function getRound(match: MatchSummary) {
  return match.roundInfo || '-'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatDecimal(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function formatCompactEuro(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-'
  }

  return new Intl.NumberFormat(undefined, {
    currency: 'EUR',
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(value)
}

function getTeamIds(match: MatchSummary) {
  return [match.homeTeam?.id, match.awayTeam?.id].filter((id): id is number => Boolean(id))
}

function getFilteredMatches(matches: MatchSummary[], round: string, teamIds: number[]) {
  return matches.filter((match) => {
    const roundMatches = round === 'all' || getRound(match) === round
    const teamMatches = teamIds.length === 0 || getTeamIds(match).some((teamId) => teamIds.includes(teamId))
    return roundMatches && teamMatches
  })
}

function getFinishedScore(match: MatchSummary) {
  if (match.homeScore === null || match.homeScore === undefined || match.awayScore === null || match.awayScore === undefined) {
    return null
  }

  return {
    home: match.homeScore,
    away: match.awayScore,
  }
}

function getRatingByTeamId(ratings: DashboardRatingRow[]) {
  return Object.fromEntries(ratings.map((team) => [team.teamId, team]))
}

function createEmptyRow(teamId: number, name: string, abbreviation: string): LeagueTableRow {
  return {
    teamId,
    teamName: name,
    abbreviation,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    averageGoalsFor: 0,
    averageGoalsAgainst: 0,
  }
}

function ensureTeamRow(rows: Record<number, LeagueTableRow>, team: { id: number; name: string; abbreviation: string }) {
  rows[team.id] ??= createEmptyRow(team.id, team.name, team.abbreviation)
  return rows[team.id]
}

function sortLeagueRows(rows: LeagueTableRow[]) {
  return rows.sort((left, right) =>
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    left.teamName.localeCompare(right.teamName),
  )
}

function buildLeagueRowsFromMatches(matches: MatchSummary[], ratings: DashboardRatingRow[]) {
  const rows: Record<number, LeagueTableRow> = {}
  const ratingsByTeamId = getRatingByTeamId(ratings)

  matches.filter(isFinished).forEach((match) => {
    const score = getFinishedScore(match)
    if (!score || !match.homeTeam || !match.awayTeam) {
      return
    }

    const home = ensureTeamRow(rows, match.homeTeam)
    const away = ensureTeamRow(rows, match.awayTeam)
    home.played += 1
    away.played += 1
    home.goalsFor += score.home
    home.goalsAgainst += score.away
    away.goalsFor += score.away
    away.goalsAgainst += score.home

    if (score.home > score.away) {
      home.wins += 1
      away.losses += 1
      home.points += 3
    } else if (score.home < score.away) {
      away.wins += 1
      home.losses += 1
      away.points += 3
    } else {
      home.draws += 1
      away.draws += 1
      home.points += 1
      away.points += 1
    }
  })

  return sortLeagueRows(Object.values(rows)
    .map((row) => ({
      ...row,
      finalRating: ratingsByTeamId[row.teamId]?.finalRating,
      goalDifference: row.goalsFor - row.goalsAgainst,
      averageGoalsFor: row.played > 0 ? row.goalsFor / row.played : 0,
      averageGoalsAgainst: row.played > 0 ? row.goalsAgainst / row.played : 0,
    })))
}

function getPreSeasonPositionByTeamId(ratings: DashboardRatingRow[]) {
  return Object.fromEntries(
    ratings
      .slice()
      .sort((left, right) => right.finalRating - left.finalRating || left.teamName.localeCompare(right.teamName))
      .map((team, index) => [team.teamId, index + 1]),
  )
}

function withPositionChanges(rows: LeagueTableRow[], matches: MatchSummary[], ratings: DashboardRatingRow[]) {
  const finishedMatches = matches
    .filter((match) => isFinished(match) && getFinishedScore(match))
    .slice()
  const preSeasonPositions = getPreSeasonPositionByTeamId(ratings)

  return rows.map((row, index) => {
    const teamMatches = finishedMatches
      .filter((match) => match.homeTeam?.id === row.teamId || match.awayTeam?.id === row.teamId)
      .sort((left, right) => new Date(right.kickoffUtc || 0).getTime() - new Date(left.kickoffUtc || 0).getTime())
    const lastTwoMatches = new Set(teamMatches.slice(0, 2))

    if (lastTwoMatches.size === 0) {
      return { ...row, positionChangeLastTwo: 0 }
    }

    const previousRows = buildLeagueRowsFromMatches(
      finishedMatches.filter((match) => !lastTwoMatches.has(match)),
      ratings,
    )
    const previousTablePosition = previousRows.findIndex((previousRow) => previousRow.teamId === row.teamId)
    const previousPosition = previousTablePosition >= 0
      ? previousTablePosition + 1
      : preSeasonPositions[row.teamId]
    const currentPosition = index + 1

    return {
      ...row,
      positionChangeLastTwo: previousPosition ? previousPosition - currentPosition : 0,
    }
  })
}

function buildLeagueTable(matches: MatchSummary[], ratings: DashboardRatingRow[], selectedTeamIds: number[]): LeagueTableRow[] {
  return withPositionChanges(buildLeagueRowsFromMatches(matches, ratings), matches, ratings)
    .filter((row) => selectedTeamIds.length === 0 || selectedTeamIds.includes(row.teamId))
}

function buildResultSplit(matches: MatchSummary[]) {
  const split = { home: 0, draw: 0, away: 0 }
  matches.filter(isFinished).forEach((match) => {
    const score = getFinishedScore(match)
    if (!score) {
      return
    }

    if (score.home > score.away) {
      split.home += 1
    } else if (score.home < score.away) {
      split.away += 1
    } else {
      split.draw += 1
    }
  })

  const total = split.home + split.draw + split.away
  return {
    ...split,
    total,
    homeShare: total > 0 ? split.home / total : 0,
    drawShare: total > 0 ? split.draw / total : 0,
    awayShare: total > 0 ? split.away / total : 0,
  }
}

function buildRoundGoalBars(matches: MatchSummary[]) {
  const groups = matches.filter(isFinished).reduce<Record<string, { goals: number; matches: number }>>((rounds, match) => {
    const score = getFinishedScore(match)
    if (!score) {
      return rounds
    }

    const key = getRound(match)
    const current = rounds[key] ?? { goals: 0, matches: 0 }
    rounds[key] = { goals: current.goals + score.home + score.away, matches: current.matches + 1 }
    return rounds
  }, {})

  return Object.entries(groups)
    .map(([label, item]) => ({
      label,
      value: item.matches > 0 ? item.goals / item.matches : 0,
      detail: `${item.goals} goals / ${item.matches} matches`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }))
    .slice(0, 12)
}

function getRoundOptions(matches: MatchSummary[]) {
  return Array.from(new Set(matches.map(getRound).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

function buildPositionTrend(matches: MatchSummary[], ratings: DashboardRatingRow[]): PositionTrendRow[] {
  const finishedByRound = matches
    .filter(isFinished)
    .slice()
    .sort((left, right) =>
      getRound(left).localeCompare(getRound(right), undefined, { numeric: true }) ||
      new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime(),
    )
  const rounds = getRoundOptions(finishedByRound)
  const finalRows = buildLeagueTable(finishedByRound, ratings, [])
  const teamsToTrack = finalRows.map((row) => row.teamId)

  return teamsToTrack.map((teamId) => {
    const rating = ratings.find((team) => team.teamId === teamId)
    const finalRow = finalRows.find((row) => row.teamId === teamId)
    const positions: Array<number | null> = []
    const points: Array<number | null> = []

    rounds.forEach((round) => {
      const rows = buildLeagueTable(
        finishedByRound.filter((match) => getRound(match).localeCompare(round, undefined, { numeric: true }) <= 0),
        ratings,
        [],
      )
      const position = rows.findIndex((row) => row.teamId === teamId)
      const row = rows.find((item) => item.teamId === teamId)
      positions.push(position >= 0 ? position + 1 : null)
      points.push(row?.points ?? null)
    })
    const pointChanges = points.map((value, index) => {
      if (value === null) {
        return null
      }

      const previous = index === 0 ? 0 : points[index - 1]
      return value - (previous ?? 0)
    })

    return {
      teamId,
      teamName: rating?.teamName ?? finalRow?.teamName ?? `Team ${teamId}`,
      rounds,
      positions,
      points,
      pointChanges,
    }
  }).filter((row) => row.positions.some((position) => position !== null))
}

function buildRatingBars(ratings: DashboardRatingRow[], teamIds: number[]) {
  return ratings
    .filter((team) => teamIds.length === 0 || teamIds.includes(team.teamId))
    .slice()
    .sort((left, right) => right.finalRating - left.finalRating)
    .slice(0, 10)
    .map((team) => ({
      label: team.teamName,
      value: team.finalRating,
      detail: `${formatDecimal(team.finalRating)} FTSR`,
    }))
}

function buildGoalsScoredBars(rows: LeagueTableRow[]) {
  return rows
    .slice()
    .sort((left, right) => right.goalsFor - left.goalsFor || left.teamName.localeCompare(right.teamName))
    .map((row) => ({
      label: (row.abbreviation || row.teamName).toUpperCase(),
      value: row.goalsFor,
      detail: `${row.goalsFor} goals`,
    }))
}

function buildTeamValueBars(dataset: DashboardDataset, leagueRows: LeagueTableRow[]) {
  const ratingsByTeamId = getRatingByTeamId(dataset.ratings)
  const tournamentTeamIds = new Set(dataset.ratings.map((team) => team.teamId))
  const matchTeamIds = new Set(dataset.matches.flatMap(getTeamIds))
  const eligibleTeamIds = matchTeamIds.size > 0 ? matchTeamIds : tournamentTeamIds
  const selectedTeamIds = dataset.teamIds.map(Number).filter(Number.isFinite)
  const order = Object.fromEntries(leagueRows.map((row, index) => [row.teamId, index]))
  return dataset.squadDetails
    .filter((detail) =>
      tournamentTeamIds.has(detail.teamId) &&
      eligibleTeamIds.has(detail.teamId) &&
      (selectedTeamIds.length === 0 || selectedTeamIds.includes(detail.teamId)) &&
      detail.totalMarketValueEur !== null &&
      detail.totalMarketValueEur !== undefined)
    .map((detail) => ({
      label: (ratingsByTeamId[detail.teamId]?.teamAbbreviation || ratingsByTeamId[detail.teamId]?.teamName || `Team ${detail.teamId}`).toUpperCase(),
      value: detail.totalMarketValueEur ?? 0,
      detail: ratingsByTeamId[detail.teamId]?.teamName || `Team ${detail.teamId}`,
      metrics: [
        { label: 'Player count', value: String(detail.playerCount ?? '-') },
        { label: 'Average player value', value: formatCompactEuro(detail.averageMarketValueEur ?? ((detail.totalMarketValueEur && detail.playerCount) ? detail.totalMarketValueEur / detail.playerCount : null)) },
        { label: 'Max player value', value: formatCompactEuro(detail.maxMarketValueEur) },
      ],
      sortOrder: order[detail.teamId] ?? 999,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || right.value - left.value)
}

function buildTeamAgeDots(dataset: DashboardDataset, leagueRows: LeagueTableRow[]) {
  const ratingsByTeamId = getRatingByTeamId(dataset.ratings)
  const tournamentTeamIds = new Set(dataset.ratings.map((team) => team.teamId))
  const matchTeamIds = new Set(dataset.matches.flatMap(getTeamIds))
  const eligibleTeamIds = matchTeamIds.size > 0 ? matchTeamIds : tournamentTeamIds
  const selectedTeamIds = dataset.teamIds.map(Number).filter(Number.isFinite)
  const order = Object.fromEntries(leagueRows.map((row, index) => [row.teamId, index]))
  return dataset.squadDetails
    .filter((detail) =>
      tournamentTeamIds.has(detail.teamId) &&
      eligibleTeamIds.has(detail.teamId) &&
      (selectedTeamIds.length === 0 || selectedTeamIds.includes(detail.teamId)) &&
      detail.averageAge !== null &&
      detail.averageAge !== undefined)
    .map((detail) => ({
      label: (ratingsByTeamId[detail.teamId]?.teamAbbreviation || ratingsByTeamId[detail.teamId]?.teamName || `Team ${detail.teamId}`).toUpperCase(),
      value: detail.averageAge ?? 0,
      detail: ratingsByTeamId[detail.teamId]?.teamName || `Team ${detail.teamId}`,
      metrics: [
        { label: 'Exact average age', value: detail.averageAge === null || detail.averageAge === undefined ? '-' : detail.averageAge.toFixed(2) },
        { label: 'Player count', value: String(detail.playerCount ?? '-') },
        { label: 'Youngest player', value: detail.youngestPlayerAge === null || detail.youngestPlayerAge === undefined ? '-' : String(detail.youngestPlayerAge) },
        { label: 'Oldest player', value: detail.oldestPlayerAge === null || detail.oldestPlayerAge === undefined ? '-' : String(detail.oldestPlayerAge) },
      ],
      sortOrder: order[detail.teamId] ?? 999,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.value - right.value)
}

function buildLastFiveRows(matches: MatchSummary[], leagueRows: LeagueTableRow[]): TeamLastFiveRow[] {
  return leagueRows.map((row) => {
    const results = matches
      .filter((match) => isFinished(match) && getTeamIds(match).includes(row.teamId))
      .sort((left, right) => new Date(right.kickoffUtc || 0).getTime() - new Date(left.kickoffUtc || 0).getTime())
      .slice(0, 5)
      .reverse()
      .map((match) => {
        const score = getFinishedScore(match)
        const isHome = match.homeTeam?.id === row.teamId
        const own = score ? (isHome ? score.home : score.away) : 0
        const opponent = score ? (isHome ? score.away : score.home) : 0
        return {
          result: own > opponent ? 'W' as const : own < opponent ? 'L' as const : 'D' as const,
          kickoffUtc: match.kickoffUtc,
          homeTeamName: match.homeTeam?.name || match.homeTeamNameSnapshot || '-',
          awayTeamName: match.awayTeam?.name || match.awayTeamNameSnapshot || '-',
          homeScore: score?.home ?? 0,
          awayScore: score?.away ?? 0,
        }
      })

    return {
      teamId: row.teamId,
      abbreviation: row.abbreviation || row.teamName,
      teamName: row.teamName,
      points: row.points,
      played: row.played,
      results,
    }
  })
}

export function buildDashboardModel(copy: DashboardCopy, dataset: DashboardDataset): DashboardModel {
  const selectedTeamIds = dataset.teamIds.map(Number).filter(Number.isFinite)
  const scopedMatches = getFilteredMatches(dataset.matches, dataset.round, selectedTeamIds)
  const finished = scopedMatches.filter(isFinished)
  const resultSplit = buildResultSplit(scopedMatches)
  const leagueRows = buildLeagueTable(scopedMatches, dataset.ratings, selectedTeamIds)
  const goals = finished.reduce((sum, match) => {
    const score = getFinishedScore(match)
    return score ? sum + score.home + score.away : sum
  }, 0)
  const goalsPerMatch = finished.length > 0 ? goals / finished.length : 0
  const bestAttack = leagueRows
    .filter((row) => row.played > 0)
    .slice()
    .sort((left, right) => right.averageGoalsFor - left.averageGoalsFor || right.goalsFor - left.goalsFor)[0]

  return {
    kpis: [
      { icon: copy.kpis[0][2], label: copy.kpis[0][0], value: formatNumber(finished.length), detail: copy.kpis[0][1] },
      { icon: copy.kpis[1][2], label: copy.kpis[1][0], value: formatDecimal(goalsPerMatch), detail: copy.kpis[1][1] },
      { icon: copy.kpis[2][2], label: copy.kpis[2][0], value: formatNumber(goals), detail: copy.kpis[2][1] },
      { icon: copy.kpis[3][2], label: copy.kpis[3][0], value: bestAttack ? formatDecimal(bestAttack.averageGoalsFor) : '0.00', detail: bestAttack?.teamName ?? copy.kpis[3][1] },
    ],
    resultSplit,
    roundGoalBars: buildRoundGoalBars(scopedMatches),
    ratingBars: buildRatingBars(dataset.ratings, selectedTeamIds),
    leagueRows,
    goalsScoredBars: buildGoalsScoredBars(leagueRows),
    scoredConcededRows: leagueRows,
    teamValueBars: buildTeamValueBars(dataset, leagueRows),
    teamAgeDots: buildTeamAgeDots(dataset, leagueRows),
    positionTrend: buildPositionTrend(dataset.matches, dataset.ratings),
    lastFiveRows: buildLastFiveRows(scopedMatches, leagueRows),
    roundOptions: getRoundOptions(dataset.matches),
    teamOptions: dataset.ratings
      .map((team) => ({ id: team.teamId, name: team.teamName }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}
