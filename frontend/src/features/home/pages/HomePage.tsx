import { useCallback, useEffect, useMemo, useState } from 'react'
import { HeroField } from '../../../shared/components/HeroField/HeroField'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type { Language } from '../../../shared/types'
import { BettingLabPanel } from '../components/BettingLabPanel'
import { FeaturedPredictionsPanel } from '../components/FeaturedPredictionsPanel'
import { HomeHero } from '../components/HomeHero'
import { HomePulseGrid } from '../components/HomePulseGrid'
import { MatchExplorerPanel } from '../components/MatchExplorerPanel'
import { RatingsSnapshotPanel } from '../components/RatingsSnapshotPanel'
import { buildHomeDashboardData, getHomeCopy, type HomeTournamentDataset } from '../model/homeModel'
import {
  fetchHomeBettingSummary,
  fetchHomeCombinedRatings,
  fetchHomeTournamentMatches,
  fetchHomeTournaments,
} from '../services/homeService'
import type { HomeDashboardData, HomeNavigateHandler, HomeTranslation, HomeUserSession } from '../types'

export function HomePage({
  language,
  t,
  user,
  onNavigate,
}: {
  language: Language
  t: HomeTranslation
  user: HomeUserSession
  onNavigate: HomeNavigateHandler
}) {
  const displayName = user.displayName || user.email.split('@')[0]
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' })
  const copy = useMemo(() => getHomeCopy(language), [language])
  const emptyDashboardData = useMemo(
    () => buildHomeDashboardData({ copy, datasets: [], t }),
    [copy, t],
  )
  const [dashboardData, setDashboardData] = useState<HomeDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [tournamentsResult, bettingSummaryResult] = await Promise.all([
        fetchHomeTournaments(user.token),
        fetchHomeBettingSummary(user.token),
      ])

      const tournaments = tournamentsResult.ok && tournamentsResult.data
        ? tournamentsResult.data.filter((tournament) => tournament.isActive)
        : []

      const datasets = await Promise.all(
        tournaments.map(async (tournament): Promise<HomeTournamentDataset> => {
          const [matchesResult, ratingsResult] = await Promise.all([
            fetchHomeTournamentMatches(user.token, tournament.id),
            fetchHomeCombinedRatings(user.token, tournament.id),
          ])

          return {
            tournament,
            matches: matchesResult.ok && matchesResult.data ? matchesResult.data : [],
            ratings: ratingsResult.ok && ratingsResult.data ? ratingsResult.data : undefined,
          }
        }),
      )

      setDashboardData(buildHomeDashboardData({
        copy,
        bettingSummary: bettingSummaryResult.ok && bettingSummaryResult.data ? bettingSummaryResult.data : undefined,
        datasets,
        t,
      }))
    } catch {
      setDashboardData(emptyDashboardData)
    } finally {
      setIsLoading(false)
    }
  }, [copy, emptyDashboardData, t, user.token])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const liveData = dashboardData ?? emptyDashboardData

  return (
    <section className="home-dashboard">
      {isLoading && <FullPageProcessingOverlay label={t.loading} />}
      <HeroField />
      <div className="hero-shade" />
      <div className="home-dashboard-content">
        <HomeHero
          copy={copy}
          displayName={displayName}
          t={t}
          today={today}
          onNavigate={onNavigate}
        />

        <HomePulseGrid cards={liveData.pulseCards} />

        <FeaturedPredictionsPanel
          copy={copy}
          rows={liveData.featuredPredictions}
          t={t}
          onNavigate={onNavigate}
        />

        <div className="home-two-column">
          <RatingsSnapshotPanel
            copy={copy}
            rows={liveData.ratingsSnapshot}
            t={t}
            onNavigate={onNavigate}
          />
          <MatchExplorerPanel
            copy={copy}
            items={liveData.matchExplorerItems}
            onNavigate={onNavigate}
          />
        </div>

        <BettingLabPanel
          copy={copy}
          items={liveData.bettingItems}
          onNavigate={onNavigate}
        />
      </div>
    </section>
  )
}
