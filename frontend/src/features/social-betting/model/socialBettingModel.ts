import type { BettingMatchPick, BettingStandingRow, BettingTournamentOption } from '../types'

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

export const bettingStandings: BettingStandingRow[] = [
  { position: 1, userName: 'pudel1985', accuracy: 61, successfulBets: 11, result: 42, direction: 'stable' },
  { position: 2, userName: 'Marta', accuracy: 56, successfulBets: 10, result: 38, direction: 'up' },
  { position: 3, userName: 'Kamil', accuracy: 47, successfulBets: 8, result: 33, direction: 'down' },
  { position: 4, userName: 'Anna', accuracy: 53, successfulBets: 9, result: 29, direction: 'stable' },
  { position: 5, userName: 'Pawel', accuracy: 41, successfulBets: 7, result: 26, direction: 'up' },
  { position: 6, userName: 'Ola', accuracy: 38, successfulBets: 6, result: 21, direction: 'down' },
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
