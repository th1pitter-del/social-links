/**
 * Shared daily buckets for the activity heatmaps. The admin and the creator
 * overviews drew the same 84-day grid from their own copy of this loop; keeping
 * one version means the two grids cannot drift apart in window or alignment.
 */
export const HEAT_DAYS = 84

function startOfDay(offsetDays: number) {
  const date = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Local midnight at the start of a `days`-day window that ends today. */
export function windowStart(days: number) {
  return startOfDay(days - 1)
}

export function buildHeatBuckets(activity: Array<{ createdAt: Date }>) {
  const startDate = startOfDay(HEAT_DAYS)
  const values = Array.from({ length: HEAT_DAYS }, (_, index) => {
    const bucketStart = new Date(startDate)
    bucketStart.setDate(bucketStart.getDate() + index)
    const bucketEnd = new Date(bucketStart)
    bucketEnd.setDate(bucketEnd.getDate() + 1)
    let total = 0
    for (const event of activity) {
      if (event.createdAt >= bucketStart && event.createdAt < bucketEnd) total += 1
    }
    return total
  })
  return { values, startDate }
}

/**
 * Two-series daily buckets for the last `days` days, oldest first. The creator
 * analytics page and a single link's detail page count the same event types, so
 * they share one window definition rather than two loops that can drift by a day
 * around midnight or a DST change.
 */
export function buildDayBuckets(
  events: Array<{ createdAt: Date; type: string }>,
  days: number,
) {
  const startDate = windowStart(days)
  const buckets = Array.from({ length: days }, (_, index) => {
    const bucketStart = new Date(startDate)
    bucketStart.setDate(bucketStart.getDate() + index)
    const bucketEnd = new Date(bucketStart)
    bucketEnd.setDate(bucketEnd.getDate() + 1)
    let primary = 0
    let secondary = 0
    for (const event of events) {
      if (event.createdAt < bucketStart || event.createdAt >= bucketEnd) continue
      if (event.type === 'VIEW') primary += 1
      else if (event.type === 'UNLOCK_COMPLETE') secondary += 1
    }
    return { date: bucketStart, primary, secondary }
  })
  return { buckets, startDate }
}
