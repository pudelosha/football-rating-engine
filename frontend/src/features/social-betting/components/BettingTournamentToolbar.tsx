import type { BettingTournamentOption } from '../types'

export function BettingTournamentToolbar({
  selectedTournamentId,
  selectedTournament,
  tournaments,
  playerName,
  onCreate,
  onTournamentChange,
}: {
  selectedTournamentId: number
  selectedTournament?: BettingTournamentOption
  tournaments: BettingTournamentOption[]
  playerName: string
  onCreate: () => void
  onTournamentChange: (id: number) => void
}) {
  return (
    <section className="details-panel social-betting-toolbar">
      <div className="social-betting-toolbar-main">
        <button type="button" onClick={onCreate}>Create new tournament</button>
        <label>
          <span>Tournament</span>
          <select value={selectedTournamentId} onChange={(event) => onTournamentChange(Number(event.target.value))}>
            {tournaments.map((tournament) => (
              <option value={tournament.id} key={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </label>
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
