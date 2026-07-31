import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingDrawRiskFilter, BettingLeanFilter } from '../../../shared/types'
import type { BettingTranslation } from '../types'
import { BettingMultiSelect } from './BettingMultiSelect'

export function BettingSearchPanel({
  drawOptions,
  drawRiskFilters,
  endDate,
  leanFilters,
  leanOptions,
  startDate,
  t,
  onDrawRiskFiltersChange,
  onEndDateChange,
  onGenerate,
  onLeanFiltersChange,
  onStartDateChange,
}: {
  drawOptions: Array<{ value: BettingDrawRiskFilter; label: string }>
  drawRiskFilters: BettingDrawRiskFilter[]
  endDate: string
  leanFilters: BettingLeanFilter[]
  leanOptions: Array<{ value: BettingLeanFilter; label: string }>
  startDate: string
  t: BettingTranslation
  onDrawRiskFiltersChange: (value: BettingDrawRiskFilter[]) => void
  onEndDateChange: (value: string) => void
  onGenerate: () => void
  onLeanFiltersChange: (value: BettingLeanFilter[]) => void
  onStartDateChange: (value: string) => void
}) {
  return (
    <section className="details-panel betting-generator-panel">
      <div className="details-panel-heading">
        <MenuIcon name="betting" />
        <h2>{t.bettingCreateTitle}</h2>
      </div>
      <p className="panel-muted-copy">{t.bettingCreateCopy}</p>
      <div className="betting-form-grid">
        <label>
          <span>{t.bettingWindowStart}</span>
          <input type="datetime-local" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} />
        </label>
        <label>
          <span>{t.bettingWindowEnd}</span>
          <input type="datetime-local" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} />
        </label>
        <BettingMultiSelect
          label={t.bettingLeanLevel}
          emptyLabel={t.bettingNoneSelected}
          selectedCountLabel={t.bettingSelectedCount}
          options={leanOptions}
          selectedValues={leanFilters}
          onChange={onLeanFiltersChange}
        />
        <BettingMultiSelect
          label={t.bettingDrawRiskLevel}
          emptyLabel={t.bettingNoneSelected}
          selectedCountLabel={t.bettingSelectedCount}
          options={drawOptions}
          selectedValues={drawRiskFilters}
          onChange={onDrawRiskFiltersChange}
        />
      </div>
      <button type="button" className="betting-generate-button" onClick={onGenerate}>
        {t.bettingGenerate}
      </button>
    </section>
  )
}
