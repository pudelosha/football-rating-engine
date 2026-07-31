import type { TournamentSummary } from '../../../shared/types'
import type { TeamsTranslation } from '../types'

export function TeamDirectoryFilters({
  countries,
  countryFilter,
  search,
  t,
  tournamentFilter,
  tournaments,
  onCountryFilterChange,
  onSearchChange,
  onTournamentFilterChange,
}: {
  countries: string[]
  countryFilter: string
  search: string
  t: TeamsTranslation
  tournamentFilter: string
  tournaments: TournamentSummary[]
  onCountryFilterChange: (value: string) => void
  onSearchChange: (value: string) => void
  onTournamentFilterChange: (value: string) => void
}) {
  return (
    <div className="team-directory-filters">
      <label>
        <span>{t.teamFilterCountry}</span>
        <select value={countryFilter} onChange={(event) => onCountryFilterChange(event.target.value)}>
          <option value="all">{t.teamFilterAllCountries}</option>
          {countries.map((country) => (
            <option value={country} key={country}>{country}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{t.teamFilterTournament}</span>
        <select value={tournamentFilter} onChange={(event) => onTournamentFilterChange(event.target.value)}>
          <option value="all">{t.teamFilterAllTournaments}</option>
          {tournaments.map((tournament) => (
            <option value={tournament.id} key={tournament.id}>{tournament.name}</option>
          ))}
        </select>
      </label>
      <label className="team-directory-search">
        <span>{t.teamSearch}</span>
        <input
          placeholder={t.teamSearchPlaceholder}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </div>
  )
}
