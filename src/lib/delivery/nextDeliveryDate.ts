import type { Customer } from '@/types'
import { addDays, todayStr } from '@/lib/utils'

/**
 * Next scheduled delivery date for a customer.
 *
 * For Weekly / Fortnightly / Monthly customers the calculation is
 * cycle-aware: if the most recent delivery date is known it adds the
 * frequency interval from that anchor rather than blindly finding the
 * next occurrence of the delivery weekday.  This fixes the classic
 * fortnightly bug where receiving goods 2 days after the last delivery
 * (e.g. Monday after a Saturday delivery) would return the very next
 * Saturday instead of the one 14 days later.
 *
 * Priority:
 *   1. nextDeliveryOverride — explicit manual override, used as-is
 *   2. Cycle-based (Weekly/Fortnightly/Monthly) — anchor + interval,
 *      advanced until strictly after `fromDate`
 *   3. Weekday-scan fallback — for 3x Week / 2x Week, no history, etc.
 *
 * @param cust           Customer record
 * @param fromDate       Base date to calculate from (defaults to today)
 * @param lastDelivDate  Most recent delivery date from orders / receiving_log
 */
export function nextDeliveryDate(
  cust: Customer,
  fromDate?: string,
  lastDelivDate?: string
): string {
  // 1. Manual override takes absolute priority
  if (cust.nextDeliveryOverride) {
    return cust.nextDeliveryOverride
  }

  const fromStr = fromDate ?? todayStr()

  // 2. Cycle-based calculation for fixed-interval frequencies
  const cycleInterval: Partial<Record<string, number>> = {
    Weekly: 7,
    Fortnightly: 14,
    Monthly: 30,
  }
  const interval = cycleInterval[cust.frequency]

  if (interval && lastDelivDate) {
    // If the last delivery slot is still in the future, the customer is
    // still in that cycle — return the same slot (don't skip ahead).
    if (lastDelivDate > fromStr) return lastDelivDate

    // Advance from the known anchor by the interval until we land
    // strictly after today (or fromDate).
    let next = lastDelivDate
    while (next <= fromStr) {
      next = addDays(next, interval)
    }
    return next
  }

  // 3. Weekday-scan fallback (used when there is no delivery history,
  //    and always for Daily / On Demand / 3x Week / 2x Week)
  if (cust.frequency === 'Daily') return addDays(fromStr, 1)
  if (cust.frequency === 'On Demand') return addDays(fromStr, 7)

  const from = new Date(fromStr + 'T00:00:00')
  const days =
    cust.deliveryDays && cust.deliveryDays.length
      ? cust.deliveryDays
      : [parseInt(String(cust.dueDay || 4), 10)]

  const fromWd = from.getDay()
  const sortedDays = days.slice().sort((a, b) => a - b)
  const candidates: { day: number; diff: number }[] = []
  for (const dd of sortedDays) {
    let diff = dd - fromWd
    if (diff <= 0) diff += 7
    candidates.push({ day: dd, diff })
  }
  candidates.sort((a, b) => a.diff - b.diff)

  const idx = cust.skipReturn ? 1 : 0
  const chosen = candidates[idx] || candidates[0]
  return addDays(fromStr, chosen.diff)
}
