import { annualizedVolatility, downsideDeviation } from './volatility'
import { annualizedReturn, cumulativeReturn } from './returns'

export function sharpeRatio(
  dailyReturns: number[],
  riskFreeAnnual = 0.04,
): number | null {
  if (dailyReturns.length < 2) return null
  const cum = cumulativeReturn(dailyReturns)
  const ann = annualizedReturn(cum, dailyReturns.length)
  const vol = annualizedVolatility(dailyReturns)
  if (vol === 0) return null
  return (ann - riskFreeAnnual) / vol
}

export function sortinoRatio(
  dailyReturns: number[],
  riskFreeAnnual = 0.04,
): number | null {
  if (dailyReturns.length < 2) return null
  const cum = cumulativeReturn(dailyReturns)
  const ann = annualizedReturn(cum, dailyReturns.length)
  const dd = downsideDeviation(dailyReturns)
  if (dd === 0) return null
  return (ann - riskFreeAnnual) / dd
}
