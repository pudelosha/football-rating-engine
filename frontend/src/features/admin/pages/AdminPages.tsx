import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FormField } from '../../../shared/components/FormField/FormField'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay, LoadingSpinner } from '../../../shared/components/Spinner'
import { translations } from '../../../i18n'
import { AdminOverviewGrid } from '../components/AdminOverviewGrid'
import { matchStatusLabels, matchSyncStateLabels, ratingLayerKeys, ratingSnapshotStartOffsets } from '../model/adminModel'
import {
  acceptDataQualityIssues,
  createTournament,
  deleteAdminUser,
  deleteTournament,
  fetchAdminTeams,
  fetchAdminUsers,
  fetchBaseEloLatestRun,
  fetchCombinedRatings,
  fetchDataQualityChecks,
  fetchDataQualityIssues,
  fetchExternalTeamMappings,
  fetchFormLatestRun,
  fetchLatestSquadSnapshot,
  fetchPerformanceLatestRun,
  fetchRatingConfiguration,
  fetchSyncRunSummaries,
  fetchSystemHealth,
  fetchTournamentDetails,
  fetchTournamentMatches,
  fetchTournamentRatingSetup,
  fetchTournaments,
  fetchTournamentSquadCoverage,
  fetchTournamentSyncRuns,
  fetchTournamentTeams,
  importTransfermarktSquad,
  previewTournament,
  resendUserConfirmation,
  runRatingRebuild,
  saveRatingConfiguration,
  saveTournamentRatingSetup,
  syncAllTournaments,
  syncTournament,
  updateSystemJobService,
  updateTeam,
  updateTournament,
  updateTournamentMatch,
  updateTournamentTeam,
  updateUserLock,
  updateUserRole,
} from '../services/adminService'
import type {
  AdminUser,
  AuthUser,
  CombinedRatingsResponse,
  DataQualityIssue,
  DataQualityTournamentCheck,
  EloRatingRun,
  ExternalTeamMapping,
  Language,
  LayerRatingRun,
  MatchSortKey,
  MatchSummary,
  MenuIconName,
  RatingConfiguration,
  RatingTeamSortKey,
  SortDirection,
  SquadQualitySnapshot,
  SquadTeamRow,
  SquadTeamSortKey,
  SquadTournamentCoverage,
  SquadTournamentSortKey,
  SyncServiceHealth,
  SystemJobService,
  TeamSortKey,
  TeamSummary,
  ToastTone,
  TournamentDetails,
  TournamentPreview,
  TournamentSortKey,
  TournamentSquadCoverageResponse,
  TournamentSummary,
  TournamentSyncRun,
  TournamentSyncRunSummary,
  UserSortKey,
  View,
} from '../../../shared/types'
import {
  compareText,
  enumValue,
  formatDate,
  formatEuroValue,
  formatMinutes,
  nullableNumber,
  toDateTimeLocalInput,
} from '../../../shared/utils'
export function AdminDashboard({
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
      icon: 'teams',
      title: t.adminTeamsOps,
      description: t.adminTeamsOpsCopy,
      action: () => onNavigate('admin-teams'),
    },
    {
      icon: 'ratings',
      title: t.adminRatingOps,
      description: t.adminRatingOpsCopy,
      action: () => onNavigate('admin-ratings'),
    },
    {
      icon: 'teams',
      title: t.adminSquadOps,
      description: t.adminSquadOpsCopy,
      action: () => onNavigate('admin-squads'),
    },
    {
      icon: 'admin',
      title: t.adminQualityOps,
      description: t.adminQualityOpsCopy,
      action: () => onNavigate('admin-data-quality'),
    },
    {
      icon: 'api',
      title: t.adminNotificationsOps,
      description: t.adminNotificationsOpsCopy,
    },
    {
      icon: 'profile',
      title: t.adminUsersOps,
      description: t.adminUsersOpsCopy,
      action: () => onNavigate('admin-users'),
    },
    {
      icon: 'matches',
      title: t.adminSystemJobsOps,
      description: t.adminSystemJobsOpsCopy,
      action: () => onNavigate('admin-system-jobs'),
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

        <AdminOverviewGrid cards={overviewCards} />
      </div>
    </section>
  )
}

