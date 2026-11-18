import { TRADING_DAYS_PER_YEAR } from './returns'

/** Sample standard deviation (n-1). */
export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/** Population standard deviation (n). */
export function populationStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Annualized volatility from daily returns using sample stdev × √252. */
export function annualizedVolatility(dailyReturns: number[]): number {
  return sampleStdDev(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR)
}

export function downsideDeviation(dailyReturns: number[], mar = 0): number {
  const downside = dailyReturns.filter((r) => r < mar).map((r) => r - mar)
  if (downside.length < 2) return 0
  const sq = downside.reduce((s, r) => s + r * r, 0) / (downside.length - 1)
  return Math.sqrt(sq) * Math.sqrt(TRADING_DAYS_PER_YEAR)
}
