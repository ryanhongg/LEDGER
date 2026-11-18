/** All monetary values are stored as integer cents. */

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function parseAmountToCents(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value * 100)
  }
  const cleaned = value.replace(/[$,\s]/g, '')
  const parsed = parseFloat(cleaned)
  if (Number.isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}

export function formatCurrency(
  cents: number,
  options: { currency?: string; compact?: boolean; showSign?: boolean } = {},
): string {
  const { currency = 'USD', compact = false, showSign = false } = options
  const dollars = centsToDollars(cents)
  const abs = Math.abs(dollars)

  if (compact && abs >= 1000) {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(abs)
    if (showSign && cents > 0) return `+${formatted}`
    if (cents < 0) return `-${formatted}`
    return formatted
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)

  if (showSign && cents > 0) return `+${formatted}`
  if (cents < 0) return `-${formatted}`
  return cents < 0 ? `-${formatted}` : formatted
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function addCents(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0)
}

export function subtractCents(a: number, b: number): number {
  return a - b
}
