export function BettingMultiSelect<TValue extends string>({
  label,
  emptyLabel,
  selectedCountLabel,
  options,
  selectedValues,
  onChange,
}: {
  label: string
  emptyLabel: string
  selectedCountLabel: string
  options: Array<{ value: TValue; label: string }>
  selectedValues: TValue[]
  onChange: (values: TValue[]) => void
}) {
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label)
  const summary = selectedLabels.length <= 2
    ? selectedLabels.join(', ') || emptyLabel
    : `${selectedLabels.length} ${selectedCountLabel}`

  const toggleValue = (value: TValue) => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    )
  }

  return (
    <div className="betting-multi-field">
      <span>{label}</span>
      <details className="betting-multi-select">
        <summary>
          <span>{summary}</span>
          <i aria-hidden="true" />
        </summary>
        <div className="betting-multi-options">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <button
                type="button"
                className={isSelected ? 'active' : ''}
                onClick={() => toggleValue(option.value)}
                key={option.value}
              >
                <b aria-hidden="true">{isSelected ? '✓' : ''}</b>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </details>
    </div>
  )
}
