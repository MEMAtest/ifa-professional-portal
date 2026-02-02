/**
 * Shared date utilities for the tasks module
 */

/** Returns start-of-day and end-of-day Date objects for today */
export function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}
