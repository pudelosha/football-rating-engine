import { useEffect, useRef, useState } from 'react'
import type { DashboardCopy, DashboardModel } from '../types'
import type { TournamentSummary } from '../../../shared/types'

export function DashboardFilters({
  copy,
  model,
  selectedRound,
  selectedTeamIds,
  selectedTournamentId,
  tournaments,
  onRefresh,
  onRoundChange,
  onTeamChange,
  onTournamentChange,
}: {
  copy: DashboardCopy
  model: DashboardModel
  selectedRound: string
  selectedTeamIds: string[]
  selectedTournamentId: string
  tournaments: TournamentSummary[]
  onRefresh: () => void
  onRoundChange: (round: string) => void
  onTeamChange: (teamIds: string[]) => void
  onTournamentChange: (tournamentId: string) => void
}) {
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false)
  const menuRef = useRef<HTMLLabelElement>(null)
  const selectedTeamNames = selectedTeamIds.length === 0
    ? copy.allTeams
    : model.teamOptions
      .filter((team) => selectedTeamIds.includes(String(team.id)))
      .map((team) => team.name)
      .join(', ')

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsTeamMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleTeam(teamId: string) {
    onTeamChange(
      selectedTeamIds.includes(teamId)
        ? selectedTeamIds.filter((id) => id !== teamId)
        : [...selectedTeamIds, teamId],
    )
  }

  return (
    <section className="dashboard-filter-panel football-filter-panel">
      <label>
        <span>{copy.tournament}</span>
        <select value={selectedTournamentId} onChange={(event) => onTournamentChange(event.target.value)}>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name} {tournament.season}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy.round}</span>
        <select value={selectedRound} onChange={(event) => onRoundChange(event.target.value)}>
          <option value="all">{copy.allRounds}</option>
          {model.roundOptions.map((round) => (
            <option key={round} value={round}>{round}</option>
          ))}
        </select>
      </label>
      <label className="dashboard-team-multiselect" ref={menuRef}>
        <span>{copy.teamScope}</span>
        <button
          className="dashboard-multiselect-trigger"
          type="button"
          aria-expanded={isTeamMenuOpen}
          onClick={() => setIsTeamMenuOpen((current) => !current)}
        >
          <span>{selectedTeamNames}</span>
          <b aria-hidden="true">▾</b>
        </button>
        {isTeamMenuOpen && (
          <div className="dashboard-multiselect-menu">
            <button className={selectedTeamIds.length === 0 ? 'active' : ''} type="button" onClick={() => onTeamChange([])}>
              {copy.allTeams}
            </button>
            {model.teamOptions.map((team) => (
              <button
                className={selectedTeamIds.includes(String(team.id)) ? 'active' : ''}
                key={team.id}
                type="button"
                onClick={() => toggleTeam(String(team.id))}
              >
                <span />
                {team.name}
              </button>
            ))}
          </div>
        )}
      </label>
      <button type="button" onClick={onRefresh}>
        {copy.refresh}
      </button>
    </section>
  )
}
