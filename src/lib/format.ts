// Shared locale-aware formatters. Values are stored and counted as plain
// numbers; only the presentation changes per locale (digit shapes, separators,
// the percent sign and its position).

const numbers = new Map<string, Intl.NumberFormat>()
const percents = new Map<string, Intl.NumberFormat>()

export function formatNumber(locale: string, value: number): string {
  let formatter = numbers.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale)
    numbers.set(locale, formatter)
  }
  return formatter.format(value)
}

/** `percent` is a whole-number percentage (42), not a fraction (0.42). */
export function formatPercent(locale: string, percent: number): string {
  let formatter = percents.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 })
    percents.set(locale, formatter)
  }
  return formatter.format(percent / 100)
}

const byteUnits = new Map<string, Intl.NumberFormat>()

/** File size in the reader's own units and digit shapes. */
export function formatBytes(locale: string, bytes: number): string {
  const unit = bytes < 1024 ? 'byte' : bytes < 1024 * 1024 ? 'kilobyte' : 'megabyte'
  const divisor = unit === 'byte' ? 1 : unit === 'kilobyte' ? 1024 : 1024 * 1024
  const digits = unit === 'megabyte' ? 1 : 0
  const key = `${locale}:${unit}:${digits}`
  let formatter = byteUnits.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    byteUnits.set(key, formatter)
  }
  return formatter.format(bytes / divisor)
}
