import { MenuIcon } from '../../../shared/components/Icons'
import type { SortDirection, TournamentSummary, UserTeamDirectoryRow, UserTeamSortKey } from '../../../shared/types'
import type { OpenTeamHandler, TeamsTranslation } from '../types'
import { TeamDirectoryFilters } from './TeamDirectoryFilters'
import { TeamDirectoryTable } from './TeamDirectoryTable'

export function TeamDirectoryPanel({
  countries,
  countryFilter,
  displayedRows,
  isLoading,
  search,
  sortDirection,
  sortKey,
  t,
  tournamentFilter,
  tournaments,
  onCountryFilterChange,
  onOpen,
  onSearchChange,
  onSort,
  onTournamentFilterChange,
}: {
  countries: string[]
  countryFilter: string
  displayedRows: UserTeamDirectoryRow[]
  isLoading: boolean
  search: string
  sortDirection: SortDirection
  sortKey: UserTeamSortKey
  t: TeamsTranslation
  tournamentFilter: string
  tournaments: TournamentSummary[]
  onCountryFilterChange: (value: string) => void
  onOpen: OpenTeamHandler
  onSearchChange: (value: string) => void
  onSort: (key: UserTeamSortKey) => void
  onTournamentFilterChange: (value: string) => void
}) {
  return (
    <section className="details-panel team-directory-panel">
      <div className="details-panel-heading spread betting-selected-heading">
        <div>
          <MenuIcon name="teams" />
          <h2>{t.menuTeams}</h2>
        </div>
      </div>

      <TeamDirectoryFilters
        countries={countries}
        countryFilter={countryFilter}
        search={search}
        t={t}
        tournamentFilter={tournamentFilter}
        tournaments={tournaments}
        onCountryFilterChange={onCountryFilterChange}
        onSearchChange={onSearchChange}
        onTournamentFilterChange={onTournamentFilterChange}
      />

      <TeamDirectoryTable
        isLoading={isLoading}
        rows={displayedRows}
        sortDirection={sortDirection}
        sortKey={sortKey}
        t={t}
        onOpen={onOpen}
        onSort={onSort}
      />
    </section>
  )
}
