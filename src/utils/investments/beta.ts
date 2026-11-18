import { sampleStdDev } from './volatility'

/** Covariance using sample (n-1). Series must be aligned. */
export function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let sum = 0
  for (let i = 0; i < n; i++) sum += (a[i] - ma) * (b[i] - mb)
  return sum / (n - 1)
}

export function beta(portfolioReturns: number[], benchmarkReturns: number[]): number | null {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length)
  if (n < 2) return null
  const p = portfolioReturns.slice(0, n)
  const b = benchmarkReturns.slice(0, n)
  const varB = sampleStdDev(b) ** 2
  if (varB === 0) return null
  return covariance(p, b) / varB
}

export function trackingError(
  portfolioReturns: number[],
  benchmarkReturns: number[],
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length)
  const diffs: number[] = []
  for (let i = 0; i < n; i++) diffs.push(portfolioReturns[i] - benchmarkReturns[i])
  return sampleStdDev(diffs) * Math.sqrt(252)
}

export function informationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[],
): number | null {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length)
  if (n < 2) return null
  const diffs: number[] = []
  for (let i = 0; i < n; i++) diffs.push(portfolioReturns[i] - benchmarkReturns[i])
  const excessAnn =
    diffs.reduce((s, r) => s + r, 0) / diffs.length * 252
  const te = trackingError(portfolioReturns, benchmarkReturns)
  if (te === 0) return null
  return excessAnn / te
}
