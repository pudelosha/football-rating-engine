import type { View } from '../shared/types'

export const routes: Record<View, string> = {
  landing: '/',
  login: '/login',
  register: '/register',
  'forgot-password': '/forgot-password',
  'resend-activation': '/resend-activation',
  'confirm-email': '/confirm-email',
  'reset-password': '/reset-password',
  'betting-invite': '/betting/invite',
  terms: '/terms',
  home: '/home',
  dashboard: '/dashboard',
  ratings: '/ratings',
  'rating-details': '/ratings/0',
  teams: '/teams',
  'team-details': '/teams/0',
  matches: '/matches',
  'matches-details': '/matches/0',
  predictions: '/predictions',
  'predictions-tournament': '/predictions/0',
  'prediction-details': '/predictions/0/matches/0',
  betting: '/betting',
  'betting-tournament-form': '/betting/new',
  slips: '/slips',
  'slips-create': '/slips/create',
  api: '/api',
  admin: '/admin',
  'admin-teams': '/admin/teams',
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

export function getViewFromPath(pathname: string): View {
  if (pathname === '/admin/tournaments/new' || /^\/admin\/tournaments\/\d+\/edit$/.test(pathname)) {
    return 'admin-tournament-form'
  }

  if (/^\/admin\/ratings\/\d+$/.test(pathname)) {
    return 'admin-rating-details'
  }

  if (/^\/ratings\/\d+$/.test(pathname)) {
    return 'rating-details'
  }

  if (/^\/teams\/\d+$/.test(pathname)) {
    return 'team-details'
  }

  if (/^\/matches\/\d+$/.test(pathname)) {
    return 'matches-details'
  }

  if (/^\/predictions\/\d+\/matches\/\d+$/.test(pathname)) {
    return 'prediction-details'
  }

  if (/^\/predictions\/\d+$/.test(pathname)) {
    return 'predictions-tournament'
  }

  if (pathname === routes['slips-create'] || pathname === '/betting/create') {
    return 'slips-create'
  }

  if (pathname === '/betting/new' || /^\/betting\/\d+\/edit$/.test(pathname)) {
    return 'betting-tournament-form'
  }

  if (pathname === routes['betting-invite']) {
    return 'betting-invite'
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
