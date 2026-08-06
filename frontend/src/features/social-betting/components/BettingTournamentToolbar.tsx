import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingTournamentOption } from '../types'

export function BettingTournamentToolbar({
  selectedTournamentId,
  selectedTournament,
  tournaments,
  playerName,
  onEdit,
  onTournamentChange,
}: {
  selectedTournamentId: number
  selectedTournament?: BettingTournamentOption
  tournaments: BettingTournamentOption[]
  playerName: string
  onEdit: () => void
  onTournamentChange: (id: number) => void
}) {
  const canEditTournament = selectedTournament?.role === 'Admin'

  return (
    <section className="details-panel social-betting-toolbar">
      <div className="social-betting-toolbar-main">
        <label>
          <span>Tournament</span>
          <select value={selectedTournamentId} onChange={(event) => onTournamentChange(Number(event.target.value))}>
            <option value={0}>Select tournament</option>
            {tournaments.map((tournament) => (
              <option value={tournament.id} key={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="social-betting-edit-tournament"
          disabled={!canEditTournament}
          onClick={onEdit}
        >
          <MenuIcon name="edit" />
          <span>Edit</span>
        </button>
      </div>
      <div className="social-betting-context">
        <div>
          <span>Participants</span>
          <strong>{selectedTournament?.participants ?? 0}</strong>
        </div>
        <div>
          <span>Your role</span>
          <strong>{selectedTournament?.role}</strong>
        </div>
        <div>
          <span>Player</span>
          <span className="social-betting-player-line">
            <strong>{playerName}</strong>
            <button type="button" aria-label="Change tournament nickname">Edit</button>
          </span>
        </div>
      </div>
    </section>
  )
}
