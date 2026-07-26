import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type Language = 'en' | 'pl'
type MenuIconName = 'home' | 'ratings' | 'teams' | 'matches' | 'tournaments' | 'predictions' | 'admin' | 'profile' | 'logout'
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
  | 'admin'
  | 'admin-tournaments'
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

type RotateApiKeyResponse = {
  apiKey: string
  message?: string
}

type TournamentSummary = {
  id: number
  name: string
  competitionName: string
  competitionCountry: string
  createdAtUtc: string
  updatedAtUtc: string
  lastSyncedAtUtc?: string | null
  stageCount: number
  teamCount: number
  matchCount: number
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
  home: '/home',
  dashboard: '/dashboard',
  admin: '/admin',
  'admin-tournaments': '/admin/tournaments',
  profile: '/profile',
}

function getViewFromPath(pathname: string): View {
  if (pathname === routes.dashboard) {
    return 'home'
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
    menuTournaments: 'Tournaments',
    menuPredictions: 'Predictions',
    menuAdmin: 'Admin',
    menuSoon: 'Soon',
    adminPanelEyebrow: 'Admin panel',
    adminPanelTitle: 'Operational control room.',
    adminPanelCopy:
      'A structured workspace for sync jobs, rating rebuilds, squad imports, and data quality checks. The controls are placeholders for now, ready to be wired to backend endpoints.',
    adminOverview: 'Overview',
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
    tournamentSeason: 'Season',
    tournamentCountry: 'Country',
    tournamentTeams: 'Teams',
    tournamentMatches: 'Matches',
    tournamentLastSync: 'Last sync',
    tournamentActions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    open: 'Open',
    noTournaments: 'No tournaments found.',
    neverSynced: 'Never synced',
    tournamentLoadFailed: 'Could not load tournaments.',
    tournamentDeleteSuccess: 'Tournament deleted.',
    tournamentDeleteConfirm: 'Delete this tournament?',
    addTournamentComingSoon: 'Create tournament flow will be connected next.',
    editTournamentComingSoon: 'Edit tournament flow will be connected next.',
    adminRatingOps: 'Ratings',
    adminRatingOpsCopy: 'Manage rating runs and rebuild Base Elo, form, performance, squad quality, and combined FTSR outputs for selected tournaments.',
    adminSquadOps: 'Squads',
    adminSquadOpsCopy: 'Manage squad sources, map teams to Transfermarkt, import player lists, and maintain squad quality snapshots for rating calculations.',
    adminQualityOps: 'Data quality',
    adminQualityOpsCopy: 'Review missing match statistics, stale squad snapshots, unfinished fixtures, and other data gaps before rating rebuilds run.',
    adminUsersOps: 'Users and access',
    adminUsersOpsCopy: 'Review users, account status, access level, lockouts, and future role-based visibility controls.',
    adminSystemJobsOps: 'System jobs',
    adminSystemJobsOpsCopy: 'Monitor scheduled sync services, intervals, recent runs, failures, and background processing health.',
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
    menuTournaments: 'Turnieje',
    menuPredictions: 'Predykcje',
    menuAdmin: 'Admin',
    menuSoon: 'Wkrótce',
    adminPanelEyebrow: 'Panel administratora',
    adminPanelTitle: 'Centrum operacyjne.',
    adminPanelCopy:
      'Strukturalny workspace dla sync jobów, rebuildów ratingów, importów kadr i kontroli jakości danych. Kontrolki są na razie placeholderami gotowymi do podpięcia pod backend.',
    adminOverview: 'Przegląd',
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
    tournamentSeason: 'Sezon',
    tournamentCountry: 'Kraj',
    tournamentTeams: 'Drużyny',
    tournamentMatches: 'Mecze',
    tournamentLastSync: 'Ostatni sync',
    tournamentActions: 'Akcje',
    edit: 'Edytuj',
    delete: 'Usuń',
    open: 'Otwórz',
    noTournaments: 'Nie znaleziono turniejów.',
    neverSynced: 'Nigdy',
    tournamentLoadFailed: 'Nie udało się pobrać turniejów.',
    tournamentDeleteSuccess: 'Turniej usunięty.',
    tournamentDeleteConfirm: 'Usunąć ten turniej?',
    addTournamentComingSoon: 'Flow tworzenia turnieju zostanie podpięty w kolejnym kroku.',
    editTournamentComingSoon: 'Flow edycji turnieju zostanie podpięty w kolejnym kroku.',
    adminRatingOps: 'Ratingi',
    adminRatingOpsCopy: 'Zarządzaj rating runami i przeliczaj Base Elo, formę, performance, jakość kadry oraz łączny FTSR dla wybranych turniejów.',
    adminSquadOps: 'Kadry',
    adminSquadOpsCopy: 'Zarządzaj źródłami kadr, mapuj drużyny do Transfermarkt, importuj listy zawodników i utrzymuj snapshoty jakości kadr dla ratingów.',
    adminQualityOps: 'Jakość danych',
    adminQualityOpsCopy: 'Sprawdzaj brakujące statystyki meczowe, stare snapshoty kadr, niezakończone fixtures i inne luki danych przed rebuildami ratingów.',
    adminUsersOps: 'Użytkownicy i dostęp',
    adminUsersOpsCopy: 'Przeglądaj użytkowników, status kont, poziom dostępu, blokady i przyszłe ustawienia widoczności według ról.',
    adminSystemJobsOps: 'System jobs',
    adminSystemJobsOpsCopy: 'Monitoruj zaplanowane sync serwisy, interwały, ostatnie uruchomienia, błędy i zdrowie procesów w tle.',
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

function extractSeason(value: string) {
  return value.match(/\b\d{4}(?:[/-]\d{2,4})?\b/)?.[0]
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
    if ((view === 'home' || view === 'admin' || view === 'admin-tournaments' || view === 'profile') && !user) {
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

      {view === 'admin' && user && (
        <AdminDashboard
          t={t}
          onNavigate={navigate}
        />
      )}

      {view === 'admin-tournaments' && user && (
        <TournamentsPanel
          t={t}
          user={user}
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
    tournaments: ['M7 4h10v3a5 5 0 0 1-10 0Z', 'M9 19h6', 'M12 12v7', 'M5 5H3v2a3 3 0 0 0 4 2.8', 'M19 5h2v2a3 3 0 0 1-4 2.8'],
    predictions: ['M4 17c4-8 12-8 16 0', 'M8 17c2.7-4.4 5.3-4.4 8 0', 'M12 17v-4', 'M12 4v3', 'M18 6l-2 2', 'M6 6l2 2'],
    admin: ['M12 3l7 3v5c0 4.5-2.8 7.6-7 9-4.2-1.4-7-4.5-7-9V6Z', 'M9.5 12.2l1.7 1.7 3.4-4'],
    profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
    logout: ['M10 5H5v14h5', 'M14 8l4 4-4 4', 'M8 12h10'],
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
    ['ratings', t.menuRatings],
    ['teams', t.menuTeams],
    ['matches', t.menuMatches],
    ['tournaments', t.menuTournaments],
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
          {futureItems.map(([icon, item]) => (
            <button className="muted" type="button" disabled key={item}>
              <span className="menu-label">
                <MenuIcon name={icon} />
                <span>{item}</span>
              </span>
              <small>{t.menuSoon}</small>
            </button>
          ))}
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
    },
    {
      icon: 'teams',
      title: t.adminSquadOps,
      description: t.adminSquadOpsCopy,
    },
    {
      icon: 'admin',
      title: t.adminQualityOps,
      description: t.adminQualityOpsCopy,
    },
    {
      icon: 'profile',
      title: t.adminUsersOps,
      description: t.adminUsersOpsCopy,
    },
    {
      icon: 'matches',
      title: t.adminSystemJobsOps,
      description: t.adminSystemJobsOpsCopy,
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

function TournamentsPanel({
  t,
  user,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'not-synced'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)

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

    return tournaments.filter((tournament) => {
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
  }, [search, syncFilter, tournaments])

  const deleteTournament = async (tournament: TournamentSummary) => {
    if (!window.confirm(`${t.tournamentDeleteConfirm} ${tournament.name}`)) {
      return
    }

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
      onToast(t.tournamentDeleteSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.tournamentsPanelEyebrow}</p>
          <h1>{t.tournamentsPanelTitle}</h1>
          <p>{t.tournamentsPanelCopy}</p>
        </div>

        <div className="tournament-toolbar">
          <button
            className="form-submit compact"
            type="button"
            onClick={() => onToast(t.addTournamentComingSoon, 'info')}
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
                <th>{t.tournamentName}</th>
                <th>{t.tournamentSeason}</th>
                <th>{t.tournamentCountry}</th>
                <th>{t.tournamentTeams}</th>
                <th>{t.tournamentMatches}</th>
                <th>{t.tournamentLastSync}</th>
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
                  <td>{extractSeason(tournament.name) ?? '-'}</td>
                  <td>{tournament.competitionCountry || '-'}</td>
                  <td>{tournament.teamCount}</td>
                  <td>{tournament.matchCount}</td>
                  <td>{formatDate(tournament.lastSyncedAtUtc, t.neverSynced)}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button">{t.open}</button>
                      <button type="button" onClick={() => onToast(t.editTournamentComingSoon, 'info')}>
                        {t.edit}
                      </button>
                      <button
                        className="danger"
                        type="button"
                        disabled={isDeletingId === tournament.id}
                        onClick={() => deleteTournament(tournament)}
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
              {isLoading && (
                <tr>
                  <td className="empty-table" colSpan={7}>
                    <LoadingSpinner />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
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


