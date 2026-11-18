/**
 * Historical simulation VaR.
 * Assumptions: i.i.d. historical daily returns; no parametric distribution;
 * VaR is not a maximum possible loss.
 */
export function historicalVaR(
  dailyReturns: number[],
  confidence: 0.95 | 0.99,
  horizonDays: 1 | 5 = 1,
): number | null {
  if (dailyReturns.length < 20) return null
  const sorted = [...dailyReturns].sort((a, b) => a - b)
  const idx = Math.floor((1 - confidence) * sorted.length)
  const dailyVar = -sorted[Math.max(0, idx)]
  return dailyVar * Math.sqrt(horizonDays)
}

export function winRate(dailyReturns: number[]): number {
  if (dailyReturns.length === 0) return 0
  return dailyReturns.filter((r) => r > 0).length / dailyReturns.length
}
