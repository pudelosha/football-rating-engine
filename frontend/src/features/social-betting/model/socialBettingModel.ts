import type {
  BettingTournamentParticipant,
  BettingMatchInsight,
  BettingMatchPick,
  BettingPointsGrowthSeries,
  BettingStandingRow,
  BettingTournamentOption,
} from '../types'

export const bettingTournamentOptions: BettingTournamentOption[] = [
  {
    id: 1,
    linkedTournament: 'Premier League 2026/2027',
    name: 'Office Premier League Pool',
    role: 'Admin',
    participants: 14,
  },
  {
    id: 2,
    linkedTournament: 'Ekstraklasa 2026/2027',
    name: 'Weekend Ekstraklasa Picks',
    role: 'Player',
    participants: 8,
  },
]

export const bettingTournamentParticipants: BettingTournamentParticipant[] = [
  { id: 1, name: 'pudel1985', email: 'pudel1985@gmail.com', status: 'Accepted' },
  { id: 2, name: 'Marta', email: 'marta@example.com', status: 'Accepted' },
  { id: 3, name: 'Kamil', email: 'kamil@example.com', status: 'Pending' },
  { id: 4, name: 'Anna', email: 'anna@example.com', status: 'Accepted' },
  { id: 5, name: 'Pawel', email: 'pawel@example.com', status: 'Pending' },
]

export const bettingStandings: BettingStandingRow[] = [
  { position: 1, userName: 'pudel1985', accuracy: 61, successfulBets: 11, result: 42, direction: 'stable', pointsSplit: { win: 54, draw: 18, failed: 28 } },
  { position: 2, userName: 'Marta', accuracy: 56, successfulBets: 10, result: 38, direction: 'up', pointsSplit: { win: 48, draw: 22, failed: 30 } },
  { position: 3, userName: 'Kamil', accuracy: 47, successfulBets: 8, result: 33, direction: 'down', pointsSplit: { win: 39, draw: 21, failed: 40 } },
  { position: 4, userName: 'Anna', accuracy: 53, successfulBets: 9, result: 29, direction: 'stable', pointsSplit: { win: 44, draw: 19, failed: 37 } },
  { position: 5, userName: 'Pawel', accuracy: 41, successfulBets: 7, result: 26, direction: 'up', pointsSplit: { win: 31, draw: 18, failed: 51 } },
  { position: 6, userName: 'Ola', accuracy: 38, successfulBets: 6, result: 21, direction: 'down', pointsSplit: { win: 28, draw: 17, failed: 55 } },
]

