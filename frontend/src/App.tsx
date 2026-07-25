import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type Language = 'en' | 'pl'
type View =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'resend-activation'
  | 'confirm-email'
  | 'reset-password'
  | 'terms'
  | 'dashboard'
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

type FieldErrors = Partial<Record<'email' | 'password' | 'confirmPassword' | 'termsAccepted', string>>

type AuthResponse = {
  success: boolean
  message: string
  token?: string
  apiKey?: string
}

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
  dashboard: '/dashboard',
}

function getViewFromPath(pathname: string): View {
  const match = Object.entries(routes).find(([, route]) => route === pathname)
  return (match?.[0] as View | undefined) ?? 'landing'
}

const translations = {
  en: {
    brand: 'Football Rating Engine',
    loginRegister: 'Login / Register',
    logout: 'Logout',
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
    registerSuccess: 'Registration successful. You can log in now.',
    logoutSuccess: 'You have been logged out.',
    genericError: 'Something went wrong. Please try again.',
    dashboardTitle: 'You are signed in.',
    dashboardCopy:
      'This is the first logged-in state. Ratings dashboards, admin pages, and profile tools can now be added on top of the authenticated shell.',
    authHint: 'Auth token stored locally for API calls.',
  },
  pl: {
    brand: 'Football Rating Engine',
    loginRegister: 'Logowanie / Rejestracja',
    logout: 'Wyloguj',
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
    registerSuccess: 'Rejestracja zakończona. Możesz się zalogować.',
    logoutSuccess: 'Wylogowano.',
    genericError: 'Coś poszło nie tak. Spróbuj ponownie.',
    dashboardTitle: 'Jesteś zalogowany.',
    dashboardCopy:
      'To pierwszy stan po zalogowaniu. Dashboardy ratingowe, panel admina i profil użytkownika można teraz budować na gotowej autoryzowanej powłoce.',
    authHint: 'Token autoryzacji zapisany lokalnie dla zapytań API.',
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

async function confirmEmail(userId: string, token: string): Promise<AuthResponse> {
  const params = new URLSearchParams({ userId, token })
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

async function resetPassword(userId: string, token: string, newPassword: string): Promise<AuthResponse> {
  return postAuth('/api/auth/reset-password', {
    userId,
    token,
    newPassword,
  })
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

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (view === 'dashboard' && !user) {
      navigateTo(routes.login, { replace: true })
    }
  }, [navigateTo, user, view])

  const navigate = (nextView: View) => {
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
    navigate('landing')
    showToast(t.logoutSuccess, 'info')
  }

  const handleLoginSuccess = (nextUser: AuthUser) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    navigate('dashboard')
    showToast(t.loginSuccess, 'success')
  }

  return (
    <main className="app">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => navigate('landing')} aria-label={t.backHome}>
          <FootballIcon />
          <span>{t.brand}</span>
        </button>
        <div className="header-controls">
          {user ? (
            <button className="header-action" type="button" onClick={handleLogout}>
              {t.logout}
            </button>
          ) : (
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

      {view === 'landing' && (
        <LandingPage
          t={t}
          modules={modules}
          lists={lists}
          onLogin={() => navigate('login')}
        />
      )}

      {view === 'login' && (
        <AuthPage
          key="login"
          mode="login"
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
          t={t}
          onBackLogin={() => navigate('login')}
          onToast={showToast}
        />
      )}

      {view === 'resend-activation' && (
        <EmailActionPage
          key="resend-activation"
          mode="resend-activation"
          t={t}
          onBackLogin={() => navigate('login')}
          onToast={showToast}
        />
      )}

      {view === 'confirm-email' && (
        <ConfirmEmailPage
          t={t}
          search={location.search}
          onBackLogin={() => navigate('login')}
          onResendActivation={() => navigate('resend-activation')}
          onToast={showToast}
        />
      )}

      {view === 'reset-password' && (
        <ResetPasswordPage
          t={t}
          search={location.search}
          onBackLogin={() => navigate('login')}
          onToast={showToast}
        />
      )}

      {view === 'dashboard' && user && <SignedInPreview t={t} user={user} />}

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
  t,
  onSwitch,
  onToast,
  onLoginSuccess,
  onForgotPassword,
  onResendActivation,
}: {
  mode: 'login' | 'register'
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
        const result = await postAuth('/api/auth/login', { email, password })
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
  t,
  onBackLogin,
  onToast,
}: {
  mode: 'forgot-password' | 'resend-activation'
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
        { email },
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
  search,
  onBackLogin,
  onResendActivation,
  onToast,
}: {
  t: (typeof translations)[Language]
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

    confirmEmail(userId, token)
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
  }, [onToast, search, t])

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
  search,
  onBackLogin,
  onToast,
}: {
  t: (typeof translations)[Language]
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
      const result = await resetPassword(userId, token, password)

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
  onChange,
}: {
  label: string
  type: string
  value: string
  error?: string
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
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SignedInPreview({ t, user }: { t: (typeof translations)[Language]; user: AuthUser }) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-panel">
        <p className="eyebrow">{user.email}</p>
        <h1>{t.dashboardTitle}</h1>
        <p>{t.dashboardCopy}</p>
        <div className="auth-token-note">{t.authHint}</div>
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

export default App


