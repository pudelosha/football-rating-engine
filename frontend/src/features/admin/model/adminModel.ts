export const matchStatusLabels: Record<string, number> = {
  Unknown: 0,
  Upcoming: 1,
  Live: 2,
  Finished: 3,
  Postponed: 4,
  Cancelled: 5,
}

export const matchSyncStateLabels: Record<string, number> = {
  Unknown: 0,
  Scheduled: 1,
  Live: 2,
  Finalized: 3,
  Postponed: 4,
  Cancelled: 5,
}

export const ratingLayerKeys = ['form', 'performance', 'squad'] as const

export const ratingSnapshotStartOffsets = [0, -1, -2, -3, -4, -5] as const
