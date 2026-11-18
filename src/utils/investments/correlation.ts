import { covariance } from './beta'
import { sampleStdDev } from './volatility'

/** Pearson correlation of two aligned return series. */
export function pearsonCorrelation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 3) return null
  const x = a.slice(0, n)
  const y = b.slice(0, n)
  const sx = sampleStdDev(x)
  const sy = sampleStdDev(y)
  if (sx === 0 || sy === 0) return null
  return covariance(x, y) / (sx * sy)
}

export function correlationMatrix(seriesMap: Record<string, number[]>): {
  labels: string[]
  matrix: (number | null)[][]
} {
  const labels = Object.keys(seriesMap)
  const matrix = labels.map((a) =>
    labels.map((b) => pearsonCorrelation(seriesMap[a], seriesMap[b])),
  )
  return { labels, matrix }
}
