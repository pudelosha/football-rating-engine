import { useEffect, useMemo, useRef, useState } from 'react'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type { CombinedTeamRating, MatchSummary, TeamSquadQualityRatingDetail, TournamentSummary } from '../../../shared/types'
import { DashboardFilters } from '../components/DashboardFilters'
import { DashboardChartPlaceholders } from '../components/DashboardChartPlaceholders'
import { DashboardKpiGrid } from '../components/DashboardKpiGrid'
import { DashboardLastFiveForm } from '../components/DashboardLastFiveForm'
import { DashboardLeagueTable } from '../components/DashboardLeagueTable'
import { DashboardPositionTrend } from '../components/DashboardPositionTrend'
import { DashboardResultSplit } from '../components/DashboardResultSplit'
import { buildDashboardModel, getDashboardCopy } from '../model/dashboardModel'
import {
  fetchDashboardMatches,
  fetchDashboardRatings,
  fetchDashboardSquadRatings,
  fetchDashboardTournaments,
} from '../services/dashboardService'
import type { DashboardProps } from '../types'

export function DashboardPage({ language, t, user, onToast }: DashboardProps) {
  const copy = useMemo(() => getDashboardCopy(language), [language])
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [selectedRound, setSelectedRound] = useState('all')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [ratings, setRatings] = useState<CombinedTeamRating[]>([])
  const [squadDetails, setSquadDetails] = useState<TeamSquadQualityRatingDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const loadRequestId = useRef(0)

  const selectedTournament = tournaments.find((tournament) => String(tournament.id) === selectedTournamentId)
  const model = useMemo(() => buildDashboardModel(copy, {
    matches,
    ratings,
    round: selectedRound,
    selectedTournament,
    squadDetails,
    teamIds: selectedTeamIds,
  }), [copy, matches, ratings, selectedRound, selectedTeamIds, selectedTournament, squadDetails])

  function clearTournamentData() {
    setMatches([])
    setRatings([])
    setSquadDetails([])
  }

  async function fetchTournamentData(tournamentId: string) {
    if (!tournamentId) {
      return null
    }

    const [matchesResult, ratingsResult, squadResult] = await Promise.all([
      fetchDashboardMatches(user.token, Number(tournamentId)),
      fetchDashboardRatings(user.token, Number(tournamentId)),
      fetchDashboardSquadRatings(user.token, Number(tournamentId)),
    ])

    if (!matchesResult.ok || !matchesResult.data) {
      onToast(matchesResult.message || String(t.genericError), 'error')
      return null
    }

    if (!ratingsResult.ok || !ratingsResult.data) {
      onToast(ratingsResult.message || String(t.genericError), 'error')
      return null
    }

    return {
      matches: matchesResult.data,
      ratings: ratingsResult.data.teams,
      squadDetails: squadResult.ok && squadResult.data ? squadResult.data : [],
    }
  }

  function applyTournamentData(data: Awaited<ReturnType<typeof fetchTournamentData>>) {
    if (!data) {
      return
    }

    setMatches(data.matches)
    setRatings(data.ratings)
    setSquadDetails(data.squadDetails)
  }

  async function loadDashboard(preferredTournamentId?: string) {
    const requestId = ++loadRequestId.current
    setIsLoading(true)
    try {
      const tournamentsResult = await fetchDashboardTournaments(user.token)
      if (requestId !== loadRequestId.current) {
        return
      }

      if (!tournamentsResult.ok || !tournamentsResult.data) {
        onToast(tournamentsResult.message || String(t.genericError), 'error')
        return
      }

      const nextTournaments = tournamentsResult.data
      const nextTournamentId = preferredTournamentId || selectedTournamentId || String(nextTournaments[0]?.id ?? '')
      setTournaments(nextTournaments)
      setSelectedTournamentId(nextTournamentId)
      clearTournamentData()
      const data = await fetchTournamentData(nextTournamentId)
      if (requestId === loadRequestId.current) {
        applyTournamentData(data)
      }
    } catch {
      onToast(String(t.genericError), 'error')
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitial() {
      const requestId = ++loadRequestId.current
      setIsLoading(true)
      try {
        const tournamentsResult = await fetchDashboardTournaments(user.token)
        if (!isMounted || requestId !== loadRequestId.current) {
          return
        }

        if (!tournamentsResult.ok || !tournamentsResult.data) {
          onToast(tournamentsResult.message || String(t.genericError), 'error')
          return
        }

        const nextTournaments = tournamentsResult.data
        const nextTournamentId = String(nextTournaments[0]?.id ?? '')
        setTournaments(nextTournaments)
        setSelectedTournamentId(nextTournamentId)

        if (nextTournamentId) {
          clearTournamentData()
          const data = await fetchTournamentData(nextTournamentId)
          if (isMounted && requestId === loadRequestId.current) {
            applyTournamentData(data)
          }
        }
      } catch {
        if (isMounted) {
          onToast(String(t.genericError), 'error')
        }
      } finally {
        if (isMounted && requestId === loadRequestId.current) {
          setIsLoading(false)
        }
      }
    }

    loadInitial()

    return () => {
      isMounted = false
    }
  }, [])

  const handleTournamentChange = async (tournamentId: string) => {
    const requestId = ++loadRequestId.current
    setSelectedTournamentId(tournamentId)
    setSelectedRound('all')
    setSelectedTeamIds([])
    clearTournamentData()
    setIsLoading(true)
    try {
      const data = await fetchTournamentData(tournamentId)
      if (requestId === loadRequestId.current) {
        applyTournamentData(data)
      }
    } catch {
      onToast(String(t.genericError), 'error')
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoading(false)
      }
    }
  }

  return (
    <section className="admin-dashboard analytics-dashboard">
      {isLoading && <FullPageProcessingOverlay label={copy.loading} />}
      <div className="admin-dashboard-content ratings-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.copy}</p>
        </div>

        <DashboardFilters
          copy={copy}
          model={model}
          selectedRound={selectedRound}
          selectedTeamIds={selectedTeamIds}
          selectedTournamentId={selectedTournamentId}
          tournaments={tournaments}
          onRefresh={() => loadDashboard(selectedTournamentId)}
          onRoundChange={setSelectedRound}
          onTeamChange={setSelectedTeamIds}
          onTournamentChange={handleTournamentChange}
        />

        <DashboardKpiGrid items={model.kpis} />

        <DashboardResultSplit copy={copy} split={model.resultSplit} />

        <DashboardLeagueTable copy={copy} rows={model.leagueRows} />

        <div className="dashboard-form-position-row">
          <DashboardPositionTrend copy={copy} rows={model.positionTrend} />
          <DashboardLastFiveForm emptyText={copy.noRows} rows={model.lastFiveRows} />
        </div>

        <DashboardChartPlaceholders
          emptyText={copy.noRows}
          goalsScoredBars={model.goalsScoredBars}
          scoredConcededRows={model.scoredConcededRows}
          teamAgeDots={model.teamAgeDots}
          teamValueBars={model.teamValueBars}
        />
      </div>
    </section>
  )
}
