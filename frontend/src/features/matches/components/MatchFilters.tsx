import type { MatchesTranslation } from '../types'

export function MatchFilters({
  roundFilter,
  roundOptions,
  search,
  selectedRoundIndex,
  t,
  onNextRound,
  onPreviousRound,
  onRoundFilterChange,
  onSearchChange,
}: {
  roundFilter: string
  roundOptions: string[]
  search: string
  selectedRoundIndex: number
  t: MatchesTranslation
  onNextRound: () => void
  onPreviousRound: () => void
  onRoundFilterChange: (value: string) => void
  onSearchChange: (value: string) => void
}) {
  return (
    <div className="match-filter-bar rating-checkpoint-controls">
      <label className="tournament-search compact">
        <span>{t.matchSearch}</span>
        <input
          placeholder={t.matchSearchPlaceholder}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <div className="round-filter-stepper">
        <label className="label-hidden">
          <span>{t.roundFilter}</span>
          <select value={roundFilter} onChange={(event) => onRoundFilterChange(event.target.value)}>
            <option value="all">{t.allRounds}</option>
            {roundOptions.map((round) => (
              <option value={round} key={round}>{round}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="round-step-button"
          aria-label="Previous round"
          disabled={selectedRoundIndex <= 0}
          onClick={onPreviousRound}
        >
          <span>-</span>
        </button>
        <button
          type="button"
          className="round-step-button"
          aria-label="Next round"
          disabled={roundOptions.length === 0 || selectedRoundIndex >= roundOptions.length - 1}
          onClick={onNextRound}
        >
          <span>+</span>
        </button>
      </div>
    </div>
  )
}
