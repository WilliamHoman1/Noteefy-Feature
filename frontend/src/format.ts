import type { CartPolicy, TeeTime } from './types'

/**
 * Every label below is derived from a database value. Tee times arrive as UTC
 * instants and are rendered in the course's own timezone, which also comes
 * from the course document.
 */

const CART_LABELS: Record<CartPolicy, string> = {
  optional: 'Cart Optional',
  included: 'Cart Included',
  walking_only: 'Walking Only',
}

export function cartLabel(policy: CartPolicy): string {
  return CART_LABELS[policy] ?? policy
}

export function holesLabel(holesOptions: number[]): string {
  if (holesOptions.length === 0) return 'Holes TBD'
  return `${holesOptions.join(' or ')} Holes`
}

export function playersLabel(slots: number): string {
  return `${slots} Player${slots === 1 ? '' : 's'}`
}

export function priceRangeLabel(minCents: number, maxCents: number): string {
  if (minCents === maxCents) return formatDollars(minCents)
  return `${formatDollars(minCents)}-${formatDollars(maxCents)}`
}

function formatDollars(cents: number): string {
  const dollars = cents / 100
  const rounded = Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)
  return `$${rounded}`
}

export function formatTeeTime(iso: string, timeZone?: string | null): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone ?? undefined,
  })
}

export function formatHeadingDate(isoDate: string, timeZone?: string | null): string {
  // isoDate is a calendar date (YYYY-MM-DD); anchor it at noon so the zone shift is safe.
  const date = new Date(`${isoDate}T12:00:00Z`)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timeZone ?? undefined,
  })
}

export function formatBookingWhen(
  iso: string | null,
  timeZone?: string | null,
): string {
  if (!iso) return 'Tee time unavailable'
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone ?? undefined,
  })
}

export function teeTimePrice(tee: TeeTime): string {
  return priceRangeLabel(tee.price_min_cents, tee.price_max_cents)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/** Calendar date in the course's timezone, used for the date pager. */
export function todayInZone(timeZone?: string | null): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone ?? undefined,
  })
  return formatter.format(new Date())
}

export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
