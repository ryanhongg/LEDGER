/** Quantity: shares × 1_000_000 (supports fractional shares). */
export const Q_SCALE = 1_000_000

/** Price: dollars × 1_000_000 (micro-dollars). Cash stays in integer cents. */
export function sharesToMicros(shares: number): number {
  return Math.round(shares * Q_SCALE)
}

export function microsToShares(micros: number): number {
  return micros / Q_SCALE
}

export function dollarsToPriceMicros(dollars: number): number {
  return Math.round(dollars * Q_SCALE)
}

export function priceMicrosToDollars(micros: number): number {
  return micros / Q_SCALE
}

/** Gross consideration in cents = shares × price. */
export function grossCentsFromTrade(quantityMicros: number, priceMicros: number): number {
  return Math.round((quantityMicros * priceMicros) / 1e10)
}

/** Average cost in micro-dollars from remaining cost basis (cents) and quantity. */
export function avgCostMicros(costBasisCents: number, quantityMicros: number): number {
  if (quantityMicros === 0) return 0
  return Math.round((costBasisCents * 1e10) / quantityMicros)
}

export function formatShares(micros: number, decimals = 4): string {
  return microsToShares(micros).toFixed(decimals)
}
