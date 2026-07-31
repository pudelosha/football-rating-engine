import type { ApiEndpointExample, ApiTranslation, ApiUserSession } from '../types'

const sampleMatch = {
  id: 813,
  kickoffUtc: '2026-07-27T17:00:00Z',
  round: '2',
  status: 'Upcoming',
  homeTeam: 'Zaglebie Lubin',
  awayTeam: 'Piast Gliwice',
  score: { home: null, away: null },
}

const apiKeyHeader = { 'x-api-key': '<your-api-key>' }

export function createAuthTokenSample(user: ApiUserSession) {
  return {
    authorization: 'Bearer <auth-token>',
    user: {
      email: user.email,
      displayName: user.displayName ?? null,
    },
  }
}

export function createMatchEndpointExamples(t: ApiTranslation): ApiEndpointExample[] {
  return [
    {
      key: 'all',
      label: t.apiEndpointAll,
      endpoint: 'GET /api/tournaments/{tournamentId}/matches',
      request: {
        method: 'GET',
        url: '/api/tournaments/7/matches',
        headers: apiKeyHeader,
      },
      response: [sampleMatch],
    },
    {
      key: 'results',
      label: t.apiEndpointResults,
      endpoint: 'GET /api/tournaments/{tournamentId}/matches/results',
      request: {
        method: 'GET',
        url: '/api/tournaments/7/matches/results',
        headers: apiKeyHeader,
      },
      response: [{ ...sampleMatch, status: 'Finished', score: { home: 2, away: 1 } }],
    },
    {
      key: 'live',
      label: t.apiEndpointLive,
      endpoint: 'GET /api/tournaments/{tournamentId}/matches/live',
      request: {
        method: 'GET',
        url: '/api/tournaments/7/matches/live',
        headers: apiKeyHeader,
      },
      response: [{ ...sampleMatch, status: 'Live', minute: 64, score: { home: 1, away: 1 } }],
    },
    {
      key: 'upcoming',
      label: t.apiEndpointUpcoming,
      endpoint: 'GET /api/tournaments/{tournamentId}/matches/upcoming',
      request: {
        method: 'GET',
        url: '/api/tournaments/7/matches/upcoming',
        headers: apiKeyHeader,
      },
      response: [sampleMatch],
    },
    {
      key: 'single',
      label: t.apiEndpointSingle,
      endpoint: 'GET /api/tournaments/{tournamentId}/matches/{matchId}',
      request: {
        method: 'GET',
        url: '/api/tournaments/7/matches/813',
        headers: apiKeyHeader,
      },
      response: sampleMatch,
    },
  ]
}
