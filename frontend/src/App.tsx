import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { routes, getViewFromPath } from './app/routes'
import { AUTH_STORAGE_KEY } from './shared/api/apiConfig'
import {
  AdminDashboard,
  AdminTeamsPanel,
  DataQualityPanel,
  RatingTournamentDetailsPanel,
  RatingsPanel,
  SquadDetailsPanel,
  SquadsPanel,
  SystemJobsPanel,
  TournamentDetailsPage,
  TournamentFormPage,
  TournamentsPanel,
  UsersAccessPanel,
} from './features/admin/pages/AdminPages'
import { ApiPage } from './features/api/pages/ApiPage'
import { AuthPage, ConfirmEmailPage, EmailActionPage, ResetPasswordPage } from './features/auth/pages/AuthPages'
import { BettingPanel } from './features/betting/pages/BettingPanel'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { HomePage } from './features/home/pages/HomePage'
import { UserMatchDetailsPanel, UserMatchesPanel } from './features/matches/pages/MatchesPages'
import { PredictionDetailsPanel, PredictionsPanel, TournamentPredictionsPanel } from './features/predictions/pages/PredictionsPages'
import { ProfilePage } from './features/profile/pages/ProfilePage'
import { UserRatingDetailsPanel, UserRatingsPanel } from './features/ratings/pages/RatingsPages'
import { UserTeamDetailsPanel, UserTeamsPanel } from './features/teams/pages/TeamsPages'
import { HeroField } from './shared/components/HeroField/HeroField'
import { FootballIcon, MenuIcon } from './shared/components/Icons'
import { ToastStack } from './shared/components/Toast'
import { getLists, getModules, translations } from './i18n'
import type {
  AuthUser,
  Language,
  Toast,
  ToastTone,
  View
} from './shared/types'

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
    if ((view === 'home' || view === 'dashboard' || view === 'ratings' || view === 'rating-details' || view === 'teams' || view === 'team-details' || view === 'matches' || view === 'matches-details' || view === 'predictions' || view === 'predictions-tournament' || view === 'prediction-details' || view === 'betting' || view === 'betting-create' || view === 'api' || view === 'admin' || view === 'admin-teams' || view === 'admin-ratings' || view === 'admin-rating-details' || view === 'admin-squads' || view === 'admin-squad-details' || view === 'admin-users' || view === 'admin-system-jobs' || view === 'admin-data-quality' || view === 'admin-tournaments' || view === 'admin-tournament-form' || view === 'admin-tournament-details' || view === 'profile') && !user) {
      navigateTo(routes.login, { replace: true })
    }
  }, [navigateTo, user, view])

  const navigate = (nextView: View) => {
    setIsAppMenuOpen(false)
    navigateTo(routes[nextView])
  }

  const showToast = useCallback((message: string, tone: ToastTone) => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }, [])

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
        <HomePage
          language={language}
          t={t}
          user={user}
          onNavigate={navigate}
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
        <HomePage
          language={language}
          t={t}
          user={user}
          onNavigate={navigate}
        />
      )}

      {view === 'dashboard' && user && (
        <DashboardPage
          language={language}
          t={t}
          user={user}
          onToast={showToast}
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

      {view === 'teams' && user && (
        <UserTeamsPanel
          t={t}
          user={user}
          onToast={showToast}
          onOpen={(id) => navigateTo(`/teams/${id}`)}
        />
      )}

      {view === 'team-details' && user && (
        <UserTeamDetailsPanel
          t={t}
          user={user}
          teamId={Number(location.pathname.match(/^\/teams\/(\d+)$/)?.[1] ?? 0)}
          onToast={showToast}
          onBack={() => navigateTo('/teams')}
          onOpenRatings={(tournamentId) => navigateTo(`/ratings/${tournamentId}`)}
        />
      )}

      {view === 'matches' && user && (
        <UserMatchesPanel
          t={t}
          user={user}
          onToast={showToast}
          onOpen={(id) => navigateTo(`/matches/${id}`)}
        />
      )}

      {view === 'matches-details' && user && (
        <UserMatchDetailsPanel
          t={t}
          user={user}
          tournamentId={Number(location.pathname.match(/^\/matches\/(\d+)$/)?.[1] ?? 0)}
          onToast={showToast}
          onBack={() => navigateTo('/matches')}
        />
      )}

      {view === 'predictions' && user && (
        <PredictionsPanel
          t={t}
          user={user}
          onToast={showToast}
          onOpen={(id) => navigateTo(`/predictions/${id}`)}
        />
      )}

      {view === 'predictions-tournament' && user && (
        <TournamentPredictionsPanel
          t={t}
          user={user}
          tournamentId={Number(location.pathname.match(/^\/predictions\/(\d+)$/)?.[1] ?? 0)}
          onToast={showToast}
          onBack={() => navigateTo('/predictions')}
          onOpenMatch={(matchId) => navigateTo(`/predictions/${Number(location.pathname.match(/^\/predictions\/(\d+)$/)?.[1] ?? 0)}/matches/${matchId}`)}
        />
      )}

      {view === 'prediction-details' && user && (
        <PredictionDetailsPanel
          t={t}
          user={user}
          tournamentId={Number(location.pathname.match(/^\/predictions\/(\d+)\/matches\/(\d+)$/)?.[1] ?? 0)}
          matchId={Number(location.pathname.match(/^\/predictions\/(\d+)\/matches\/(\d+)$/)?.[2] ?? 0)}
          onToast={showToast}
          onBack={(tournamentId) => navigateTo(`/predictions/${tournamentId}`)}
        />
      )}

      {(view === 'betting' || view === 'betting-create') && user && (
        <BettingPanel
          t={t}
          user={user}
          onToast={showToast}
          isCreating={view === 'betting-create'}
          onCreate={() => navigateTo(routes['betting-create'])}
          onBack={() => navigateTo(routes.betting)}
        />
      )}

      {view === 'api' && user && (
        <ApiPage
          t={t}
          user={user}
          language={language}
          onToast={showToast}
        />
      )}

      {view === 'admin' && user && (
        <AdminDashboard
          t={t}
          onNavigate={navigate}
        />
      )}

      {view === 'admin-teams' && user && (
        <AdminTeamsPanel
          t={t}
          user={user}
          onToast={showToast}
          onBack={() => navigate('admin')}
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
        <ProfilePage
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
          <button type="button" onClick={() => onNavigate('dashboard')}>
            <span className="menu-label">
              <MenuIcon name="dashboard" />
              <span>Analytics Board</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('ratings')}>
            <span className="menu-label">
              <MenuIcon name="ratings" />
              <span>{t.menuRatings}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('teams')}>
            <span className="menu-label">
              <MenuIcon name="teams" />
              <span>{t.menuTeams}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('matches')}>
            <span className="menu-label">
              <MenuIcon name="matches" />
              <span>{t.menuMatches}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('predictions')}>
            <span className="menu-label">
              <MenuIcon name="predictions" />
              <span>{t.menuPredictions}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate('betting')}>
            <span className="menu-label">
              <MenuIcon name="betting" />
              <span>{t.menuBetting}</span>
            </span>
          </button>
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

export default App