export function AdminTeamsPanel({
  t,
  user,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [search, setSearch] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [sortKey, setSortKey] = useState<TeamSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editingTeam, setEditingTeam] = useState<TeamSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<number | null>(null)

  const loadTeams = async () => {
    setIsLoading(true)
    try {
      const result = await fetchAdminTeams(user.token)

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setTeams(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [user.token])

  const displayedTeams = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = teams.filter((team) => {
      if (visibilityFilter === 'enabled' && !team.isEnabled) {
        return false
      }

      if (visibilityFilter === 'disabled' && team.isEnabled) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const assignmentValues = team.tournamentAssignments?.flatMap((assignment) => [
        assignment.tournamentName,
        assignment.season,
        assignment.country,
      ]) ?? []

      return [team.name, team.abbreviation, team.id.toString(), ...assignmentValues]
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    })

    return filtered.sort((left, right) => {
      let comparison = 0

      if (sortKey === 'name') {
        comparison = compareText(left.name, right.name)
      } else if (sortKey === 'abbreviation') {
        comparison = compareText(left.abbreviation, right.abbreviation)
      } else {
        comparison = (left.tournamentAssignments?.length ?? 0) - (right.tournamentAssignments?.length ?? 0)
      }

      if (comparison === 0) {
        comparison = left.id - right.id
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [search, sortDirection, sortKey, teams, visibilityFilter])

  const requestSort = (key: TeamSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const onTeamSaved = (updatedTeam: TeamSummary) => {
    setTeams((current) => current.map((team) => team.id === updatedTeam.id ? updatedTeam : team))
    setEditingTeam(null)
    onToast(t.teamUpdated, 'success')
  }

  const updateTeamVisibility = async (team: TeamSummary, isEnabled: boolean) => {
    if (team.isEnabled === isEnabled || updatingVisibilityId !== null) {
      return
    }

    setUpdatingVisibilityId(team.id)
    try {
      const result = await updateTeam(user.token, team.id, {
        name: team.name,
        abbreviation: team.abbreviation,
        isEnabled,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setTeams((current) => current.map((item) => item.id === team.id
        ? { ...item, ...result.data!, tournamentAssignments: item.tournamentAssignments }
        : item))
      onToast(t.teamUpdated, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setUpdatingVisibilityId(null)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.adminTeamsPanelEyebrow}</p>
          <h1>{t.adminTeamsPanelTitle}</h1>
          <p>{t.adminTeamsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading spread admin-teams-heading">
            <div>
              <MenuIcon name="teams" />
              <h2>{t.adminTeamsTableTitle}</h2>
            </div>
            <div className="admin-team-toolbar">
              <label className="tournament-search compact rating-table-search align-right">
                <span>{t.teamSearch}</span>
                <input
                  placeholder={t.teamSearchPlaceholder}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="tournament-filter admin-team-filter">
                {[
                  ['all', t.tournamentFilterAll],
                  ['enabled', t.teamFilterEnabled],
                  ['disabled', t.teamFilterDisabled],
                ].map(([value, label]) => (
                  <button
                    className={visibilityFilter === value ? 'active' : ''}
                    type="button"
                    key={value}
                    onClick={() => setVisibilityFilter(value as typeof visibilityFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-tournament-table admin-teams-table">
              <thead>
                <tr>
                  {[
                    { key: 'name', label: t.teamName },
                    { key: 'abbreviation', label: t.abbreviation },
                    { key: 'tournaments', label: t.activeTournamentContexts },
                  ].map((header) => (
                    <th key={header.key}>
                      <button
                        className="table-sort-button"
                        type="button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key as TeamSortKey)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.teamVisibility}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedTeams.map((team) => (
                  <tr key={team.id}>
                    <td><strong>{team.name}</strong></td>
                    <td>{team.abbreviation || '-'}</td>
                    <td>
                      <div className="admin-team-tournament-list">
                        {(team.tournamentAssignments?.length ?? 0) > 0
                          ? team.tournamentAssignments?.map((assignment) => (
                            <span key={assignment.tournamentId}>
                              {assignment.tournamentName}{assignment.season ? ` ${assignment.season}` : ''}
                            </span>
                          ))
                          : <span>-</span>}
                      </div>
                    </td>
                    <td>
                      <div className="team-visibility-actions" aria-label={t.teamVisibility}>
                        <button
                          className={team.isEnabled ? 'active' : ''}
                          disabled={updatingVisibilityId !== null}
                          type="button"
                          onClick={() => updateTeamVisibility(team, true)}
                        >
                          {t.enabled}
                        </button>
                        <button
                          className={!team.isEnabled ? 'active disabled-state' : 'disabled-state'}
                          disabled={updatingVisibilityId !== null}
                          type="button"
                          onClick={() => updateTeamVisibility(team, false)}
                        >
                          {t.disabled}
                        </button>
                      </div>
                    </td>
                    <td>
                      <button type="button" onClick={() => setEditingTeam(team)}>
                        {t.edit}
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && displayedTeams.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={5}>{t.noTeams}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editingTeam && (
        <AdminTeamEditModal
          t={t}
          user={user}
          team={editingTeam}
          onCancel={() => setEditingTeam(null)}
          onSaved={(team) => onTeamSaved({ ...editingTeam, ...team, tournamentAssignments: editingTeam.tournamentAssignments })}
          onToast={onToast}
        />
      )}
    </section>
  )
}


export function RatingsPanel({
  t,
  user,
  onToast,
  onBack,
  onOpen,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
  onOpen: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [config, setConfig] = useState<RatingConfiguration | null>(null)
  const [draft, setDraft] = useState<RatingConfiguration | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [sortKey, setSortKey] = useState<TournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      try {
        const [tournamentsResult, configResult] = await Promise.all([
          fetchTournaments(user.token),
          fetchRatingConfiguration(user.token),
        ])

        if (!isMounted) {
          return
        }

        if (!tournamentsResult.ok || !tournamentsResult.data) {
          onToast(tournamentsResult.message || t.genericError, 'error')
          return
        }

        if (!configResult.ok || !configResult.data) {
          onToast(configResult.message || t.genericError, 'error')
          return
        }

        setTournaments(tournamentsResult.data)
        setConfig(configResult.data)
        setDraft(configResult.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [t.genericError, user.token])

  const updateDraft = (key: keyof RatingConfiguration, value: string) => {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      [key]: key === 'bootstrapSeasonCount' || key === 'formMatchCount' || key === 'performanceMatchCount'
        ? Math.max(0, Number(value) || 0)
        : Number(value) || 0,
    })
  }

  const saveConfig = async () => {
    if (!draft) {
      return
    }

    setIsSaving(true)
    try {
      const result = await saveRatingConfiguration(user.token, {
        baseEloWeight: draft.baseEloWeight,
        formWeight: draft.formWeight,
        performanceWeight: draft.performanceWeight,
        squadQualityWeight: draft.squadQualityWeight,
        leagueStrengthWeight: draft.leagueStrengthWeight,
        uncertaintyPenaltyWeight: draft.uncertaintyPenaltyWeight,
        baseRating: draft.baseRating,
        promotedBaselineRating: draft.promotedBaselineRating,
        kFactor: draft.kFactor,
        homeAdvantage: draft.homeAdvantage,
        bootstrapSeasonCount: draft.bootstrapSeasonCount,
        formMatchCount: draft.formMatchCount,
        formScale: draft.formScale,
        formMaxAdjustment: draft.formMaxAdjustment,
        performanceMatchCount: draft.performanceMatchCount,
        performanceScale: draft.performanceScale,
        performanceMaxAdjustment: draft.performanceMaxAdjustment,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setConfig(result.data)
      setDraft(result.data)
      onToast(t.ratingConfigSaved, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const weightTotal = draft
    ? draft.baseEloWeight + draft.formWeight + draft.performanceWeight + draft.squadQualityWeight + draft.leagueStrengthWeight - draft.uncertaintyPenaltyWeight
    : 0

  const sortedTournaments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = tournaments.filter((tournament) => {
      if (!normalizedSearch) {
        return true
      }

      return [
        tournament.name,
        tournament.season,
        tournament.competitionName,
        tournament.competitionCountry,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    })

    return filtered.sort((left, right) => {
      let comparison = 0

      if (sortKey === 'name') {
        comparison = compareText(left.name, right.name)
      } else if (sortKey === 'season') {
        comparison = compareText(left.season || '', right.season || '')
      } else if (sortKey === 'country') {
        comparison = compareText(left.competitionCountry || left.competitionName, right.competitionCountry || right.competitionName)
      } else if (sortKey === 'teams') {
        comparison = left.teamCount - right.teamCount
      } else if (sortKey === 'matches') {
        comparison = left.matchCount - right.matchCount
      } else if (sortKey === 'lastSync') {
        comparison = new Date(left.lastSyncedAtUtc ?? 0).getTime() - new Date(right.lastSyncedAtUtc ?? 0).getTime()
      }

      if (comparison === 0) {
        comparison = compareText(left.name, right.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [search, sortDirection, sortKey, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'teams' || key === 'matches' || key === 'lastSync' ? 'desc' : 'asc')
  }

  const tournamentHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.teams },
    { key: 'matches', label: t.matches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  const weightFields: Array<{ key: keyof RatingConfiguration; label: string }> = [
    { key: 'baseEloWeight', label: t.ratingConfigBaseEloWeight },
    { key: 'formWeight', label: t.ratingConfigFormWeight },
    { key: 'performanceWeight', label: t.ratingConfigPerformanceWeight },
    { key: 'squadQualityWeight', label: t.ratingConfigSquadWeight },
    { key: 'leagueStrengthWeight', label: t.ratingConfigLeagueWeight },
    { key: 'uncertaintyPenaltyWeight', label: t.ratingConfigUncertaintyWeight },
  ]

  const parameterFields: Array<{ key: keyof RatingConfiguration; label: string }> = [
    { key: 'baseRating', label: t.ratingConfigBaseRating },
    { key: 'promotedBaselineRating', label: t.ratingConfigPromotedBaseline },
    { key: 'kFactor', label: t.ratingConfigKFactor },
    { key: 'homeAdvantage', label: t.ratingConfigHomeAdvantage },
    { key: 'bootstrapSeasonCount', label: t.ratingConfigBootstrapSeasons },
    { key: 'formMatchCount', label: t.ratingConfigFormMatches },
    { key: 'formScale', label: t.ratingConfigFormScale },
    { key: 'formMaxAdjustment', label: t.ratingConfigFormMax },
    { key: 'performanceMatchCount', label: t.ratingConfigPerformanceMatches },
    { key: 'performanceScale', label: t.ratingConfigPerformanceScale },
    { key: 'performanceMaxAdjustment', label: t.ratingConfigPerformanceMax },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.ratingsPanelEyebrow}</p>
          <h1>{t.ratingsPanelTitle}</h1>
          <p>{t.ratingsPanelCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading spread">
            <div>
              <MenuIcon name="tournaments" />
              <h2>{t.ratingTournamentListTitle}</h2>
            </div>
            <label className="tournament-search compact">
              <span>{t.tournamentSearch}</span>
              <input
                placeholder={t.tournamentSearchPlaceholder}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-tournament-table">
              <thead>
                <tr>
                  {tournamentHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td><strong>{tournament.name}</strong></td>
                    <td>{tournament.season}</td>
                    <td>{tournament.competitionCountry}</td>
                    <td>{tournament.teamCount}</td>
                    <td>{tournament.matchCount}</td>
                    <td>{formatDate(tournament.lastSyncedAtUtc, '-')}</td>
                    <td>
                      <button type="button" onClick={() => onOpen(tournament.id)}>
                        {t.ratingOpenTournament}
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedTournaments.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {draft && (
          <div className="rating-admin-grid rating-control-grid">
            <section className="details-panel">
              <div className="details-panel-heading">
                <MenuIcon name="ratings" />
                <h2>{t.ratingWeightsTitle}</h2>
              </div>
              <div className="rating-config-form compact">
                {weightFields.map((field) => (
                  <label className="form-field" key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={String(draft[field.key])}
                      onChange={(event) => updateDraft(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="rating-config-footer">
                <div>
                  <span>{t.ratingWeightTotal}</span>
                  <strong>{weightTotal.toFixed(2)}</strong>
                </div>
                <button type="button" onClick={saveConfig} disabled={isSaving}>
                  {t.ratingSaveConfig}
                </button>
              </div>
            </section>

            <section className="details-panel">
              <div className="details-panel-heading">
                <MenuIcon name="admin" />
                <h2>{t.ratingParametersTitle}</h2>
              </div>
              <div className="rating-config-form">
                {parameterFields.map((field) => (
                  <label className="form-field" key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={String(draft[field.key])}
                      onChange={(event) => updateDraft(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="rating-config-footer">
                <div>
                  <span>{t.ratingUpdated}</span>
                  <strong>{config ? formatDate(config.updatedAtUtc, '-') : '-'}</strong>
                </div>
                <button type="button" onClick={saveConfig} disabled={isSaving}>
                  {t.ratingSaveConfig}
                </button>
              </div>
            </section>
          </div>
        )}

      </div>
    </section>
  )
}

export function RatingTournamentDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: number
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [config, setConfig] = useState<RatingConfiguration | null>(null)
  const [baseRun, setBaseRun] = useState<EloRatingRun | null>(null)
  const [formRun, setFormRun] = useState<LayerRatingRun | null>(null)
  const [performanceRun, setPerformanceRun] = useState<LayerRatingRun | null>(null)
  const [combinedRatings, setCombinedRatings] = useState<CombinedRatingsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeRebuild, setActiveRebuild] = useState<'base' | 'form' | 'performance' | null>(null)
  const [snapshotStartSeasonOffset, setSnapshotStartSeasonOffset] = useState<number | null>(null)
  const [draftSnapshotStartSeasonOffset, setDraftSnapshotStartSeasonOffset] = useState<number | null>(null)
  const [includedLayers, setIncludedLayers] = useState({
    form: true,
    performance: true,
    squad: true,
  })
  const [draftIncludedLayers, setDraftIncludedLayers] = useState({
    form: true,
    performance: true,
    squad: true,
  })
  const [ratingSortKey, setRatingSortKey] = useState<RatingTeamSortKey>('finalRating')
  const [ratingSortDirection, setRatingSortDirection] = useState<SortDirection>('desc')

  const loadDetails = async () => {
    setIsLoading(true)
    try {
      const [tournamentResult, configResult, baseResult, formResult, performanceResult, combinedResult, setupResult] = await Promise.all([
        fetchTournamentDetails(user.token, tournamentId),
        fetchRatingConfiguration(user.token),
        fetchBaseEloLatestRun(user.token, tournamentId),
        fetchFormLatestRun(user.token, tournamentId),
        fetchPerformanceLatestRun(user.token, tournamentId),
        fetchCombinedRatings(user.token, tournamentId),
        fetchTournamentRatingSetup(user.token, tournamentId),
      ])

      if (!tournamentResult.ok || !tournamentResult.data) {
        onToast(tournamentResult.message || t.genericError, 'error')
        return
      }

      if (!configResult.ok || !configResult.data) {
        onToast(configResult.message || t.genericError, 'error')
        return
      }

      const nextConfig = configResult.data
      const setup = setupResult.ok && setupResult.data
        ? setupResult.data
        : {
            includeForm: true,
            includePerformance: true,
            includeSquad: true,
            snapshotStartSeasonOffset: -Math.max(0, nextConfig.bootstrapSeasonCount),
          }
      const nextLayers = {
        form: setup.includeForm,
        performance: setup.includePerformance,
        squad: setup.includeSquad,
      }
      const nextSnapshotOffset = setup.snapshotStartSeasonOffset ?? -Math.max(0, nextConfig.bootstrapSeasonCount)
      setTournament(tournamentResult.data)
      setConfig(nextConfig)
      setIncludedLayers(nextLayers)
      setDraftIncludedLayers(nextLayers)
      setSnapshotStartSeasonOffset(nextSnapshotOffset)
      setDraftSnapshotStartSeasonOffset(nextSnapshotOffset)
      setBaseRun(baseResult.ok && baseResult.data ? baseResult.data : null)
      setFormRun(formResult.ok && formResult.data ? formResult.data : null)
      setPerformanceRun(performanceResult.ok && performanceResult.data ? performanceResult.data : null)
      setCombinedRatings(combinedResult.ok && combinedResult.data ? combinedResult.data : null)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDetails()
  }, [tournamentId, user.token])

  const rebuild = async (layer: 'base' | 'form' | 'performance') => {
    if (!config) {
      return
    }

    setActiveRebuild(layer)
    try {
      const endpoint = layer === 'base'
        ? `/api/tournaments/${tournamentId}/ratings/base-elo/rebuild`
        : layer === 'form'
          ? `/api/tournaments/${tournamentId}/ratings/form/rebuild`
          : `/api/tournaments/${tournamentId}/ratings/performance/rebuild`

      const body = layer === 'base'
        ? {
            baseRating: config.baseRating,
            promotedBaselineRating: config.promotedBaselineRating,
            kFactor: config.kFactor,
            homeAdvantage: tournament?.applyHomeAdvantage ? config.homeAdvantage : 0,
            bootstrapSeasonCount: config.bootstrapSeasonCount,
            scope: tournament?.competitionName || 'Tournament',
            snapshotStartSeasonOffset: snapshotStartSeasonOffset ?? -Math.max(0, config.bootstrapSeasonCount),
          }
        : layer === 'form'
          ? {
              matchCount: config.formMatchCount,
              scale: config.formScale,
              maxAdjustment: config.formMaxAdjustment,
            }
          : {
              matchCount: config.performanceMatchCount,
              scale: config.performanceScale,
              maxAdjustment: config.performanceMaxAdjustment,
            }

      const result = await runRatingRebuild(user.token, endpoint, body)

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(t.ratingRefreshDone, 'success')
      await loadDetails()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setActiveRebuild(null)
    }
  }

  const runCards = [
    { key: 'base', title: 'Base Elo', run: baseRun, action: t.ratingRefreshBase, onClick: () => rebuild('base'), processed: baseRun?.processedMatches ?? 0 },
    { key: 'form', title: 'Form', run: formRun, action: t.ratingRefreshForm, onClick: () => rebuild('form'), processed: formRun?.processedTeams ?? 0 },
    { key: 'performance', title: 'Performance', run: performanceRun, action: t.ratingRefreshPerformance, onClick: () => rebuild('performance'), processed: performanceRun?.processedTeams ?? 0 },
  ]

  const displayedTeams = useMemo(() => {
    return (combinedRatings?.teams ?? [])
      .map((team) => {
        const formAdjustment = includedLayers.form ? team.formAdjustment : 0
        const performanceAdjustment = includedLayers.performance ? team.performanceAdjustment : 0
        const squadQualityAdjustment = includedLayers.squad ? team.squadQualityAdjustment : 0
        const totalAdjustment = formAdjustment + performanceAdjustment + squadQualityAdjustment

        return {
          ...team,
          formAdjustment,
          performanceAdjustment,
          squadQualityAdjustment,
          totalAdjustment,
          finalRating: team.baseElo + totalAdjustment,
        }
      })
      .sort((left, right) => {
        let comparison = 0
        if (ratingSortKey === 'team') {
          comparison = compareText(left.teamName, right.teamName)
        } else if (ratingSortKey === 'baseElo') {
          comparison = left.baseElo - right.baseElo
        } else if (ratingSortKey === 'form') {
          comparison = left.formAdjustment - right.formAdjustment
        } else if (ratingSortKey === 'performance') {
          comparison = left.performanceAdjustment - right.performanceAdjustment
        } else if (ratingSortKey === 'squad') {
          comparison = left.squadQualityAdjustment - right.squadQualityAdjustment
        } else if (ratingSortKey === 'finalRating') {
          comparison = left.finalRating - right.finalRating
        } else if (ratingSortKey === 'confidence') {
          comparison = left.ratingConfidence - right.ratingConfidence
        }

        if (comparison === 0) {
          comparison = compareText(left.teamName, right.teamName)
        }

        return ratingSortDirection === 'asc' ? comparison : -comparison
      })
  }, [combinedRatings, includedLayers, ratingSortDirection, ratingSortKey])

  const requestRatingSort = (key: RatingTeamSortKey) => {
    if (ratingSortKey === key) {
      setRatingSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setRatingSortKey(key)
    setRatingSortDirection(key === 'team' ? 'asc' : 'desc')
  }

  const layerLabels: Record<keyof typeof includedLayers, string> = {
    form: t.ratingForm,
    performance: t.ratingPerformance,
    squad: t.ratingSquad,
  }
  const layerToggles: Array<{ key: keyof typeof includedLayers; label: string }> = ratingLayerKeys.map((key) => ({
    key,
    label: layerLabels[key],
  }))

  const snapshotStartLabels = [
    t.ratingSnapshotStartCurrent,
    t.ratingSnapshotStartOneBack,
    t.ratingSnapshotStartTwoBack,
    t.ratingSnapshotStartThreeBack,
    t.ratingSnapshotStartFourBack,
    t.ratingSnapshotStartFiveBack,
  ]
  const snapshotStartOptions = ratingSnapshotStartOffsets.map((value, index) => ({
    value,
    label: snapshotStartLabels[index],
  }))

  const ratingTeamHeaders: Array<{ key: RatingTeamSortKey; label: string }> = [
    { key: 'team', label: t.ratingTeam },
    { key: 'baseElo', label: t.ratingBaseElo },
    { key: 'form', label: t.ratingForm },
    { key: 'performance', label: t.ratingPerformance },
    { key: 'squad', label: t.ratingSquad },
    { key: 'finalRating', label: t.ratingFinal },
    { key: 'confidence', label: t.ratingConfidence },
  ]

  const snapshotStartLabel = (offset: number | null | undefined) => {
    if (offset === null || offset === undefined) {
      return '-'
    }

    return snapshotStartOptions.find((option) => option.value === offset)?.label ?? String(offset)
  }

  const effectiveDraftSnapshotStart = draftSnapshotStartSeasonOffset ?? -Math.max(0, config?.bootstrapSeasonCount ?? 3)
  const effectiveSnapshotStart = snapshotStartSeasonOffset ?? -Math.max(0, config?.bootstrapSeasonCount ?? 3)
  const hasModelSetupChanges =
    effectiveDraftSnapshotStart !== effectiveSnapshotStart ||
    draftIncludedLayers.form !== includedLayers.form ||
    draftIncludedLayers.performance !== includedLayers.performance ||
    draftIncludedLayers.squad !== includedLayers.squad

  const updateModelSetup = async () => {
    try {
      const result = await saveTournamentRatingSetup(user.token, tournamentId, {
        includeForm: draftIncludedLayers.form,
        includePerformance: draftIncludedLayers.performance,
        includeSquad: draftIncludedLayers.squad,
        snapshotStartSeasonOffset: effectiveDraftSnapshotStart,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      const nextLayers = {
        form: result.data.includeForm,
        performance: result.data.includePerformance,
        squad: result.data.includeSquad,
      }
      const nextSnapshotOffset = result.data.snapshotStartSeasonOffset ?? -Math.max(0, config?.bootstrapSeasonCount ?? 3)
      setSnapshotStartSeasonOffset(nextSnapshotOffset)
      setDraftSnapshotStartSeasonOffset(nextSnapshotOffset)
      setIncludedLayers(nextLayers)
      setDraftIncludedLayers(nextLayers)
      onToast(t.ratingModelSetupUpdated, 'success')
    } catch {
      onToast(t.genericError, 'error')
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.ratingDetailsEyebrow}</p>
          <h1>{tournament?.name ?? t.ratingDetailsEyebrow}</h1>
          <p>{t.ratingDetailsCopy}</p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToRatings}</span>
          </button>
        </div>

        {(isLoading || activeRebuild) && (
          <FullPageProcessingOverlay label={activeRebuild ? t.ratingRefreshing : t.loading} />
        )}

        <section className="details-panel rating-model-setup-panel">
          <div className="details-panel-heading">
            <MenuIcon name="admin" />
            <h2>{t.ratingModelSetup}</h2>
          </div>
          <div className="rating-model-setup-grid">
            <div className="rating-model-box">
              <span>{t.ratingIncludedLayers}</span>
              <p>{t.ratingIncludedLayersCopy}</p>
              <div className="rating-layer-toggle-grid">
                <label className="rating-layer-toggle locked">
                  <input type="checkbox" checked readOnly />
                  <strong>{t.ratingBaseElo}</strong>
                </label>
                {layerToggles.map((layer) => (
                  <label className="rating-layer-toggle" key={layer.key}>
                    <input
                      type="checkbox"
                      checked={draftIncludedLayers[layer.key]}
                      onChange={() => setDraftIncludedLayers((current) => ({
                        ...current,
                        [layer.key]: !current[layer.key],
                      }))}
                    />
                    <strong>{layer.label}</strong>
                  </label>
                ))}
              </div>
            </div>
            <div className="rating-model-box">
              <span>{t.ratingSnapshotStart}</span>
              <p>{t.ratingSnapshotStartCopy}</p>
              <div className="rating-snapshot-selector">
                {snapshotStartOptions.map((option) => (
                  <button
                    type="button"
                    className={effectiveDraftSnapshotStart === option.value ? 'active' : ''}
                    key={option.value}
                    onClick={() => setDraftSnapshotStartSeasonOffset(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rating-config-footer">
            <div>
              <span>{t.ratingSnapshotStart}</span>
              <strong>{snapshotStartLabel(effectiveSnapshotStart)}</strong>
            </div>
            <button type="button" onClick={updateModelSetup} disabled={!hasModelSetupChanges}>
              {t.ratingUpdateModelSetup}
            </button>
          </div>
        </section>

        <section className="details-panel rating-snapshot-runs-panel">
          <div className="details-panel-heading">
            <MenuIcon name="ratings" />
            <h2>{t.ratingRunSnapshots}</h2>
          </div>
          <div className="rating-run-grid">
            {runCards.map((card) => (
              <article className="rating-run-card" key={card.key}>
                <div className="rating-run-card-head">
                  <div>
                    <h3>{card.title}</h3>
                    <span>{card.run ? `${t.ratingRunId}: ${card.run.id}` : t.ratingNoRun}</span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>{t.ratingStarted}</dt>
                    <dd>{card.run ? formatDate(card.run.startedAtUtc, '-') : '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.ratingFinished}</dt>
                    <dd>{card.run ? formatDate(card.run.finishedAtUtc, '-') : '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.ratingProcessed}</dt>
                    <dd>{card.processed}</dd>
                  </div>
                  {card.key === 'base' && (
                    <div>
                      <dt>{t.ratingSnapshotStart}</dt>
                      <dd>{snapshotStartLabel((card.run as EloRatingRun | null)?.snapshotStartSeasonOffset)}</dd>
                    </div>
                  )}
                </dl>
                <button type="button" onClick={card.onClick} disabled={Boolean(activeRebuild) || !config}>
                  {card.action}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="teams" />
            <h2>{t.ratingTeamRatings}</h2>
          </div>
          <div className="rating-context-strip">
            <span>{t.ratingBaseElo}: {combinedRatings?.runContext.baseEloRunId ?? '-'}</span>
            <span>{t.ratingForm}: {combinedRatings?.runContext.formRatingRunId ?? '-'}</span>
            <span>{t.ratingPerformance}: {combinedRatings?.runContext.performanceRatingRunId ?? '-'}</span>
            <span>{t.ratingUpdated}: {combinedRatings ? formatDate(combinedRatings.runContext.calculatedAtUtc, '-') : '-'}</span>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table ratings-team-table">
              <thead>
                <tr>
                  {ratingTeamHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={ratingSortKey === header.key ? (ratingSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestRatingSort(header.key)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{ratingSortKey === header.key ? (ratingSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!isLoading && displayedTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td><strong>{team.teamName}</strong><span>{team.teamAbbreviation}</span></td>
                    <td>{team.baseElo.toFixed(2)}</td>
                    <td>{team.formAdjustment.toFixed(2)}</td>
                    <td>{team.performanceAdjustment.toFixed(2)}</td>
                    <td>{team.squadQualityAdjustment.toFixed(2)}</td>
                    <td><strong>{team.finalRating.toFixed(2)}</strong></td>
                    <td>{(team.ratingConfidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
                {!isLoading && displayedTeams.length === 0 && (
                  <tr>
                    <td className="empty-table" colSpan={7}>{t.ratingNoRun}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

export function SystemJobsPanel({
  t,
  user,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [services, setServices] = useState<SystemJobService[]>(() => [...t.systemJobsCoreItems])
  const [editingService, setEditingService] = useState<SystemJobService | null>(null)
  const [healthService, setHealthService] = useState<SystemJobService | null>(null)
  const [editedInterval, setEditedInterval] = useState('')
  const [editedOnHold, setEditedOnHold] = useState(false)
  const [recentRuns, setRecentRuns] = useState<TournamentSyncRunSummary[]>([])
  const [serviceHealth, setServiceHealth] = useState<SyncServiceHealth[]>([])
  const [isLoadingRuns, setIsLoadingRuns] = useState(true)
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)
  const [isSavingService, setIsSavingService] = useState(false)
  const [activeGlobalSyncMode, setActiveGlobalSyncMode] = useState<'full' | 'schedule' | 'live' | 'finalize' | 'results' | null>(null)
  const isInitialLoading = isLoadingRuns || isLoadingHealth
  const syncButtons: Array<{ mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results'; label: string; copy: string }> = [
    { mode: 'full', label: t.fullSync, copy: t.fullSyncCopy },
    { mode: 'schedule', label: t.scheduleSync, copy: t.scheduleSyncCopy },
    { mode: 'live', label: t.liveSync, copy: t.liveSyncCopy },
    { mode: 'finalize', label: t.finalizeSync, copy: t.finalizeSyncCopy },
    { mode: 'results', label: t.resultsSync, copy: t.resultsSyncCopy },
  ]
  const activeGlobalSyncLabel = syncButtons.find((button) => button.mode === activeGlobalSyncMode)?.label

  useEffect(() => {
    setServices([...t.systemJobsCoreItems])
  }, [t])

  const loadRecentRuns = async () => {
    setIsLoadingRuns(true)
    try {
      const result = await fetchSyncRunSummaries(user.token)

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setRecentRuns(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoadingRuns(false)
    }
  }

  const loadServiceHealth = async () => {
    setIsLoadingHealth(true)
    try {
      const result = await fetchSystemHealth(user.token)

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setServiceHealth(result.data)
      setServices((current) => current.map((service) => {
        const health = service.serviceKey
          ? result.data!.find((item) => item.serviceKey === service.serviceKey)
          : result.data!.find((item) => item.serviceName === service.title)

        return health
          ? {
            ...service,
            cadence: `${health.intervalMinutes} min`,
            status: health.isEnabled ? t.systemJobsLive : t.systemJobsOnHold,
          }
          : service
      }))
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoadingHealth(false)
    }
  }

  useEffect(() => {
    loadRecentRuns()
    loadServiceHealth()
  }, [user.token])

  const runGlobalSync = async (mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results') => {
    setActiveGlobalSyncMode(mode)
    try {
      const result = await syncAllTournaments(user.token, mode)

      if (!result.ok || !result.data) {
        onToast(result.message || t.syncFailed, 'error')
        return
      }

      onToast(`${t.syncStarted} ${result.data.succeededCount}/${result.data.tournamentCount}`, result.data.failedCount > 0 ? 'error' : 'success')
      await loadRecentRuns()
      await loadServiceHealth()
    } catch {
      onToast(t.syncFailed, 'error')
    } finally {
      setActiveGlobalSyncMode(null)
    }
  }

  const getServiceHealth = (service: SystemJobService) => serviceHealth.find((item) =>
    service.serviceKey ? item.serviceKey === service.serviceKey : item.serviceName === service.title)

  const openServiceEditor = (service: SystemJobService) => {
    const health = getServiceHealth(service)
    setEditingService(service)
    setEditedInterval(String(health?.intervalMinutes ?? (parseInt(service.cadence, 10) || 1)))
    setEditedOnHold(health ? !health.isEnabled : service.status !== t.systemJobsLive && service.status !== 'Live')
  }

  const saveServiceEditor = async () => {
    if (!editingService) {
      return
    }

    const intervalMinutes = Math.max(1, Number.parseInt(editedInterval, 10) || 1)

    if (editingService.serviceKey) {
      setIsSavingService(true)
      try {
        const result = await updateSystemJobService(user.token, editingService.serviceKey, {
          isEnabled: !editedOnHold,
          intervalMinutes,
        })

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        await loadServiceHealth()
        onToast(t.systemJobsServiceUpdated, 'success')
      } catch {
        onToast(t.genericError, 'error')
        return
      } finally {
        setIsSavingService(false)
      }
    }

    setServices((current) => current.map((service) => service.title === editingService.title
      ? {
        ...service,
        cadence: `${intervalMinutes} min`,
        status: editedOnHold ? t.systemJobsOnHold : t.systemJobsLive,
      }
      : service))
    setEditingService(null)
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content system-jobs-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.systemJobsPanelEyebrow}</p>
          <h1>{t.systemJobsPanelTitle}</h1>
          <p>{t.systemJobsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isInitialLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {activeGlobalSyncMode && (
          <FullPageProcessingOverlay label={activeGlobalSyncLabel ?? t.syncOperations} />
        )}

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="matches" />
            <h2>{t.systemJobsCoreTitle}</h2>
          </div>
          <div className="tournament-table-shell system-services-table-shell">
            <table className="tournament-table system-services-table">
              <thead>
                <tr>
                  <th>{t.systemJobsService}</th>
                  <th>Status</th>
                  <th>{t.systemJobsInterval}</th>
                  <th>{t.systemJobsNextRun}</th>
                  <th>{t.systemJobsPurpose}</th>
                  <th>{t.userActions}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.title}>
                    <td><strong>{service.title}</strong></td>
                    <td>
                      <span className={`access-status-pill ${service.status === t.systemJobsLive || service.status === 'Live' ? 'active' : 'pending'}`}>
                        {service.status}
                      </span>
                    </td>
                    <td>{service.cadence}</td>
                    <td>{service.nextRun}</td>
                    <td><span className="service-purpose-text">{service.copy}</span></td>
                    <td>
                      <div className="service-action-row">
                        <button type="button" onClick={() => setHealthService(service)}>
                          {t.systemJobsHealthTitle}
                        </button>
                        <button type="button" disabled={!service.serviceKey} onClick={() => openServiceEditor(service)}>
                          {t.edit}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="admin" />
            <h2>{t.systemJobsGlobalSyncTitle}</h2>
          </div>
          <p className="system-section-copy">{t.systemJobsGlobalSyncCopy}</p>
          <div className="sync-action-grid">
            {syncButtons.map((button) => (
              <button
                type="button"
                key={button.mode}
                disabled={Boolean(activeGlobalSyncMode)}
                onClick={() => runGlobalSync(button.mode)}
              >
                {activeGlobalSyncMode === button.mode ? <LoadingSpinner /> : <MenuIcon name="admin" />}
                <strong>{button.label}</strong>
                <span>{button.copy}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="tournaments" />
            <h2>{t.systemJobsRecentTitle}</h2>
          </div>
          <div className="tournament-table-shell system-runs-table-shell">
            <table className="tournament-table system-runs-table">
              <thead>
                <tr>
                  <th>{t.mode}</th>
                  <th>{t.tournamentName}</th>
                  <th>{t.status}</th>
                  <th>{t.started}</th>
                  <th>{t.finished}</th>
                  <th>{t.inserted}</th>
                  <th>{t.updatedRows}</th>
                  <th>{t.unchanged}</th>
                  <th>{t.error}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoadingRuns && recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.mode}</td>
                    <td><strong>{run.tournamentName}</strong></td>
                    <td>{run.status}</td>
                    <td>{formatDate(run.startedAtUtc, '-')}</td>
                    <td>{formatDate(run.finishedAtUtc, '-')}</td>
                    <td>{run.insertedMatches}</td>
                    <td>{run.updatedMatches}</td>
                    <td>{run.unchangedMatches}</td>
                    <td>{run.errorMessage || '-'}</td>
                  </tr>
                ))}
                {!isLoadingRuns && recentRuns.length === 0 && (
                  <tr>
                    <td colSpan={9}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editingService && (
          <SystemServiceModal
            t={t}
            service={editingService}
            interval={editedInterval}
            onHold={editedOnHold}
            isSaving={isSavingService}
            onIntervalChange={setEditedInterval}
            onHoldChange={setEditedOnHold}
            onCancel={() => setEditingService(null)}
            onSave={saveServiceEditor}
          />
        )}

        {healthService && (
          <SystemServiceHealthModal
            t={t}
            service={healthService}
            health={getServiceHealth(healthService)}
            isLoading={isLoadingHealth}
            onCancel={() => setHealthService(null)}
          />
        )}
      </div>
    </section>
  )
}

export function DataQualityPanel({
  t,
  user,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const checkIcons: MenuIconName[] = ['tournaments', 'matches', 'admin', 'ratings', 'teams', 'predictions']
  const [checks, setChecks] = useState<DataQualityTournamentCheck[]>([])
  const [selectedCheck, setSelectedCheck] = useState<(typeof t.dataQualityChecks)[number] | null>(null)
  const [selectedCheckIssues, setSelectedCheckIssues] = useState<DataQualityIssue[]>([])
  const [isLoadingIssues, setIsLoadingIssues] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadChecks = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchDataQualityChecks(user.token)

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setChecks(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [onToast, t.genericError, user.token])

  useEffect(() => {
    loadChecks()
  }, [loadChecks])

  const getStatusLabel = (status: string) => {
    if (status === 'Healthy') {
      return t.dataQualityStatusHealthy
    }

    if (status === 'Critical') {
      return t.dataQualityStatusCritical
    }

    return t.dataQualityStatusReview
  }

  const openIssuesModal = async (metadata: (typeof t.dataQualityChecks)[number]) => {
    setSelectedCheck(metadata)
    setSelectedCheckIssues([])
    setIsLoadingIssues(true)

    try {
      const result = await fetchDataQualityIssues(user.token, metadata.key)

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setSelectedCheckIssues(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsLoadingIssues(false)
    }
  }

  const refreshSelectedIssues = async () => {
    if (!selectedCheck) {
      return
    }

    await openIssuesModal(selectedCheck)
    await loadChecks()
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content data-quality-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.dataQualityPanelEyebrow}</p>
          <h1>{t.dataQualityPanelTitle}</h1>
          <p>{t.dataQualityPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="data-quality-live-checks">
          <div className="data-quality-check-grid">
            {t.dataQualityChecks.map((metadata, index) => {
              const liveCheck = checks.find((check) => check.key === metadata.key)
              const status = liveCheck?.status ?? 'Healthy'

              return (
              <button
                type="button"
                className="data-quality-check-card"
                key={metadata.key}
                onClick={() => openIssuesModal(metadata)}
              >
                <div className="data-quality-check-head">
                  <MenuIcon name={checkIcons[index]} />
                  <div className="data-quality-check-title-row">
                    <h3>{metadata.title}</h3>
                    <p>{metadata.copy}</p>
                  </div>
                </div>
                <div className="data-quality-check-live">
                  <strong className={`quality-status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {getStatusLabel(status)}
                  </strong>
                  <dl>
                    <div>
                      <dt>{t.dataQualityIssuesFound}</dt>
                      <dd>{liveCheck?.issueCount ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>{t.dataQualityCheckedRecords}</dt>
                      <dd>{liveCheck?.checkedCount ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>{t.dataQualityLastSample}</dt>
                      <dd>{liveCheck?.lastSampleUtc ? formatDate(liveCheck.lastSampleUtc, t.dataQualityNoSample) : t.dataQualityNoSample}</dd>
                    </div>
                  </dl>
                </div>
              </button>
            )})}
          </div>
        </section>

        {selectedCheck && (
          <DataQualityIssuesModal
            t={t}
            check={selectedCheck}
            issues={selectedCheckIssues}
            isLoading={isLoadingIssues}
            user={user}
            onToast={onToast}
            onCancel={() => setSelectedCheck(null)}
            onAccepted={refreshSelectedIssues}
          />
        )}
      </div>
    </section>
  )
}

export function DataQualityIssuesModal({
  t,
  check,
  issues,
  isLoading,
  user,
  onToast,
  onCancel,
  onAccepted,
}: {
  t: (typeof translations)[Language]
  check: (typeof t.dataQualityChecks)[number]
  issues: DataQualityIssue[]
  isLoading: boolean
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onCancel: () => void
  onAccepted: () => Promise<void>
}) {
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAccepting) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAccepting, onCancel])

  const acceptVisibleIssues = async () => {
    if (issues.length === 0 || isAccepting) {
      return
    }

    setIsAccepting(true)
    try {
      const result = await acceptDataQualityIssues(user.token, check.key, {
        note: t.dataQualityAcceptCopy,
        issues: issues.map((issue) => ({
          key: issue.key,
          entityType: issue.entityType,
          entityId: issue.entityId,
          issue: issue.issue,
        })),
      })

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      await onAccepted()
      onToast(t.dataQualityAccepted, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsAccepting(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isAccepting && onCancel()}>
      <section
        className="delete-modal data-quality-issues-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-quality-issues-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="admin" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.dataQualityProblems}</p>
          <h2 id="data-quality-issues-title">{check.title}</h2>
          <p>{check.copy}</p>
          {issues.length > 0 && !isLoading && (
            <p className="data-quality-accept-copy">{t.dataQualityAcceptCopy}</p>
          )}
        </div>

        {(isLoading || isAccepting) ? (
          <div className="modal-loading-block">
            <LoadingSpinner />
            <strong>{isAccepting ? t.dataQualityAcceptVisible : t.loading}</strong>
          </div>
        ) : issues.length > 0 ? (
          <div className="tournament-table-shell compact-table-shell data-quality-issues-table-shell">
            <table className="tournament-table data-quality-issues-table">
              <thead>
                <tr>
                  <th>{t.dataQualitySeverity}</th>
                  <th>{t.dataQualityTournament}</th>
                  <th>{t.dataQualityEntity}</th>
                  <th>{t.dataQualityProblem}</th>
                  <th>{t.dataQualitySample}</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <tr key={`${issue.key}-${issue.entityId ?? issue.entityLabel}-${index}`}>
                    <td>
                      <span className={`quality-severity-pill ${issue.severity.toLowerCase()}`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td>{issue.tournamentName}</td>
                    <td>
                      <strong>{issue.entityLabel}</strong>
                      <span>{issue.entityType}{issue.entityId ? ` #${issue.entityId}` : ''}</span>
                    </td>
                    <td>{issue.issue}</td>
                    <td>{issue.sampleUtc ? formatDate(issue.sampleUtc, t.dataQualityNoSample) : t.dataQualityNoSample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="delete-modal-target">
            <strong>{t.dataQualityNoProblems}</strong>
          </div>
        )}

        <div className={`delete-modal-actions ${issues.length > 0 && !isLoading ? '' : 'single'}`}>
          <button type="button" disabled={isAccepting} onClick={onCancel}>
            {t.cancel}
          </button>
          {issues.length > 0 && !isLoading && (
            <button type="button" disabled={isAccepting} onClick={acceptVisibleIssues}>
              {t.dataQualityAcceptVisible}
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function SystemServiceModal({
  t,
  service,
  interval,
  onHold,
  isSaving,
  onIntervalChange,
  onHoldChange,
  onCancel,
  onSave,
}: {
  t: (typeof translations)[Language]
  service: SystemJobService
  interval: string
  onHold: boolean
  isSaving: boolean
  onIntervalChange: (value: string) => void
  onHoldChange: (value: boolean) => void
  onCancel: () => void
  onSave: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal system-service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-service-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="matches" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.systemJobsEditService}</p>
          <h2 id="system-service-title">{service.title}</h2>
          <p>{service.copy}</p>
          <div className="delete-modal-target">
            <strong>{service.cadence}</strong>
            <span>{t.systemJobsNextRun}: {service.nextRun}</span>
          </div>
        </div>
        <div className="system-service-form">
          <label className="form-field">
            <span>{t.systemJobsInterval}</span>
            <input
              type="number"
              min="1"
              value={interval}
              disabled={isSaving}
              onChange={(event) => onIntervalChange(event.target.value)}
            />
          </label>
          <label className="system-service-toggle">
            <input
              type="checkbox"
              checked={onHold}
              disabled={isSaving}
              onChange={(event) => onHoldChange(event.target.checked)}
            />
            <span>{t.systemJobsHoldService}</span>
          </label>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="button" disabled={isSaving} onClick={onSave}>
            {isSaving ? '...' : t.systemJobsSaveService}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function SystemServiceHealthModal({
  t,
  service,
  health,
  isLoading,
  onCancel,
}: {
  t: (typeof translations)[Language]
  service: SystemJobService
  health?: SyncServiceHealth
  isLoading: boolean
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal system-health-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-health-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="ratings" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.systemJobsHealthTitle}</p>
          <h2 id="system-health-title">{service.title}</h2>
          <p>{service.copy}</p>
        </div>

        {isLoading && (
          <div className="system-health-card loading">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && health && (
          <article className="system-health-card modal-health-card">
            <div className="system-health-card-heading">
              <MenuIcon name="matches" />
              <div>
                <span>{health.mode || service.title}</span>
                <strong>{health.status}</strong>
              </div>
            </div>
            <dl>
              <div><dt>{t.systemJobsInterval}</dt><dd>{formatMinutes(health.intervalMinutes)}</dd></div>
              <div><dt>{t.systemJobsLastRun}</dt><dd>{formatDate(health.lastRunUtc, '-')}</dd></div>
              <div><dt>{t.systemJobsLastSuccess}</dt><dd>{formatDate(health.lastSuccessUtc, '-')}</dd></div>
              <div><dt>{t.systemJobsLastFailure}</dt><dd>{formatDate(health.lastFailureUtc, '-')}</dd></div>
              <div><dt>{t.systemJobsEligibleTournaments}</dt><dd>{health.eligibleTournamentCount} / {health.activeTournamentCount}</dd></div>
              <div><dt>{t.systemJobsRuns24h}</dt><dd>{health.runsLast24Hours}</dd></div>
              <div><dt>{t.systemJobsFailures24h}</dt><dd>{health.failuresLast24Hours}</dd></div>
              <div><dt>{t.error}</dt><dd>{health.lastError || '-'}</dd></div>
            </dl>
            <small>{health.notes}</small>
          </article>
        )}

        {!isLoading && !health && (
          <div className="delete-modal-target">
            <strong>-</strong>
            <span>{t.genericError}</span>
          </div>
        )}

        <div className="delete-modal-actions single">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function UsersAccessPanel({
  t,
  user,
  language,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  language: Language
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null)
  const [actionUser, setActionUser] = useState<AdminUser | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'locked'>('all')
  const [sortKey, setSortKey] = useState<UserSortKey>('email')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      setIsLoading(true)
      try {
        const result = await fetchAdminUsers(user.token)

        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        setUsers(result.data)
      } catch {
        if (isMounted) {
          onToast(t.genericError, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [t, user.token])

  const userStatusKey = (adminUser: AdminUser): 'active' | 'pending' | 'locked' => {
    if (adminUser.isLockedOut) {
      return 'locked'
    }

    if (!adminUser.emailConfirmed) {
      return 'pending'
    }

    return 'active'
  }

  const userStatus = (adminUser: AdminUser) => {
    const key = userStatusKey(adminUser)

    if (key === 'locked') {
      return { className: key, label: t.accessLocked }
    }

    if (key === 'pending') {
      return { className: key, label: t.accessPending }
    }

    return { className: key, label: t.accessActive }
  }

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users
      .filter((adminUser) => {
        const statusKey = userStatusKey(adminUser)

        if (statusFilter !== 'all' && statusKey !== statusFilter) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const searchable = [
          adminUser.email,
          adminUser.displayName || '',
          adminUser.roles.join(', '),
          userStatus(adminUser).label,
        ].join(' ').toLowerCase()

        return searchable.includes(normalizedSearch)
      })
      .sort((left, right) => {
        let comparison = 0

        if (sortKey === 'email') {
          comparison = compareText(left.email, right.email)
        } else if (sortKey === 'displayName') {
          comparison = compareText(left.displayName || '', right.displayName || '')
        } else if (sortKey === 'role') {
          comparison = compareText(left.roles.join(', '), right.roles.join(', '))
        } else if (sortKey === 'status') {
          comparison = compareText(userStatus(left).label, userStatus(right).label)
        } else {
          comparison = new Date(left.memberSinceUtc).getTime() - new Date(right.memberSinceUtc).getTime()
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
  }, [search, sortDirection, sortKey, statusFilter, t, users])

  const requestUserSort = (key: UserSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const userHeaders: Array<{ key: UserSortKey; label: string }> = [
    { key: 'email', label: t.userEmail },
    { key: 'displayName', label: t.userDisplayName },
    { key: 'role', label: t.userRole },
    { key: 'status', label: t.userStatus },
    { key: 'memberSince', label: t.memberSince },
  ]

  const toggleUserSuspension = async (target: AdminUser) => {
    const nextIsLockedOut = !target.isLockedOut
    setProcessingUserId(target.id)

    try {
      const result = await updateUserLock(user.token, target.id, nextIsLockedOut)

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setUsers((current) => current.map((adminUser) => adminUser.id === target.id
        ? { ...adminUser, isLockedOut: nextIsLockedOut }
        : adminUser))
      setActionUser(null)
      onToast(nextIsLockedOut ? t.userSuspendSuccess : t.userUnsuspendSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  const deleteUser = async (target: AdminUser) => {
    setProcessingUserId(target.id)

    try {
      const result = await deleteAdminUser(user.token, target.id)

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setUsers((current) => current.filter((adminUser) => adminUser.id !== target.id))
      setActionUser(null)
      onToast(t.userDeleteSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  const changeUserRole = async (target: AdminUser, role: string) => {
    setProcessingUserId(target.id)

    try {
      const result = await updateUserRole(user.token, target.id, {
        role,
        language,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setUsers((current) => current.map((adminUser) => adminUser.id === target.id ? result.data! : adminUser))
      setActionUser(result.data)
      onToast(t.userRoleChangeSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  const resendConfirmation = async (target: AdminUser) => {
    setProcessingUserId(target.id)

    try {
      const result = await resendUserConfirmation(user.token, target.id, { language })

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(t.userConfirmationResent, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setProcessingUserId(null)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content users-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.usersPanelEyebrow}</p>
          <h1>{t.usersPanelTitle}</h1>
          <p>{t.usersPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <div className="tournament-toolbar user-toolbar">
          <label className="tournament-search compact">
            <span>{t.userSearch}</span>
            <input
              type="search"
              value={search}
              placeholder={t.userSearchPlaceholder}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="tournament-filter user-filter" aria-label={t.userStatus}>
            {([
              ['all', t.userFilterAll],
              ['active', t.userFilterActive],
              ['pending', t.userFilterPending],
              ['locked', t.userFilterLocked],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={statusFilter === key ? 'active' : ''}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="details-panel">
          <div className="details-panel-heading">
            <MenuIcon name="profile" />
            <h2>{t.usersDirectoryTitle}</h2>
          </div>
          <div className="tournament-table-shell users-table-shell">
            <table className="tournament-table users-table">
              <thead>
                <tr>
                  {userHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestUserSort(header.key)}
                      >
                        <span>{header.label}</span>
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.userActions}</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && visibleUsers.map((adminUser) => {
                  const status = userStatus(adminUser)
                  return (
                  <tr key={adminUser.id}>
                    <td>
                      <strong>{adminUser.email}</strong>
                    </td>
                    <td>{adminUser.displayName || '-'}</td>
                    <td>
                      <span className="access-role-pill">{adminUser.roles.join(', ') || '-'}</span>
                    </td>
                    <td>
                      <span className={`access-status-pill ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>{formatDate(adminUser.memberSinceUtc, '-')}</td>
                    <td>
                      <div className="user-action-row">
                        <button type="button" onClick={() => setDetailsUser(adminUser)}>
                          {t.details}
                        </button>
                        <button type="button" disabled={processingUserId === adminUser.id} onClick={() => setActionUser(adminUser)}>
                          {t.actions}
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {!isLoading && visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={6}>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {detailsUser && (
          <UserDetailsModal
            t={t}
            user={detailsUser}
            status={userStatus(detailsUser).label}
            onCancel={() => setDetailsUser(null)}
          />
        )}

        {actionUser && (
          <UserActionsModal
            t={t}
            user={actionUser}
            currentUserEmail={user.email}
            isProcessing={processingUserId === actionUser.id}
            onCancel={() => setActionUser(null)}
            onChangeRole={(role) => changeUserRole(actionUser, role)}
            onResendConfirmation={() => resendConfirmation(actionUser)}
            onToggleSuspension={() => toggleUserSuspension(actionUser)}
            onDelete={() => deleteUser(actionUser)}
          />
        )}
      </div>
    </section>
  )
}

export function SquadsPanel({
  t,
  user,
  onToast,
  onBack,
  onEdit,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
  onEdit: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [squadFilter, setSquadFilter] = useState<'all' | 'unlinked' | 'missing-snapshots'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [bulkImportingTournamentId, setBulkImportingTournamentId] = useState<number | null>(null)
  const [coverageByTournamentId, setCoverageByTournamentId] = useState<Record<number, SquadTournamentCoverage>>({})
  const [sortKey, setSortKey] = useState<SquadTournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const toCoverageMap = (items: TournamentSquadCoverageResponse[]) => Object.fromEntries(
    items.map((item) => [
      item.tournamentId,
      {
        tournamentId: item.tournamentId,
        teamCount: item.teamCount,
        linkedTeams: item.transfermarktMappedTeams,
        snapshotTeams: item.snapshotTeams,
        lastSnapshotUtc: item.lastSnapshotUtc,
      },
    ]),
  )

  const getTournamentCoverage = async (tournament: TournamentSummary): Promise<SquadTournamentCoverage> => {
    const teamsResult = await fetchTournamentTeams(user.token, tournament.id)

    if (!teamsResult.ok || !teamsResult.data) {
      return {
        linkedTeams: 0,
        snapshotTeams: 0,
        lastSnapshotUtc: null,
      }
    }

    const teamStates = await Promise.all(teamsResult.data.map(async (team) => {
      const [mappingsResult, snapshotResult] = await Promise.all([
        fetchExternalTeamMappings(user.token, team.id),
        fetchLatestSquadSnapshot(user.token, team.id),
      ])

      return {
        hasMapping: Boolean(mappingsResult.data?.some((mapping) => mapping.provider.toLowerCase() === 'transfermarkt')),
        snapshot: snapshotResult.ok ? snapshotResult.data : undefined,
      }
    }))

    const snapshots = teamStates
      .map((state) => state.snapshot?.fetchedAtUtc)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

    return {
      linkedTeams: teamStates.filter((state) => state.hasMapping).length,
      snapshotTeams: teamStates.filter((state) => Boolean(state.snapshot)).length,
      lastSnapshotUtc: snapshots[0] ?? null,
    }
  }

  const refreshTournamentCoverage = async (tournament: TournamentSummary) => {
    const coverage = await getTournamentCoverage(tournament)

    setCoverageByTournamentId((current) => ({
      ...current,
      [tournament.id]: coverage,
    }))
  }

  useEffect(() => {
    let isMounted = true

    async function loadTournamentsWithCoverage() {
      setIsLoading(true)
      try {
        const [tournamentsResult, coverageResult] = await Promise.all([
          fetchTournaments(user.token),
          fetchTournamentSquadCoverage(user.token),
        ])

        if (!isMounted) {
          return
        }

        if (!tournamentsResult.ok || !tournamentsResult.data) {
          onToast(tournamentsResult.message || t.squadLoadFailed, 'error')
          return
        }

        if (!coverageResult.ok || !coverageResult.data) {
          onToast(coverageResult.message || t.squadLoadFailed, 'error')
          return
        }

        setTournaments(tournamentsResult.data)
        setCoverageByTournamentId(toCoverageMap(coverageResult.data))
      } catch {
        if (isMounted) {
          onToast(t.squadLoadFailed, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTournamentsWithCoverage()

    return () => {
      isMounted = false
    }
  }, [t, user.token])

  const sortedTournaments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const filtered = tournaments
      .filter((tournament) => {
        const matchesSearch = !normalizedSearch ||
          [
          tournament.name,
          tournament.season,
          tournament.competitionName,
          tournament.competitionCountry,
          ].some((value) => value.toLowerCase().includes(normalizedSearch))

        const coverage = coverageByTournamentId[tournament.id]
        const hasMissingSquadLinks = tournament.teamCount > 0 && (coverage?.linkedTeams ?? 0) < tournament.teamCount
        const hasMissingSnapshot = tournament.teamCount > 0 && (coverage?.snapshotTeams ?? 0) < tournament.teamCount

        const matchesFilter =
          squadFilter === 'all' ||
          (squadFilter === 'unlinked' && hasMissingSquadLinks) ||
          (squadFilter === 'missing-snapshots' && hasMissingSnapshot)

        return matchesSearch && matchesFilter
      })

    return filtered.sort((left, right) => {
      const leftCoverage = coverageByTournamentId[left.id]
      const rightCoverage = coverageByTournamentId[right.id]
      let comparison = 0

      if (sortKey === 'name') {
        comparison = compareText(left.name, right.name)
      } else if (sortKey === 'season') {
        comparison = compareText(left.season || '', right.season || '')
      } else if (sortKey === 'teams') {
        comparison = left.teamCount - right.teamCount
      } else if (sortKey === 'coverage') {
        comparison = (leftCoverage?.linkedTeams ?? 0) - (rightCoverage?.linkedTeams ?? 0)
      } else if (sortKey === 'snapshot') {
        comparison = new Date(leftCoverage?.lastSnapshotUtc ?? 0).getTime() - new Date(rightCoverage?.lastSnapshotUtc ?? 0).getTime()
      }

      if (comparison === 0) {
        comparison = compareText(left.name, right.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [coverageByTournamentId, search, sortDirection, sortKey, squadFilter, tournaments])

  const requestSort = (key: SquadTournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'coverage' || key === 'snapshot' ? 'desc' : 'asc')
  }

  const squadTournamentHeaders: Array<{ key: SquadTournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'teams', label: t.squadTeamCount },
    { key: 'coverage', label: t.squadCoverage },
    { key: 'snapshot', label: t.squadLastImport },
  ]

  const importTournamentSnapshots = async (tournament: TournamentSummary) => {
    setBulkImportingTournamentId(tournament.id)
    let completionToast: { message: string; tone: ToastTone } | null = null
    try {
      const teamsResult = await fetchTournamentTeams(user.token, tournament.id)

      if (!teamsResult.ok || !teamsResult.data) {
        completionToast = { message: teamsResult.message || t.squadTeamLoadFailed, tone: 'error' }
        return
      }

      const rows = await Promise.all(teamsResult.data.map(async (team) => {
        const mappingsResult = await fetchExternalTeamMappings(user.token, team.id)
        return {
          team,
          mapping: mappingsResult.data?.find((mapping) => mapping.provider.toLowerCase() === 'transfermarkt'),
        }
      }))

      const mappedRows = rows.filter((row): row is { team: TeamSummary; mapping: ExternalTeamMapping } => Boolean(row.mapping))

      if (mappedRows.length === 0) {
        completionToast = { message: t.squadBulkImportNoMappings, tone: 'info' }
        return
      }

      const results = await Promise.all(mappedRows.map((row) => importTransfermarktSquad(
        user.token,
        row.team.id,
        {
          transfermarktUrl: row.mapping.sourceUrl,
          season: tournament.season || null,
        },
      )))

      const failedCount = results.filter((result) => !result.ok).length

      if (failedCount > 0) {
        await refreshTournamentCoverage(tournament)
        completionToast = { message: `${t.squadBulkImportSuccess} ${mappedRows.length - failedCount}/${mappedRows.length}`, tone: 'error' }
        return
      }

      await refreshTournamentCoverage(tournament)
      completionToast = { message: `${t.squadBulkImportSuccess} ${mappedRows.length}/${mappedRows.length}`, tone: 'success' }
    } catch {
      completionToast = { message: t.squadImportFailed, tone: 'error' }
    } finally {
      setBulkImportingTournamentId(null)
      if (completionToast) {
        const nextToast = completionToast
        window.setTimeout(() => onToast(nextToast.message, nextToast.tone), 0)
      }
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content squads-panel tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.squadsPanelEyebrow}</p>
          <h1>{t.squadsPanelTitle}</h1>
          <p>{t.squadsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        <section className="details-panel squads-management-panel">
          <div className="details-panel-heading">
            <MenuIcon name="teams" />
            <h2>{t.adminSquadOps}</h2>
          </div>

          <div className="tournament-toolbar squad-toolbar">
            <label className="tournament-search compact">
              <span>{t.tournamentSearch}</span>
              <input
                placeholder={t.tournamentSearchPlaceholder}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="tournament-filter squad-filter" aria-label={t.squadCoverage}>
              {[
                ['all', t.squadFilterAll],
                ['unlinked', t.squadFilterUnlinked],
                ['missing-snapshots', t.squadFilterMissingSnapshots],
              ].map(([value, label]) => (
                <button
                  className={squadFilter === value ? 'active' : ''}
                  type="button"
                  key={value}
                  onClick={() => setSquadFilter(value as 'all' | 'unlinked' | 'missing-snapshots')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {bulkImportingTournamentId !== null && (
          <FullPageProcessingOverlay label={t.importRunning} />
        )}

          <div className="tournament-table-shell">
          {!isLoading && (
            <table className="tournament-table squads-table">
              <thead>
                <tr>
                  {squadTournamentHeaders.map((header) => (
                    <th key={header.key}>
                      <button
                        type="button"
                        className="table-sort-button"
                        aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={() => requestSort(header.key)}
                      >
                        {header.label}
                        <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                      </button>
                    </th>
                  ))}
                  <th>{t.squadActions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td>
                      <strong>{tournament.name}</strong>
                      <small>{tournament.competitionCountry || tournament.competitionName}</small>
                    </td>
                    <td>{tournament.season || '-'}</td>
                    <td>{tournament.teamCount}</td>
                    <td>
                      <span className={`squad-coverage-pill ${(coverageByTournamentId[tournament.id]?.linkedTeams ?? 0) >= tournament.teamCount && tournament.teamCount > 0 ? 'linked' : 'missing'}`}>
                        {tournament.teamCount > 0 ? `${coverageByTournamentId[tournament.id]?.linkedTeams ?? 0} / ${tournament.teamCount}` : '-'}
                      </span>
                    </td>
                    <td>{formatDate(coverageByTournamentId[tournament.id]?.lastSnapshotUtc, t.notImported)}</td>
                    <td>
                      <div className="squad-action-row">
                        <button type="button" onClick={() => onEdit(tournament.id)}>
                          {t.editSquads}
                        </button>
                        <button
                          type="button"
                          disabled={bulkImportingTournamentId === tournament.id}
                          onClick={() => importTournamentSnapshots(tournament)}
                        >
                          {t.importSnapshot}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedTournaments.length === 0 && (
                  <tr>
                    <td colSpan={6}>{t.noSquadTournaments}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          </div>
        </section>
      </div>
    </section>
  )
}

export function SquadDetailsPanel({
  t,
  user,
  tournamentId,
  onToast,
  onBack,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: string
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [squadRows, setSquadRows] = useState<SquadTeamRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [importingTeamId, setImportingTeamId] = useState<number | null>(null)
  const [squadEditCandidate, setSquadEditCandidate] = useState<SquadTeamRow | null>(null)
  const [sortKey, setSortKey] = useState<SquadTeamSortKey>('team')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let isMounted = true

    async function loadSquadDetails() {
      setIsLoading(true)
      try {
        const tournamentResult = await fetchTournamentDetails(user.token, Number(tournamentId))

        if (!isMounted) {
          return
        }

        if (!tournamentResult.ok || !tournamentResult.data) {
          onToast(tournamentResult.message || t.squadTeamLoadFailed, 'error')
          return
        }

        const nextTournament = tournamentResult.data
        const rows = await Promise.all(nextTournament.teams.map(async (team) => {
          const [mappingsResult, snapshotResult] = await Promise.all([
            fetchExternalTeamMappings(user.token, team.id),
            fetchLatestSquadSnapshot(user.token, team.id),
          ])

          return {
            team,
            mapping: mappingsResult.data?.find((mapping) => mapping.provider.toLowerCase() === 'transfermarkt'),
            snapshot: snapshotResult.ok ? snapshotResult.data : undefined,
          }
        }))

        if (isMounted) {
          setTournament(nextTournament)
          setSquadRows(rows)
        }
      } catch {
        if (isMounted) {
          onToast(t.squadTeamLoadFailed, 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSquadDetails()

    return () => {
      isMounted = false
    }
  }, [t, tournamentId, user.token])

  const importSnapshot = async (row: SquadTeamRow, transfermarktUrl?: string) => {
    const url = transfermarktUrl?.trim() || row.mapping?.sourceUrl

    if (!url) {
      setSquadEditCandidate(row)
      return
    }

    setImportingTeamId(row.team.id)
    let completionToast: { message: string; tone: ToastTone } | null = null
    try {
      const result = await importTransfermarktSquad(user.token, row.team.id, {
        transfermarktUrl: url,
        season: tournament?.season || null,
      })

      if (!result.ok || !result.data) {
        completionToast = { message: result.message || t.squadImportFailed, tone: 'error' }
        return
      }

      const imported = result.data
      setSquadRows((current) => current.map((item) => item.team.id === row.team.id
        ? {
            ...item,
            mapping: {
              id: imported.mappingId,
              teamId: imported.teamId,
              teamName: imported.teamName,
              provider: 'Transfermarkt',
              externalTeamId: imported.externalTeamId,
              externalSlug: imported.externalSlug,
              sourceUrl: imported.sourceUrl,
              createdAtUtc: new Date().toISOString(),
              updatedAtUtc: new Date().toISOString(),
            },
            snapshot: {
              id: imported.snapshotId,
              teamId: imported.teamId,
              teamName: imported.teamName,
              teamAbbreviation: item.team.abbreviation,
              provider: 'Transfermarkt',
              externalTeamId: imported.externalTeamId,
              externalSlug: imported.externalSlug,
              sourceUrl: imported.sourceUrl,
              season: imported.season,
              fetchedAtUtc: new Date().toISOString(),
              clubName: imported.clubName,
              playerCount: imported.playerCount,
              totalMarketValueEur: imported.totalMarketValueEur,
              topElevenMarketValueEur: imported.topElevenMarketValueEur,
              topFifteenMarketValueEur: imported.topFifteenMarketValueEur,
            },
          }
        : item))
      setSquadEditCandidate(null)
      completionToast = { message: t.squadImportSuccess, tone: 'success' }
    } catch {
      completionToast = { message: t.squadImportFailed, tone: 'error' }
    } finally {
      setImportingTeamId(null)
      if (completionToast) {
        const nextToast = completionToast
        window.setTimeout(() => onToast(nextToast.message, nextToast.tone), 0)
      }
    }
  }

  const requestSort = (key: SquadTeamSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection(key === 'value' ? 'desc' : 'asc')
  }

  const sortedSquadRows = useMemo(() => {
    return [...squadRows].sort((left, right) => {
      let comparison = 0
      if (sortKey === 'team') {
        comparison = compareText(left.team.name, right.team.name)
      } else if (sortKey === 'value') {
        comparison = (left.snapshot?.totalMarketValueEur ?? -1) - (right.snapshot?.totalMarketValueEur ?? -1)
      } else if (sortKey === 'mapping') {
        comparison = Number(Boolean(left.mapping)) - Number(Boolean(right.mapping))
      } else if (sortKey === 'snapshot') {
        comparison = new Date(left.snapshot?.fetchedAtUtc ?? 0).getTime() - new Date(right.snapshot?.fetchedAtUtc ?? 0).getTime()
      }

      if (comparison === 0) {
        comparison = compareText(left.team.name, right.team.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [sortDirection, sortKey, squadRows])

  const squadHeaders: Array<{ key: SquadTeamSortKey; label: string }> = [
    { key: 'team', label: t.teamName },
    { key: 'value', label: t.totalTeamValue },
    { key: 'mapping', label: t.transfermarktMapping },
    { key: 'snapshot', label: t.latestSnapshot },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content squads-panel tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.squadsPanelEyebrow}</p>
          <h1>{t.squadTeamsTitle}</h1>
          <p>{t.squadTeamsCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToSquads}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        {!isLoading && tournament ? (
          <section className="details-panel squad-team-panel">
            {importingTeamId !== null && (
              <FullPageProcessingOverlay label={t.importRunning} />
            )}
            <div className="details-panel-heading">
              <MenuIcon name="teams" />
              <h2>{tournament.name}</h2>
            </div>
            <p>{tournament.season}</p>

            <div className="tournament-table-shell squad-team-table-shell">
              <table className="tournament-table squads-table squad-team-table">
                <thead>
                  <tr>
                    {squadHeaders.map((header) => (
                      <th key={header.key}>
                        <button
                          type="button"
                          className="table-sort-button"
                          aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                          onClick={() => requestSort(header.key)}
                        >
                          <span>{header.label}</span>
                          <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                        </button>
                      </th>
                    ))}
                    <th>{t.squadActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSquadRows.map((row) => (
                    <tr key={row.team.id}>
                      <td>
                        <strong>{row.team.name}</strong>
                        <small>{row.team.abbreviation || '-'}</small>
                      </td>
                      <td>
                        <strong>{formatEuroValue(row.snapshot?.totalMarketValueEur, t.notImported)}</strong>
                        {row.snapshot?.topElevenMarketValueEur !== null && row.snapshot?.topElevenMarketValueEur !== undefined && (
                          <small>Top XI {formatEuroValue(row.snapshot.topElevenMarketValueEur)}</small>
                        )}
                      </td>
                      <td>
                        <span className={`squad-coverage-pill ${row.mapping ? 'linked' : 'missing'}`}>
                          {row.mapping ? t.linked : t.notLinked}
                        </span>
                      </td>
                      <td>
                        <strong>{row.snapshot ? formatDate(row.snapshot.fetchedAtUtc, t.notImported) : t.notImported}</strong>
                        {row.snapshot && (
                          <small>{row.snapshot.playerCount} players</small>
                        )}
                      </td>
                      <td>
                        <div className="squad-action-row">
                          <button type="button" disabled={importingTeamId === row.team.id} onClick={() => setSquadEditCandidate(row)}>
                            {t.edit}
                          </button>
                          <button type="button" disabled={importingTeamId === row.team.id} onClick={() => importSnapshot(row)}>
                            {t.importSnapshot}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {squadEditCandidate && tournament && (
          <EditSquadMappingModal
            t={t}
            row={squadEditCandidate}
            tournament={tournament}
            isSaving={importingTeamId === squadEditCandidate.team.id}
            onCancel={() => setSquadEditCandidate(null)}
            onImport={(url) => importSnapshot(squadEditCandidate, url)}
            onToast={onToast}
          />
        )}
      </div>
    </section>
  )
}

export function UserDetailsModal({
  t,
  user,
  status,
  onCancel,
}: {
  t: (typeof translations)[Language]
  user: AdminUser
  status: string
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="profile" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.details}</p>
          <h2 id="user-details-title">{t.userDetailsTitle}</h2>
          <p>{t.userDetailsCopy}</p>
          <div className="user-detail-grid">
            <div><span>{t.userEmail}</span><strong>{user.email}</strong></div>
            <div><span>{t.userDisplayName}</span><strong>{user.displayName || '-'}</strong></div>
            <div><span>{t.userRole}</span><strong>{user.roles.join(', ') || '-'}</strong></div>
            <div><span>{t.userStatus}</span><strong>{status}</strong></div>
            <div><span>{t.memberSince}</span><strong>{formatDate(user.memberSinceUtc, '-')}</strong></div>
            <div><span>{t.emailConfirmed}</span><strong>{user.emailConfirmed ? t.yes : t.no}</strong></div>
          </div>
        </div>
        <div className="delete-modal-actions single">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function UserActionsModal({
  t,
  user,
  currentUserEmail,
  isProcessing,
  onCancel,
  onChangeRole,
  onResendConfirmation,
  onToggleSuspension,
  onDelete,
}: {
  t: (typeof translations)[Language]
  user: AdminUser
  currentUserEmail: string
  isProcessing: boolean
  onCancel: () => void
  onChangeRole: (role: string) => void
  onResendConfirmation: () => void
  onToggleSuspension: () => void
  onDelete: () => void
}) {
  const [role, setRole] = useState(user.roles.includes('Admin') ? 'Admin' : 'User')
  const [confirmAction, setConfirmAction] = useState<'access' | 'delete' | null>(null)
  const isCurrentUser = user.email.toLowerCase() === currentUserEmail.toLowerCase()

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isProcessing, onCancel])

  const confirmedActionLabel = confirmAction === 'delete'
    ? t.delete
    : user.isLockedOut ? t.unsuspend : t.suspend

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isProcessing && onCancel()}>
      <section
        className="delete-modal user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-actions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="profile" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.actions}</p>
          <h2 id="user-actions-title">{t.adminUserActionsTitle}</h2>
          <p>{t.adminUserActionsCopy}</p>
          <div className="delete-modal-target">
            <strong>{user.email}</strong>
            <span>{user.displayName || '-'}</span>
          </div>
        </div>

        <div className="user-actions-grid">
          <label className="form-field">
            <span>{t.userRole}</span>
            <select value={role} disabled={isProcessing} onChange={(event) => setRole(event.target.value)}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <button type="button" disabled={isProcessing || user.roles.includes(role)} onClick={() => onChangeRole(role)}>
            {t.changeRole}
          </button>
          <button type="button" disabled={isProcessing || user.emailConfirmed} onClick={onResendConfirmation}>
            {t.resendConfirmation}
          </button>
          <button type="button" disabled={isProcessing || isCurrentUser} onClick={() => setConfirmAction('access')}>
            {user.isLockedOut ? t.unsuspend : t.suspend}
          </button>
          <button className="danger" type="button" disabled={isProcessing || isCurrentUser} onClick={() => setConfirmAction('delete')}>
            {t.delete}
          </button>
        </div>

        {confirmAction && (
          <div className="user-action-confirm">
            <strong>{t.confirmAction}</strong>
            <span>{confirmAction === 'delete' ? t.userDeleteCopy : user.isLockedOut ? t.userUnsuspendCopy : t.userSuspendCopy}</span>
            <div>
              <button type="button" disabled={isProcessing} onClick={() => setConfirmAction(null)}>
                {t.cancel}
              </button>
              <button
                className={confirmAction === 'delete' ? 'danger' : ''}
                type="button"
                disabled={isProcessing}
                onClick={confirmAction === 'delete' ? onDelete : onToggleSuspension}
              >
                {isProcessing ? '...' : confirmedActionLabel}
              </button>
            </div>
          </div>
        )}

        <div className="delete-modal-actions single">
          <button type="button" disabled={isProcessing} onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function TournamentsPanel({
  t,
  user,
  onToast,
  onBack,
  onCreate,
  onOpen,
  onEdit,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  onToast: (message: string, tone: ToastTone) => void
  onBack: () => void
  onCreate: () => void
  onOpen: (id: number) => void
  onEdit: (id: number) => void
}) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [search, setSearch] = useState('')
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'not-synced'>('all')
  const [sortKey, setSortKey] = useState<TournamentSortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<TournamentSummary | null>(null)

  useEffect(() => {
    let isMounted = true

    fetchTournaments(user.token)
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

    const filtered = tournaments.filter((tournament) => {
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

    return [...filtered].sort((left, right) => {
      let comparison = 0

      if (sortKey === 'name') {
        comparison = compareText(left.name, right.name)
      } else if (sortKey === 'season') {
        comparison = compareText(left.season, right.season)
      } else if (sortKey === 'country') {
        comparison = compareText(left.competitionCountry, right.competitionCountry)
      } else if (sortKey === 'teams') {
        comparison = left.teamCount - right.teamCount
      } else if (sortKey === 'matches') {
        comparison = left.matchCount - right.matchCount
      } else if (sortKey === 'lastSync') {
        comparison = new Date(left.lastSyncedAtUtc || 0).getTime() - new Date(right.lastSyncedAtUtc || 0).getTime()
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [search, sortDirection, sortKey, syncFilter, tournaments])

  const requestSort = (key: TournamentSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const removeTournament = async () => {
    if (!deleteCandidate) {
      return
    }

    const tournament = deleteCandidate
    setIsDeletingId(tournament.id)
    try {
      const result = await deleteTournament(user.token, tournament.id)

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setTournaments((current) => current.filter((item) => item.id !== tournament.id))
      setDeleteCandidate(null)
      onToast(t.tournamentDeleteSuccess, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsDeletingId(null)
    }
  }

  const sortableHeaders: Array<{ key: TournamentSortKey; label: string }> = [
    { key: 'name', label: t.tournamentName },
    { key: 'season', label: t.tournamentSeason },
    { key: 'country', label: t.tournamentCountry },
    { key: 'teams', label: t.tournamentTeams },
    { key: 'matches', label: t.tournamentMatches },
    { key: 'lastSync', label: t.tournamentLastSync },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournaments-panel">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.tournamentsPanelEyebrow}</p>
          <h1>{t.tournamentsPanelTitle}</h1>
          <p>{t.tournamentsPanelCopy}</p>
        </div>

        <div className="details-top-actions panel-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            <span>{t.backToAdmin}</span>
          </button>
        </div>

        {isLoading && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="details-panel tournaments-management-panel">
          <div className="details-panel-heading">
            <MenuIcon name="tournaments" />
            <h2>{t.adminTournamentOps}</h2>
          </div>

          <div className="tournament-toolbar">
            <button
              className="form-submit compact"
              type="button"
              onClick={onCreate}
            >
              {t.addTournament}
            </button>
            <label className="tournament-search compact">
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
                {sortableHeaders.map((header) => (
                  <th key={header.key}>
                    <button
                      className="table-sort-button"
                      type="button"
                      aria-sort={sortKey === header.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                      onClick={() => requestSort(header.key)}
                    >
                      <span>{header.label}</span>
                      <span className="sort-indicator" aria-hidden="true">{sortKey === header.key ? (sortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                    </button>
                  </th>
                ))}
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
                  <td>{tournament.season || '-'}</td>
                  <td>{tournament.competitionCountry || '-'}</td>
                  <td>{tournament.teamCount}</td>
                  <td>{tournament.matchCount}</td>
                  <td>{formatDate(tournament.lastSyncedAtUtc, t.neverSynced)}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => onOpen(tournament.id)}>{t.open}</button>
                      <button type="button" onClick={() => onEdit(tournament.id)}>
                        {t.edit}
                      </button>
                      <button
                        className="danger"
                        type="button"
                        disabled={isDeletingId === tournament.id}
                        onClick={() => setDeleteCandidate(tournament)}
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
            </tbody>
          </table>
          </div>
        </section>
      </div>
      {deleteCandidate && (
        <DeleteTournamentModal
          t={t}
          tournament={deleteCandidate}
          isDeleting={isDeletingId === deleteCandidate.id}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={removeTournament}
        />
      )}
    </section>
  )
}

export function TournamentFormPage({
  t,
  user,
  tournamentId,
  onBack,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId?: string
  onBack: () => void
  onSaved: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const isEditMode = Boolean(tournamentId)
  const [liveScoreUrl, setLiveScoreUrl] = useState('')
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [applyHomeAdvantage, setApplyHomeAdvantage] = useState(true)
  const [locale, setLocale] = useState('en')
  const [competitionCountry, setCompetitionCountry] = useState('')
  const [timezoneOffset, setTimezoneOffset] = useState('0')
  const [preview, setPreview] = useState<TournamentPreview | null>(null)
  const [loadedTournament, setLoadedTournament] = useState<TournamentDetails | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingActiveValue, setPendingActiveValue] = useState<boolean | null>(null)

  useEffect(() => {
    if (!tournamentId) {
      return
    }

    let isMounted = true
    fetchTournamentDetails(user.token, Number(tournamentId))
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (result.status === 404) {
          onToast(t.tournamentNotFound, 'error')
          onBack()
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.tournamentLoadFailed, 'error')
          return
        }

        setLoadedTournament(result.data)
        setLiveScoreUrl(result.data.baseUrl)
        setName(result.data.name)
        setSeason(result.data.season)
        setIsActive(result.data.isActive)
        setApplyHomeAdvantage(result.data.applyHomeAdvantage)
        setLocale(result.data.locale)
        setCompetitionCountry(result.data.competitionCountry)
        setTimezoneOffset(result.data.timezoneOffset)
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
  }, [onBack, onToast, t, tournamentId, user.token])

  const validate = (includeUrl: boolean) => {
    const nextErrors: Record<string, string> = {}

    if (includeUrl) {
      try {
        const parsedUrl = new URL(liveScoreUrl)
        if (!parsedUrl.hostname.includes('livescore.com')) {
          nextErrors.liveScoreUrl = t.tournamentUrlInvalid
        }
      } catch {
        nextErrors.liveScoreUrl = t.tournamentUrlInvalid
      }
    }

    if (!locale.trim()) {
      nextErrors.locale = t.required
    }

    if (!timezoneOffset.trim()) {
      nextErrors.timezoneOffset = t.required
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const loadTournamentPreview = async () => {
    const nextErrors = validate(true)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsPreviewing(true)
    try {
      const result = await previewTournament(user.token, {
        liveScoreUrl: liveScoreUrl.trim(),
        name: name.trim() || null,
        season: season.trim() || null,
        locale: locale.trim(),
        timezoneOffset: timezoneOffset.trim(),
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setPreview(result.data)
      setName((current) => current || result.data?.name || '')
      setSeason((current) => current || result.data?.season || '')
      setLocale(result.data.locale)
      setCompetitionCountry(result.data.competitionCountry || '')
      setTimezoneOffset(result.data.timezoneOffset)
      onToast(t.tournamentPreviewLoaded, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsPreviewing(false)
    }
  }

  const saveTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(true)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = isEditMode
        ? await updateTournament(user.token, Number(tournamentId), {
            name: name.trim() || null,
            season: season.trim() || null,
            isActive,
            applyHomeAdvantage,
            liveScoreUrl: liveScoreUrl.trim(),
            competitionCountry: competitionCountry.trim() || null,
            locale: locale.trim(),
            timezoneOffset: timezoneOffset.trim(),
          })
        : await createTournament(user.token, {
            liveScoreUrl: liveScoreUrl.trim(),
            name: name.trim() || null,
            season: season.trim() || null,
            applyHomeAdvantage,
            locale: locale.trim(),
            competitionCountry: competitionCountry.trim() || null,
            timezoneOffset: timezoneOffset.trim(),
          })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(isEditMode ? t.tournamentUpdated : t.tournamentCreated, 'success')
      onSaved()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const metadata = preview || loadedTournament

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournament-form-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{isEditMode ? t.tournamentEditEyebrow : t.tournamentCreateEyebrow}</p>
          <h1>{isEditMode ? t.tournamentEditTitle : t.tournamentCreateTitle}</h1>
          <p>{isEditMode ? t.tournamentEditCopy : t.tournamentCreateCopy}</p>
        </div>

        {isLoading ? (
          <div className="tournament-form-card centered">
            <LoadingSpinner />
          </div>
        ) : (
          <form className="tournament-form-card" noValidate onSubmit={saveTournament}>
            {isSubmitting && (
              <div className="form-loading-overlay" role="status" aria-live="polite">
                <LoadingSpinner />
                <strong>{isEditMode ? t.tournamentSaving : t.tournamentCreating}</strong>
              </div>
            )}
            {!isEditMode && (
              <div className="tournament-url-row">
                <FormField
                  error={errors.liveScoreUrl}
                  label={t.liveScoreUrl}
                  placeholder={t.liveScoreUrlPlaceholder}
                  type="url"
                  value={liveScoreUrl}
                  onChange={setLiveScoreUrl}
                />
                <button type="button" disabled={isPreviewing || isSubmitting} onClick={loadTournamentPreview}>
                  {isPreviewing ? '...' : t.previewTournament}
                </button>
              </div>
            )}
            {isEditMode && (
              <FormField
                error={errors.liveScoreUrl}
                label={t.liveScoreUrl}
                placeholder={t.liveScoreUrlPlaceholder}
                type="url"
                value={liveScoreUrl}
                onChange={setLiveScoreUrl}
              />
            )}

            <FormField
              error={errors.name}
              label={t.tournamentDisplayName}
              placeholder={t.tournamentDisplayNamePlaceholder}
              type="text"
              value={name}
              onChange={setName}
            />

            <FormField
              error={errors.season}
              label={t.tournamentSeason}
              placeholder="2026/2027"
              type="text"
              value={season}
              onChange={setSeason}
            />

            <label className="tournament-active-field">
              <span>
                <span>{t.homeAdvantage}</span>
                <small>{applyHomeAdvantage ? t.homeAdvantageEnabled : t.homeAdvantageDisabled}</small>
              </span>
              <button
                className={applyHomeAdvantage ? 'active-toggle on' : 'active-toggle off'}
                type="button"
                disabled={isSubmitting}
                onClick={() => setApplyHomeAdvantage((current) => !current)}
              >
                {applyHomeAdvantage ? t.homeAdvantageEnabled : t.homeAdvantageDisabled}
              </button>
            </label>

            {isEditMode && (
              <label className="tournament-active-field">
                <span>
                  <span>{t.status}</span>
                  <small>{isActive ? t.activeTournament : t.inactiveTournament}</small>
                </span>
                <button
                  className={isActive ? 'active-toggle on' : 'active-toggle off'}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPendingActiveValue(!isActive)}
                >
                  {isActive ? t.activeTournament : t.inactiveTournament}
                </button>
              </label>
            )}

            <div className="tournament-settings-grid">
              <FormField
                error={errors.locale}
                label={t.locale}
                type="text"
                value={locale}
                onChange={setLocale}
              />
              <FormField
                error={errors.competitionCountry}
                label={t.tournamentCountry}
                type="text"
                value={competitionCountry}
                onChange={setCompetitionCountry}
              />
              <FormField
                error={errors.timezoneOffset}
                label={t.timezoneOffset}
                type="text"
                value={timezoneOffset}
                onChange={setTimezoneOffset}
              />
            </div>

            {metadata && (
              <div className="tournament-preview-card">
                <h2>{t.tournamentPreviewTitle}</h2>
                <dl>
                  <div>
                    <dt>{t.tournamentName}</dt>
                    <dd>{metadata.name}</dd>
                  </div>
                  <div>
                    <dt>{t.tournamentSeason}</dt>
                    <dd>{metadata.season || '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.competition}</dt>
                    <dd>{metadata.competitionName}</dd>
                  </div>
                  <div>
                    <dt>{t.tournamentCountry}</dt>
                    <dd>{metadata.competitionCountry || '-'}</dd>
                  </div>
                  <div>
                    <dt>{t.locale}</dt>
                    <dd>{metadata.locale}</dd>
                  </div>
                  <div>
                    <dt>{t.timezoneOffset}</dt>
                    <dd>{metadata.timezoneOffset}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="tournament-form-actions">
              <button type="button" disabled={isSubmitting} onClick={onBack}>
                {t.cancel}
              </button>
              <button className="form-submit" type="submit" disabled={isSubmitting || isPreviewing}>
                {isSubmitting ? '...' : isEditMode ? t.saveTournament : t.createTournament}
              </button>
            </div>
            {pendingActiveValue !== null && loadedTournament && (
              <TournamentActiveModal
                t={t}
                tournament={loadedTournament}
                nextIsActive={pendingActiveValue}
                onCancel={() => setPendingActiveValue(null)}
                onConfirm={() => {
                  setIsActive(pendingActiveValue)
                  setPendingActiveValue(null)
                }}
              />
            )}
          </form>
        )}
      </div>
    </section>
  )
}

export function TournamentDetailsPage({
  t,
  user,
  tournamentId,
  onBack,
  onEdit,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournamentId: string
  onBack: () => void
  onEdit: (id: number) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [syncRuns, setSyncRuns] = useState<TournamentSyncRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeSyncMode, setActiveSyncMode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'teams' | 'matches'>('details')
  const [teamEditCandidate, setTeamEditCandidate] = useState<TournamentDetails['teams'][number] | null>(null)
  const [matchEditCandidate, setMatchEditCandidate] = useState<MatchSummary | null>(null)
  const [teamSortKey, setTeamSortKey] = useState<TeamSortKey>('name')
  const [teamSortDirection, setTeamSortDirection] = useState<SortDirection>('asc')
  const [matchSortKey, setMatchSortKey] = useState<MatchSortKey>('kickoff')
  const [matchSortDirection, setMatchSortDirection] = useState<SortDirection>('asc')

  const loadTournamentData = async () => {
    if (!tournamentId) {
      onBack()
      return
    }

    setIsLoading(true)
    try {
      const [detailsResult, matchesResult, syncRunsResult] = await Promise.all([
        fetchTournamentDetails(user.token, Number(tournamentId)),
        fetchTournamentMatches(user.token, Number(tournamentId)),
        fetchTournamentSyncRuns(user.token, Number(tournamentId)),
      ])

      if (detailsResult.status === 404) {
        onToast(t.tournamentNotFound, 'error')
        onBack()
        return
      }

      if (!detailsResult.ok || !detailsResult.data) {
        onToast(detailsResult.message || t.tournamentLoadFailed, 'error')
        return
      }

      setTournament(detailsResult.data)
      setMatches(matchesResult.ok && matchesResult.data ? matchesResult.data : [])
      setSyncRuns(syncRunsResult.ok && syncRunsResult.data ? syncRunsResult.data : [])

      if (!matchesResult.ok) {
        onToast(matchesResult.message || t.genericError, 'error')
      }

      if (!syncRunsResult.ok) {
        onToast(syncRunsResult.message || t.genericError, 'error')
      }
    } catch {
      onToast(t.tournamentLoadFailed, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTournamentData()
  }, [tournamentId, user.token])

  const runSync = async (mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results') => {
    setActiveSyncMode(mode)
    try {
      const result = await syncTournament(user.token, Number(tournamentId), mode)

      if (!result.ok) {
        onToast(result.message || t.syncFailed, 'error')
        return
      }

      onToast(t.syncStarted, 'success')
      await loadTournamentData()
    } catch {
      onToast(t.syncFailed, 'error')
    } finally {
      setActiveSyncMode(null)
    }
  }

  const finishedMatches = matches.filter((match) => ['Finished', 'AfterExtraTime', 'AfterPenalties', '3'].includes(String(match.status)) || String(match.syncState) === 'Finalized' || String(match.syncState) === '3')
  const liveMatches = matches.filter((match) => String(match.status) === 'Live' || String(match.status) === '2' || String(match.syncState) === 'Live' || String(match.syncState) === '2')
  const upcomingMatches = matches.filter((match) => String(match.status) === 'Upcoming' || String(match.status) === '1' || String(match.syncState) === 'Scheduled' || String(match.syncState) === '1')
  const problemMatches = matches.filter((match) => ['Cancelled', 'Postponed', 'Interrupted', 'Abandoned', '4', '5'].includes(String(match.status)))
  const missingTeamMatches = matches.filter((match) => !match.homeTeam || !match.awayTeam)
  const sortedWithDates = matches
    .filter((match) => match.kickoffUtc)
    .sort((left, right) => new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime())
  const now = Date.now()
  const nextMatch = sortedWithDates.find((match) => new Date(match.kickoffUtc || 0).getTime() >= now)
  const recentRuns = syncRuns.slice(0, 8)
  const syncButtons: Array<{ mode: 'full' | 'schedule' | 'live' | 'finalize' | 'results'; label: string; copy: string }> = [
    { mode: 'full', label: t.fullSync, copy: t.fullSyncCopy },
    { mode: 'schedule', label: t.scheduleSync, copy: t.scheduleSyncCopy },
    { mode: 'live', label: t.liveSync, copy: t.liveSyncCopy },
    { mode: 'finalize', label: t.finalizeSync, copy: t.finalizeSyncCopy },
    { mode: 'results', label: t.resultsSync, copy: t.resultsSyncCopy },
  ]
  const activeSyncLabel = syncButtons.find((button) => button.mode === activeSyncMode)?.label

  const requestTeamSort = (key: TeamSortKey) => {
    if (teamSortKey === key) {
      setTeamSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTeamSortKey(key)
    setTeamSortDirection('asc')
  }

  const requestMatchSort = (key: MatchSortKey) => {
    if (matchSortKey === key) {
      setMatchSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setMatchSortKey(key)
    setMatchSortDirection('asc')
  }

  const sortedTeams = useMemo(() => {
    if (!tournament) {
      return []
    }

    return [...tournament.teams].sort((left, right) => {
      const comparison = teamSortKey === 'name'
        ? compareText(left.name, right.name)
        : compareText(left.abbreviation, right.abbreviation)

      return teamSortDirection === 'asc' ? comparison : -comparison
    })
  }, [teamSortDirection, teamSortKey, tournament])

  const sortedMatches = useMemo(() => {
    return [...matches].sort((left, right) => {
      let comparison = 0
      if (matchSortKey === 'kickoff') {
        comparison = new Date(left.kickoffUtc || 0).getTime() - new Date(right.kickoffUtc || 0).getTime()
      } else if (matchSortKey === 'round') {
        comparison = compareText(left.roundInfo, right.roundInfo)
      } else if (matchSortKey === 'home') {
        comparison = compareText(left.homeTeam?.name || left.homeTeamNameSnapshot, right.homeTeam?.name || right.homeTeamNameSnapshot)
      } else if (matchSortKey === 'away') {
        comparison = compareText(left.awayTeam?.name || left.awayTeamNameSnapshot, right.awayTeam?.name || right.awayTeamNameSnapshot)
      } else if (matchSortKey === 'score') {
        comparison = (left.homeScore ?? -1) - (right.homeScore ?? -1) || (left.awayScore ?? -1) - (right.awayScore ?? -1)
      } else if (matchSortKey === 'status') {
        comparison = compareText(String(left.status), String(right.status))
      }

      return matchSortDirection === 'asc' ? comparison : -comparison
    })
  }, [matchSortDirection, matchSortKey, matches])

  const teamHeaders: Array<{ key: TeamSortKey; label: string }> = [
    { key: 'name', label: t.teamName },
    { key: 'abbreviation', label: t.abbreviation },
  ]

  const matchHeaders: Array<{ key: MatchSortKey; label: string }> = [
    { key: 'kickoff', label: t.kickoff },
    { key: 'round', label: t.round },
    { key: 'home', label: t.homeTeam },
    { key: 'away', label: t.awayTeam },
    { key: 'score', label: t.score },
    { key: 'status', label: t.status },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content tournament-details-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.tournamentDetailsEyebrow}</p>
          <h1>{tournament?.name ?? t.tournamentDetailsTitle}</h1>
          <p>{t.tournamentDetailsCopy}</p>
        </div>

        {isLoading && !activeSyncMode && (
          <FullPageProcessingOverlay label={t.loadingTournament} />
        )}

        {activeSyncMode && (
          <FullPageProcessingOverlay label={activeSyncLabel ?? t.syncOperations} />
        )}

        {!isLoading && tournament && (
          <>
            <div className="details-top-actions">
              <button type="button" onClick={onBack}>
                <MenuIcon name="arrow-left" />
                <span>{t.backToTournaments}</span>
              </button>
              <button type="button" onClick={() => onEdit(tournament.id)}>{t.edit}</button>
            </div>

            <div className="details-tabs">
              {[
                ['details', t.tabDetails],
                ['teams', t.tabTeams],
                ['matches', t.tabMatches],
              ].map(([value, label]) => (
                <button
                  className={activeTab === value ? 'active' : ''}
                  type="button"
                  key={value}
                  onClick={() => setActiveTab(value as 'details' | 'teams' | 'matches')}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <>
                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="tournaments" />
                    <h2>{t.overview}</h2>
                  </div>
                  <dl className="details-grid">
                    <div><dt>{t.tournamentName}</dt><dd>{tournament.name}</dd></div>
                    <div><dt>{t.tournamentSeason}</dt><dd>{tournament.season || '-'}</dd></div>
                    <div><dt>{t.competition}</dt><dd>{tournament.competitionName}</dd></div>
                    <div><dt>{t.tournamentCountry}</dt><dd>{tournament.competitionCountry || '-'}</dd></div>
                    <div><dt>{t.liveScoreCompetitionId}</dt><dd>{tournament.liveScoreCompetitionId || '-'}</dd></div>
                    <div><dt>{t.homeAdvantage}</dt><dd>{tournament.applyHomeAdvantage ? t.homeAdvantageEnabled : t.homeAdvantageDisabled}</dd></div>
                    <div><dt>{t.locale}</dt><dd>{tournament.locale}</dd></div>
                    <div><dt>{t.timezoneOffset}</dt><dd>{tournament.timezoneOffset}</dd></div>
                    <div><dt>{t.created}</dt><dd>{formatDate(tournament.createdAtUtc, '-')}</dd></div>
                    <div><dt>{t.tournamentLastSync}</dt><dd>{formatDate(tournament.lastSyncedAtUtc, t.neverSynced)}</dd></div>
                    <div><dt>{t.baseUrl}</dt><dd><a href={tournament.baseUrl} target="_blank" rel="noreferrer">{tournament.baseUrl}</a></dd></div>
                    <div><dt>{t.fixturesUrl}</dt><dd><a href={tournament.fixturesUrl} target="_blank" rel="noreferrer">{tournament.fixturesUrl}</a></dd></div>
                  </dl>
                </section>

                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="matches" />
                    <h2>{t.tournamentDataCoverage}</h2>
                  </div>
                  <div className="coverage-grid">
                    <div><span>{t.matches}</span><strong>{matches.length}</strong></div>
                    <div><span>{t.teams}</span><strong>{tournament.teams.length}</strong></div>
                    <div><span>{t.stages}</span><strong>{tournament.stages.length}</strong></div>
                    <div><span>{t.upcoming}</span><strong>{upcomingMatches.length}</strong></div>
                    <div><span>{t.live}</span><strong>{liveMatches.length}</strong></div>
                    <div><span>{t.finalized}</span><strong>{finishedMatches.length}</strong></div>
                    <div><span>{t.problemRecords}</span><strong>{problemMatches.length}</strong></div>
                    <div><span>{t.missingTeams}</span><strong>{missingTeamMatches.length}</strong></div>
                    <div><span>{t.nextMatch}</span><strong>{formatDate(nextMatch?.kickoffUtc, '-')}</strong></div>
                  </div>
                </section>

                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="admin" />
                    <h2>{t.syncOperations}</h2>
                  </div>
                  <div className="sync-action-grid">
                    {syncButtons.map((button) => (
                      <button
                        type="button"
                        key={button.mode}
                        disabled={Boolean(activeSyncMode)}
                        onClick={() => runSync(button.mode)}
                      >
                        {activeSyncMode === button.mode ? <LoadingSpinner /> : <MenuIcon name="admin" />}
                        <strong>{button.label}</strong>
                        <span>{button.copy}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="details-panel">
                  <div className="details-panel-heading">
                    <MenuIcon name="matches" />
                    <h2>{t.recentSyncRuns}</h2>
                  </div>
                  <div className="tournament-table-shell compact-table-shell">
                    <table className="tournament-table sync-runs-table">
                      <thead>
                        <tr>
                          <th>{t.mode}</th>
                          <th>{t.status}</th>
                          <th>{t.started}</th>
                          <th>{t.finished}</th>
                          <th>{t.inserted}</th>
                          <th>{t.updatedRows}</th>
                          <th>{t.unchanged}</th>
                          <th>{t.error}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentRuns.map((run) => (
                          <tr key={run.id}>
                            <td>{run.mode}</td>
                            <td>{run.status}</td>
                            <td>{formatDate(run.startedAtUtc, '-')}</td>
                            <td>{formatDate(run.finishedAtUtc, '-')}</td>
                            <td>{run.insertedMatches}</td>
                            <td>{run.updatedMatches}</td>
                            <td>{run.unchangedMatches}</td>
                            <td>{run.errorMessage || '-'}</td>
                          </tr>
                        ))}
                        {recentRuns.length === 0 && (
                          <tr>
                            <td className="empty-table" colSpan={8}>{t.noSyncRuns}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'teams' && (
              <section className="details-panel">
                <div className="details-panel-heading">
                  <MenuIcon name="teams" />
                  <h2>{t.teams}</h2>
                </div>
                <div className="tournament-table-shell compact-table-shell">
                  <table className="tournament-table sync-runs-table">
                    <thead>
                      <tr>
                        {teamHeaders.map((header) => (
                          <th key={header.key}>
                            <button
                              className="table-sort-button"
                              type="button"
                              aria-sort={teamSortKey === header.key ? (teamSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                              onClick={() => requestTeamSort(header.key)}
                            >
                              <span>{header.label}</span>
                              <span className="sort-indicator" aria-hidden="true">{teamSortKey === header.key ? (teamSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                            </button>
                          </th>
                        ))}
                        <th>{t.tournamentActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team) => (
                        <tr key={team.id}>
                          <td>{team.name}</td>
                          <td>{team.abbreviation || '-'}</td>
                          <td>
                            <div className="table-actions single-action">
                              <button type="button" onClick={() => setTeamEditCandidate(team)}>
                                {t.edit}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'matches' && (
              <section className="details-panel">
                <div className="details-panel-heading">
                  <MenuIcon name="matches" />
                  <h2>{t.matches}</h2>
                </div>
                <div className="tournament-table-shell compact-table-shell">
                  <table className="tournament-table matches-table">
                    <thead>
                      <tr>
                        {matchHeaders.map((header) => (
                          <th key={header.key}>
                            <button
                              className="table-sort-button"
                              type="button"
                              aria-sort={matchSortKey === header.key ? (matchSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                              onClick={() => requestMatchSort(header.key)}
                            >
                              <span>{header.label}</span>
                              <span className="sort-indicator" aria-hidden="true">{matchSortKey === header.key ? (matchSortDirection === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
                            </button>
                          </th>
                        ))}
                        <th>{t.tournamentActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMatches.map((match) => (
                        <tr key={match.id}>
                          <td>{formatDate(match.kickoffUtc, '-')}</td>
                          <td>{match.roundInfo || '-'}</td>
                          <td>{match.homeTeam?.name || match.homeTeamNameSnapshot || '-'}</td>
                          <td>{match.awayTeam?.name || match.awayTeamNameSnapshot || '-'}</td>
                          <td>{match.homeScore ?? '-'} : {match.awayScore ?? '-'}</td>
                          <td>{match.status}</td>
                          <td>
                            <div className="table-actions single-action">
                              <button type="button" onClick={() => setMatchEditCandidate(match)}>
                                {t.edit}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </>
        )}
        {teamEditCandidate && tournament && (
          <EditTeamModal
            t={t}
            team={teamEditCandidate}
            user={user}
            onCancel={() => setTeamEditCandidate(null)}
            onSaved={(updatedTeam) => {
              setTournament({
                ...tournament,
                teams: tournament.teams.map((team) => team.id === updatedTeam.id ? updatedTeam : team),
              })
              setMatches((current) => current.map((match) => ({
                ...match,
                homeTeam: match.homeTeam?.id === updatedTeam.id ? updatedTeam : match.homeTeam,
                awayTeam: match.awayTeam?.id === updatedTeam.id ? updatedTeam : match.awayTeam,
              })))
              setTeamEditCandidate(null)
              onToast(t.teamUpdated, 'success')
            }}
            onToast={onToast}
          />
        )}
        {matchEditCandidate && tournament && (
          <EditMatchModal
            t={t}
            user={user}
            tournament={tournament}
            match={matchEditCandidate}
            onCancel={() => setMatchEditCandidate(null)}
            onSaved={(updatedMatch) => {
              setMatches((current) => current.map((match) => match.id === updatedMatch.id ? updatedMatch : match))
              setMatchEditCandidate(null)
              onToast(t.matchUpdated, 'success')
            }}
            onToast={onToast}
          />
        )}
      </div>
    </section>
  )
}

export function DeleteTournamentModal({
  t,
  tournament,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  t: (typeof translations)[Language]
  tournament: TournamentSummary
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isDeleting, onCancel])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isDeleting && onCancel()}>
      <section
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-tournament-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="tournaments" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.delete}</p>
          <h2 id="delete-tournament-title">{t.tournamentDeleteTitle}</h2>
          <p>{t.tournamentDeleteCopy}</p>
          <div className="delete-modal-target">
            <strong>{tournament.name}</strong>
            <span>{tournament.competitionName} - {tournament.competitionCountry || '-'}</span>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isDeleting} onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="danger" type="button" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? '...' : t.confirmDelete}
          </button>
        </div>
      </section>
    </div>
  )
}

export function EditSquadMappingModal({
  t,
  row,
  tournament,
  isSaving,
  onCancel,
  onImport,
  onToast,
}: {
  t: (typeof translations)[Language]
  row: { team: TeamSummary; mapping?: ExternalTeamMapping; snapshot?: SquadQualitySnapshot }
  tournament: { name: string; season: string }
  isSaving: boolean
  onCancel: () => void
  onImport: (url: string) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [transfermarktUrl, setTransfermarktUrl] = useState(row.mapping?.sourceUrl || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const trimmedUrl = transfermarktUrl.trim()

    if (!trimmedUrl) {
      nextErrors.transfermarktUrl = t.required
    } else {
      try {
        const url = new URL(trimmedUrl)
        if (url.hostname.toLowerCase() !== 'www.transfermarkt.com') {
          nextErrors.transfermarktUrl = t.genericError
        }
      } catch {
        nextErrors.transfermarktUrl = t.genericError
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    onImport(trimmedUrl)
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-team-modal edit-squad-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-squad-title"
        noValidate
        onSubmit={submitImport}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="teams" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.editSquads}</p>
          <h2 id="edit-squad-title">{t.editSquadMappingTitle}</h2>
          <p>{t.editSquadMappingCopy}</p>
        </div>
        <div className="delete-modal-target">
          <strong>{row.team.name}</strong>
          <span>{tournament.name} - {tournament.season}</span>
        </div>
        <div className="edit-team-fields">
          <FormField
            error={errors.transfermarktUrl}
            label={t.transfermarktUrl}
            type="url"
            value={transfermarktUrl}
            onChange={setTransfermarktUrl}
          />
          <div className="squad-season-note">
            <span>{t.squadSeason}</span>
            <strong>{tournament.season || '-'}</strong>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? t.importRunning : t.saveAndImportSnapshot}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export function TournamentActiveModal({
  t,
  tournament,
  nextIsActive,
  onCancel,
  onConfirm,
}: {
  t: (typeof translations)[Language]
  tournament: TournamentDetails
  nextIsActive: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-tournament-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="tournaments" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{nextIsActive ? t.confirmActivate : t.confirmDeactivate}</p>
          <h2 id="active-tournament-title">{nextIsActive ? t.activateTournamentTitle : t.deactivateTournamentTitle}</h2>
          <p>{nextIsActive ? t.activateTournamentCopy : t.deactivateTournamentCopy}</p>
          <div className="delete-modal-target">
            <strong>{tournament.name}</strong>
            <span>{tournament.season || '-'} - {tournament.competitionCountry || '-'}</span>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" onClick={onCancel}>
            {t.cancel}
          </button>
          <button className={nextIsActive ? '' : 'danger'} type="button" onClick={onConfirm}>
            {nextIsActive ? t.confirmActivate : t.confirmDeactivate}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function EditTeamModal({
  t,
  user,
  team,
  onCancel,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  team: TournamentDetails['teams'][number]
  onCancel: () => void
  onSaved: (team: TournamentDetails['teams'][number]) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [name, setName] = useState(team.name)
  const [abbreviation, setAbbreviation] = useState(team.abbreviation)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const saveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) {
      nextErrors.name = t.required
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSaving(true)
    try {
      const result = await updateTournamentTeam(user.token, team.id, {
        name: name.trim(),
        abbreviation: abbreviation.trim(),
        isEnabled: team.isEnabled,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onSaved(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-team-title"
        noValidate
        onSubmit={saveTeam}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="teams" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.edit}</p>
          <h2 id="edit-team-title">{t.editTeamTitle}</h2>
          <p>{t.editTeamCopy}</p>
        </div>
        <div className="edit-team-fields">
          <FormField
            error={errors.name}
            label={t.teamName}
            type="text"
            value={name}
            onChange={setName}
          />
          <FormField
            label={t.abbreviation}
            type="text"
            value={abbreviation}
            onChange={setAbbreviation}
          />
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? '...' : t.saveTeam}
          </button>
        </div>
      </form>
    </div>
  )
}

export function AdminTeamEditModal({
  t,
  user,
  team,
  onCancel,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  team: TeamSummary
  onCancel: () => void
  onSaved: (team: TeamSummary) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [name, setName] = useState(team.name)
  const [isEnabled, setIsEnabled] = useState(team.isEnabled)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const saveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) {
      nextErrors.name = t.required
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSaving(true)
    try {
      const result = await updateTeam(user.token, team.id, {
        name: name.trim(),
        abbreviation: team.abbreviation,
        isEnabled,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onSaved(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-team-modal admin-team-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-team-title"
        noValidate
        onSubmit={saveTeam}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="teams" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.edit}</p>
          <h2 id="admin-edit-team-title">{t.editTeamVisibilityTitle}</h2>
          <p>{t.editTeamVisibilityCopy}</p>
          <div className="delete-modal-target">
            <strong>{team.name}</strong>
            <span>{team.abbreviation || '-'}</span>
          </div>
        </div>
        <div className="edit-team-fields">
          <FormField
            error={errors.name}
            label={t.teamName}
            type="text"
            value={name}
            onChange={setName}
          />
          <label className="system-service-toggle admin-team-toggle">
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={isSaving}
              onChange={(event) => setIsEnabled(event.target.checked)}
            />
            <span>
              <strong>{isEnabled ? t.enabled : t.disabled}</strong>
              <small>{t.teamVisibilityCopy}</small>
            </span>
          </label>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? '...' : t.saveTeam}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export function EditMatchModal({
  t,
  user,
  tournament,
  match,
  onCancel,
  onSaved,
  onToast,
}: {
  t: (typeof translations)[Language]
  user: AuthUser
  tournament: TournamentDetails
  match: MatchSummary
  onCancel: () => void
  onSaved: (match: MatchSummary) => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [stageId, setStageId] = useState(match.stageId?.toString() ?? '')
  const [kickoffUtc, setKickoffUtc] = useState(toDateTimeLocalInput(match.kickoffUtc))
  const [roundInfo, setRoundInfo] = useState(match.roundInfo)
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '')
  const [regularHomeScore, setRegularHomeScore] = useState(match.regularTimeHomeScore?.toString() ?? '')
  const [regularAwayScore, setRegularAwayScore] = useState(match.regularTimeAwayScore?.toString() ?? '')
  const [extraHomeScore, setExtraHomeScore] = useState(match.afterExtraTimeHomeScore?.toString() ?? '')
  const [extraAwayScore, setExtraAwayScore] = useState(match.afterExtraTimeAwayScore?.toString() ?? '')
  const [penaltyHomeScore, setPenaltyHomeScore] = useState(match.penaltyHomeScore?.toString() ?? '')
  const [penaltyAwayScore, setPenaltyAwayScore] = useState(match.penaltyAwayScore?.toString() ?? '')
  const [status, setStatus] = useState(enumValue(match.status, 0, matchStatusLabels).toString())
  const [rawStatus, setRawStatus] = useState(match.rawStatus)
  const [syncState, setSyncState] = useState(enumValue(match.syncState, 0, matchSyncStateLabels).toString())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onCancel])

  const saveMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const result = await updateTournamentMatch(user.token, tournament.id, match.id, {
        stageId: stageId ? Number(stageId) : null,
        kickoffUtc: kickoffUtc ? new Date(kickoffUtc).toISOString() : null,
        homeScore: nullableNumber(homeScore),
        awayScore: nullableNumber(awayScore),
        regularTimeHomeScore: nullableNumber(regularHomeScore),
        regularTimeAwayScore: nullableNumber(regularAwayScore),
        afterExtraTimeHomeScore: nullableNumber(extraHomeScore),
        afterExtraTimeAwayScore: nullableNumber(extraAwayScore),
        penaltyHomeScore: nullableNumber(penaltyHomeScore),
        penaltyAwayScore: nullableNumber(penaltyAwayScore),
        status: Number(status),
        rawStatus,
        syncState: Number(syncState),
        roundInfo,
      })

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onSaved(result.data)
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isSaving && onCancel()}>
      <form
        className="delete-modal edit-match-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-match-title"
        noValidate
        onSubmit={saveMatch}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="matches" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.edit}</p>
          <h2 id="edit-match-title">{t.editMatchTitle}</h2>
          <p>{t.editMatchCopy}</p>
          <div className="delete-modal-target">
            <strong>{match.homeTeam?.name || match.homeTeamNameSnapshot} vs {match.awayTeam?.name || match.awayTeamNameSnapshot}</strong>
            <span>{formatDate(match.kickoffUtc, '-')}</span>
          </div>
        </div>

        <div className="edit-match-grid">
          <label className="form-field">
            <span><span>{t.stage}</span></span>
            <select value={stageId} onChange={(event) => setStageId(event.target.value)}>
              <option value="">{t.noStage}</option>
              {tournament.stages.map((stage) => (
                <option value={stage.id} key={stage.id}>{stage.name}</option>
              ))}
            </select>
          </label>
          <FormField label={t.round} type="text" value={roundInfo} onChange={setRoundInfo} />
          <FormField label={t.kickoff} type="datetime-local" value={kickoffUtc} onChange={setKickoffUtc} />
          <label className="form-field">
            <span><span>{t.status}</span></span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {Object.entries(matchStatusLabels).map(([label, value]) => (
                <option value={value} key={label}>{label}</option>
              ))}
            </select>
          </label>
          <FormField label={t.rawStatus} type="text" value={rawStatus} onChange={setRawStatus} />
          <label className="form-field">
            <span><span>{t.syncState}</span></span>
            <select value={syncState} onChange={(event) => setSyncState(event.target.value)}>
              {Object.entries(matchSyncStateLabels).map(([label, value]) => (
                <option value={value} key={label}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="score-edit-grid">
          <FormField label={`${t.finalScore} - ${t.homeTeam}`} type="number" value={homeScore} onChange={setHomeScore} />
          <FormField label={`${t.finalScore} - ${t.awayTeam}`} type="number" value={awayScore} onChange={setAwayScore} />
          <FormField label={`${t.regularTimeScore} - ${t.homeTeam}`} type="number" value={regularHomeScore} onChange={setRegularHomeScore} />
          <FormField label={`${t.regularTimeScore} - ${t.awayTeam}`} type="number" value={regularAwayScore} onChange={setRegularAwayScore} />
          <FormField label={`${t.afterExtraTimeScore} - ${t.homeTeam}`} type="number" value={extraHomeScore} onChange={setExtraHomeScore} />
          <FormField label={`${t.afterExtraTimeScore} - ${t.awayTeam}`} type="number" value={extraAwayScore} onChange={setExtraAwayScore} />
          <FormField label={`${t.penaltiesScore} - ${t.homeTeam}`} type="number" value={penaltyHomeScore} onChange={setPenaltyHomeScore} />
          <FormField label={`${t.penaltiesScore} - ${t.awayTeam}`} type="number" value={penaltyAwayScore} onChange={setPenaltyAwayScore} />
        </div>

        <div className="delete-modal-actions">
          <button type="button" disabled={isSaving} onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? '...' : t.saveMatch}
          </button>
        </div>
      </form>
    </div>
  )
}