export const outstandingBets: BettingMatchPick[] = [
  { id: 1, kickoff: '07.08.2026, 20:30', linkedTournament: 'Premier League', homeTeam: 'Liverpool', awayTeam: 'Chelsea', odds: '2.12' },
  { id: 2, kickoff: '08.08.2026, 16:00', linkedTournament: 'Premier League', homeTeam: 'Arsenal', awayTeam: 'Leeds United', odds: '1.34' },
  { id: 3, kickoff: '09.08.2026, 17:30', linkedTournament: 'Premier League', homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', odds: '1.88' },
]

export const myUpcomingBets: BettingMatchPick[] = [
  { id: 4, kickoff: '07.08.2026, 20:30', linkedTournament: 'Premier League', homeTeam: 'Liverpool', awayTeam: 'Chelsea', prediction: '2:1' },
  { id: 5, kickoff: '08.08.2026, 16:00', linkedTournament: 'Premier League', homeTeam: 'Arsenal', awayTeam: 'Leeds United', prediction: '3:0' },
  { id: 6, kickoff: '09.08.2026, 17:30', linkedTournament: 'Premier League', homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', prediction: '2:2' },
]

export const myLatestResults: BettingMatchPick[] = [
  { id: 7, kickoff: '02.08.2026, 18:00', linkedTournament: 'Premier League', homeTeam: 'Aston Villa', awayTeam: 'Everton', prediction: '1:0', score: '1:0', result: 'won', points: 5 },
  { id: 8, kickoff: '01.08.2026, 15:00', linkedTournament: 'Premier League', homeTeam: 'Brighton', awayTeam: 'Fulham', prediction: '2:1', score: '1:1', result: 'lost', points: 0 },
  { id: 9, kickoff: '31.07.2026, 21:00', linkedTournament: 'Premier League', homeTeam: 'Newcastle United', awayTeam: 'West Ham United', prediction: '2:0', score: '3:1', result: 'won', points: 2 },
]

export const myOutstandingStageBets: BettingMatchPick[] = [
  { id: 301, stage: 'Round 1', kickoff: '10.08.2026, 15:00', linkedTournament: 'Premier League', homeTeam: 'Crystal Palace', awayTeam: 'Brentford' },
  { id: 302, stage: 'Round 1', kickoff: '10.08.2026, 17:30', linkedTournament: 'Premier League', homeTeam: 'Nottingham Forest', awayTeam: 'Sunderland' },
  { id: 303, stage: 'Round 1', kickoff: '11.08.2026, 21:00', linkedTournament: 'Premier League', homeTeam: 'Manchester United', awayTeam: 'AFC Bournemouth' },
  { id: 304, stage: 'Round 2', kickoff: '14.08.2026, 20:30', linkedTournament: 'Premier League', homeTeam: 'Chelsea', awayTeam: 'Everton' },
]

export const myPlacedStageBets: BettingMatchPick[] = [
  { id: 305, stage: 'Round 1', kickoff: '07.08.2026, 20:30', linkedTournament: 'Premier League', homeTeam: 'Liverpool', awayTeam: 'Chelsea', prediction: '2:0' },
  { id: 306, stage: 'Round 1', kickoff: '08.08.2026, 16:00', linkedTournament: 'Premier League', homeTeam: 'Arsenal', awayTeam: 'Leeds United', prediction: '3:0' },
  { id: 307, stage: 'Round 2', kickoff: '14.08.2026, 21:00', linkedTournament: 'Premier League', homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', prediction: '2:2' },
]

export const myFinishedStageBets: BettingMatchPick[] = [
  { id: 308, stage: 'Round 1', kickoff: '07.08.2026, 20:30', linkedTournament: 'Premier League', homeTeam: 'Liverpool', awayTeam: 'Chelsea', prediction: '2:0', score: '2:0', result: 'won', points: 6.71 },
  { id: 309, stage: 'Round 1', kickoff: '08.08.2026, 18:30', linkedTournament: 'Premier League', homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', prediction: '2:1', score: '1:1', result: 'lost', points: 0 },
  { id: 310, stage: 'Round 1', kickoff: '09.08.2026, 14:00', linkedTournament: 'Premier League', homeTeam: 'Aston Villa', awayTeam: 'Everton', score: '0:1', result: 'lost', points: 0 },
  { id: 311, stage: 'Round 2', kickoff: '15.08.2026, 15:00', linkedTournament: 'Premier League', homeTeam: 'Fulham', awayTeam: 'Brighton', prediction: '1:1', score: '2:0', result: 'lost', points: 0 },
]

export const matchInsights: BettingMatchInsight[] = [
  {
    id: 101,
    stage: 'Round 1',
    kickoff: '07.08.2026, 20:30',
    homeTeam: 'Liverpool',
    awayTeam: 'Chelsea',
    score: '2:0',
    status: 'Completed',
    summary: 'Liverpool won in regular time',
    bets: [
      { playerName: 'pudel1985', prediction: '2:0', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 6.71 },
      { playerName: 'Marta', prediction: '2:1', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 1.71 },
      { playerName: 'Kamil', prediction: '0:2', homeWin: false, draw: false, awayWin: true, outcomeMatched: false, points: 0 },
      { playerName: 'Anna', prediction: '1:1', homeWin: false, draw: true, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 102,
    stage: 'Round 1',
    kickoff: '08.08.2026, 16:00',
    homeTeam: 'Arsenal',
    awayTeam: 'Leeds United',
    score: '3:1',
    status: 'Completed',
    summary: 'Arsenal won in regular time',
    bets: [
      { playerName: 'pudel1985', prediction: '3:0', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 1.86 },
      { playerName: 'Marta', prediction: '2:0', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 1.86 },
      { playerName: 'Kamil', prediction: '1:1', homeWin: false, draw: true, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Ola', prediction: '2:1', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 1.86 },
    ],
  },
  {
    id: 103,
    stage: 'Round 1',
    kickoff: '08.08.2026, 18:30',
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham Hotspur',
    score: '1:1',
    status: 'Completed',
    summary: 'Match finished as a draw',
    bets: [
      { playerName: 'pudel1985', prediction: '2:2', homeWin: false, draw: true, awayWin: false, outcomeMatched: true, points: 3.28 },
      { playerName: 'Marta', prediction: '2:1', homeWin: true, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Kamil', prediction: '1:1', homeWin: false, draw: true, awayWin: false, outcomeMatched: true, points: 5.28 },
      { playerName: 'Anna', prediction: '1:2', homeWin: false, draw: false, awayWin: true, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 104,
    stage: 'Round 1',
    kickoff: '09.08.2026, 14:00',
    homeTeam: 'Aston Villa',
    awayTeam: 'Everton',
    score: '0:1',
    status: 'Completed',
    summary: 'Everton won away from home',
    bets: [
      { playerName: 'pudel1985', prediction: '1:0', homeWin: true, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Marta', prediction: '0:1', homeWin: false, draw: false, awayWin: true, outcomeMatched: true, points: 6.4 },
      { playerName: 'Pawel', prediction: '1:1', homeWin: false, draw: true, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 105,
    stage: 'Round 1',
    kickoff: '09.08.2026, 16:00',
    homeTeam: 'Brighton',
    awayTeam: 'Fulham',
    score: '2:1',
    status: 'Completed',
    summary: 'Brighton won in regular time',
    bets: [
      { playerName: 'pudel1985', prediction: '2:1', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 5.71 },
      { playerName: 'Kamil', prediction: '1:0', homeWin: true, draw: false, awayWin: false, outcomeMatched: true, points: 1.71 },
      { playerName: 'Ola', prediction: '0:2', homeWin: false, draw: false, awayWin: true, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 106,
    stage: 'Round 1',
    kickoff: '09.08.2026, 18:30',
    homeTeam: 'Newcastle United',
    awayTeam: 'West Ham United',
    score: '2:2',
    status: 'In progress',
    summary: 'Live match, bets are locked',
    bets: [
      { playerName: 'pudel1985', prediction: '2:0', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Anna', prediction: '2:2', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Pawel', prediction: '1:2', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 107,
    stage: 'Round 1',
    kickoff: '10.08.2026, 15:00',
    homeTeam: 'Crystal Palace',
    awayTeam: 'Brentford',
    status: 'Pending',
    summary: 'Bets are open until kickoff',
    bets: [
      { playerName: 'pudel1985', prediction: '1:1', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Marta', prediction: '2:1', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 108,
    stage: 'Round 1',
    kickoff: '10.08.2026, 17:30',
    homeTeam: 'Nottingham Forest',
    awayTeam: 'Sunderland',
    status: 'Pending',
    summary: 'Bets are open until kickoff',
    bets: [
      { playerName: 'Kamil', prediction: '1:0', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Ola', prediction: '0:0', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 109,
    stage: 'Round 1',
    kickoff: '10.08.2026, 20:00',
    homeTeam: 'AFC Bournemouth',
    awayTeam: 'Wolves',
    status: 'Postponed',
    summary: 'Kickoff moved by tournament organizer',
    bets: [
      { playerName: 'pudel1985', prediction: '1:0', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Anna', prediction: '1:1', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 110,
    stage: 'Round 1',
    kickoff: '11.08.2026, 21:00',
    homeTeam: 'Manchester United',
    awayTeam: 'AFC Bournemouth',
    status: 'Pending',
    summary: 'Bets are open until kickoff',
    bets: [
      { playerName: 'Marta', prediction: '2:0', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Pawel', prediction: '1:0', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
  {
    id: 201,
    stage: 'Round 2',
    kickoff: '14.08.2026, 21:00',
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham Hotspur',
    status: 'In progress',
    summary: 'Live match, bets are locked',
    bets: [
      { playerName: 'pudel1985', prediction: '2:2', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
      { playerName: 'Ola', prediction: '1:2', homeWin: false, draw: false, awayWin: false, outcomeMatched: false, points: 0 },
    ],
  },
]

export const pointsGrowthSeries: BettingPointsGrowthSeries[] = [
  { playerName: 'pudel1985', points: [18, 20, 23, 29, 33, 35, 38, 40, 41, 42] },
  { playerName: 'Marta', points: [14, 18, 22, 26, 29, 31, 34, 36, 37, 38] },
  { playerName: 'Kamil', points: [16, 17, 19, 22, 27, 29, 30, 31, 32, 33] },
  { playerName: 'Anna', points: [12, 16, 18, 19, 24, 25, 27, 28, 29, 29] },
  { playerName: 'Pawel', points: [9, 11, 12, 14, 17, 20, 22, 24, 25, 26] },
  { playerName: 'Ola', points: [7, 8, 10, 11, 14, 16, 17, 18, 20, 21] },
]
