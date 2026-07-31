import type { SortDirection } from '../../types'

type SortableHeaderProps<TKey extends string> = {
  label: string
  sortKey: TKey
  activeSortKey: TKey
  direction: SortDirection
  onSort: (key: TKey) => void
}

export function SortableHeader<TKey extends string>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: SortableHeaderProps<TKey>) {
  const isActive = activeSortKey === sortKey

  return (
    <button
      className="table-sort-button"
      type="button"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <span className="sort-indicator" aria-hidden="true">{isActive ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  )
}
