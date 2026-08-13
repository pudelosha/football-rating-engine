import { useEffect, useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type { TournamentSummary } from '../../../shared/types'
import { bettingTournamentOptions, bettingTournamentParticipants } from '../model/socialBettingModel'
import { fetchSourceTournaments } from '../services/socialBettingService'
import type { SocialBettingTournamentFormProps } from '../types'

type BetPoolMode = 'fixed' | 'credits'

export function SocialBettingTournamentFormPage({
  tournamentId,
  user,
  onBack,
  onSaved,
  onToast,
}: SocialBettingTournamentFormProps) {
  const isEditMode = Boolean(tournamentId)
  const editedTournament = useMemo(
    () => bettingTournamentOptions.find((tournament) => tournament.id === tournamentId),
    [tournamentId],
  )
  const [sourceTournaments, setSourceTournaments] = useState<TournamentSummary[]>([])
  const [sourceTournamentId, setSourceTournamentId] = useState('')
  const [name, setName] = useState(editedTournament?.name ?? '')
  const [allowExactScoreBonus, setAllowExactScoreBonus] = useState(true)
  const [allowQualifierPick, setAllowQualifierPick] = useState(false)
  const [applyMissingBetPenalty, setApplyMissingBetPenalty] = useState(true)
  const [missingBetPenalty, setMissingBetPenalty] = useState('-1')
  const [poolMode, setPoolMode] = useState<BetPoolMode>('fixed')
  const [baseBetAmount, setBaseBetAmount] = useState('1')
  const [startingCredits, setStartingCredits] = useState('1000')
  const [maxBetPerGame, setMaxBetPerGame] = useState('5')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadSourceTournaments() {
      setIsLoading(true)
      try {
        const result = await fetchSourceTournaments(user.token)
        if (!isMounted) {
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || 'Could not load source tournaments.', 'error')
          return
        }

        setSourceTournaments(result.data)
        if (isEditMode) {
          const source = result.data.find((tournament) =>
            `${tournament.name} ${tournament.season}` === editedTournament?.linkedTournament)
          setSourceTournamentId(source ? String(source.id) : '')
        }
      } catch {
        if (isMounted) {
          onToast('Could not load source tournaments.', 'error')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSourceTournaments()

    return () => {
      isMounted = false
    }
  }, [editedTournament?.linkedTournament, isEditMode, onToast, user.token])

  function saveTournament() {
    if (!name.trim()) {
      onToast('Tournament name is required.', 'error')
      return
    }

    if (!sourceTournamentId) {
      onToast('Source tournament is required.', 'error')
      return
    }

    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      onToast(isEditMode ? 'Betting tournament updated.' : 'Betting tournament created.', 'success')
      onSaved()
    }, 650)
  }

  return (
    <section className="admin-dashboard social-betting-page">
      {(isLoading || isSaving) && (
        <FullPageProcessingOverlay label={isSaving ? 'Saving betting tournament.' : 'Loading tournaments.'} />
      )}
      <div className="admin-dashboard-content social-betting-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">Betting</p>
          <h1>{isEditMode ? 'Edit tournament' : 'Create tournament'}</h1>
          <p>
            Configure a private prediction tournament linked to an existing competition. Match results will be checked
            against the linked source tournament when backend storage is enabled.
          </p>
        </div>

        <div className="details-top-actions rating-top-actions">
          <button type="button" onClick={onBack}>
            <MenuIcon name="arrow-left" />
            Back to Social Betting
          </button>
        </div>

        <section className="details-panel social-betting-form-card">
          <div className="details-panel-heading">
            <MenuIcon name="tournaments" />
            <h2>Tournament identity</h2>
          </div>
          <div className="social-betting-form-grid two-columns">
            <label>
              <span>Source tournament</span>
              <select
                value={sourceTournamentId}
                disabled={isEditMode}
                onChange={(event) => setSourceTournamentId(event.target.value)}
              >
                <option value="">Select source tournament</option>
                {sourceTournaments.map((tournament) => (
                  <option value={tournament.id} key={tournament.id}>
                    {tournament.name} {tournament.season}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Betting tournament name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Weekend league pool" />
            </label>
          </div>
          {isEditMode && (
            <p className="social-betting-lock-note">
              Source tournament is locked after creation to protect already placed bets and result settlement.
            </p>
          )}
        </section>

        <section className="details-panel social-betting-form-card">
          <div className="details-panel-heading">
            <MenuIcon name="ratings" />
            <h2>Scoring settings</h2>
          </div>
          <div className="social-betting-settings-grid">
            <SettingToggle
              checked={allowExactScoreBonus}
              description="Award extra points when the exact regular-time score is predicted."
              label="Exact score bonus"
              onChange={setAllowExactScoreBonus}
            />
            <SettingToggle
              checked={allowQualifierPick}
              description="Allow knockout-phase picks for the team that qualifies to the next round."
              label="Qualification pick"
              onChange={setAllowQualifierPick}
            />
            <SettingToggle
              checked={applyMissingBetPenalty}
              description="Subtract points when a participant misses a required prediction."
              label="Missing bet penalty"
              onChange={setApplyMissingBetPenalty}
            />
            <label className="social-betting-number-field">
              <span>Penalty points</span>
              <input
                type="number"
                min="-10"
                max="-1"
                disabled={!applyMissingBetPenalty}
                value={missingBetPenalty}
                onChange={(event) => setMissingBetPenalty(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="details-panel social-betting-form-card">
          <div className="details-panel-heading">
            <MenuIcon name="slips" />
            <h2>Bet amount mode</h2>
          </div>
          <div className="social-betting-mode-switch">
            <button className={poolMode === 'fixed' ? 'active' : ''} type="button" onClick={() => setPoolMode('fixed')}>
              Fixed base amount
            </button>
            <button className={poolMode === 'credits' ? 'active' : ''} type="button" onClick={() => setPoolMode('credits')}>
              Player credit pool
            </button>
          </div>
          <div className="social-betting-form-grid three-columns">
            <label>
              <span>Base amount per bet</span>
              <input type="number" min="1" value={baseBetAmount} onChange={(event) => setBaseBetAmount(event.target.value)} />
            </label>
            <label>
              <span>Starting credits</span>
              <input
                type="number"
                min="1"
                disabled={poolMode === 'fixed'}
                value={startingCredits}
                onChange={(event) => setStartingCredits(event.target.value)}
              />
            </label>
            <label>
              <span>Max bet per game</span>
              <input
                type="number"
                min="1"
                max="10"
                disabled={poolMode === 'fixed'}
                value={maxBetPerGame}
                onChange={(event) => setMaxBetPerGame(event.target.value)}
              />
            </label>
          </div>
          <p className="social-betting-lock-note">
            In fixed mode every pick uses the same base amount. In credit pool mode players can risk earned points, but
            a minimum base bet remains available if they run out of credits.
          </p>
        </section>

        <section className="details-panel social-betting-form-card">
          <div className="details-panel-heading">
            <MenuIcon name="teams" />
            <h2>Participants</h2>
          </div>
          <div className="tournament-table-shell compact-table-shell">
            <table className="tournament-table social-betting-participants-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bettingTournamentParticipants.map((participant) => (
                  <tr key={participant.id}>
                    <td><strong>{participant.name}</strong></td>
                    <td>{participant.email}</td>
                    <td>
                      <span className={`social-betting-status-pill ${participant.status.toLowerCase()}`}>
                        {participant.status}
                      </span>
                    </td>
                    <td>
                      <div className="social-betting-participant-actions">
                        <button type="button">Resend invite</button>
                        <button className="danger" type="button">Exclude</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="tournament-form-actions social-betting-save-actions">
          <button type="button" onClick={onBack}>Cancel</button>
          <button type="button" onClick={saveTournament}>
            {isEditMode ? 'Save tournament' : 'Create tournament'}
          </button>
        </div>
      </div>
    </section>
  )
}

function SettingToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <label className="social-betting-setting-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </label>
  )
}
