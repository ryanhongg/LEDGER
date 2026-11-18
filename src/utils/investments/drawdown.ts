export interface DrawdownResult {
  maxDrawdown: number
  peakDate: string
  troughDate: string
  recoveryDate: string | null
  series: { date: string; drawdown: number }[]
}

export function maxDrawdown(
  points: { date: string; value: number }[],
): DrawdownResult {
  if (points.length === 0) {
    return {
      maxDrawdown: 0,
      peakDate: '',
      troughDate: '',
      recoveryDate: null,
      series: [],
    }
  }

  let peak = points[0].value
  let peakDate = points[0].date
  let maxDd = 0
  let ddPeakDate = peakDate
  let ddTroughDate = peakDate
  let troughValue = peak
  const series: { date: string; drawdown: number }[] = []

  for (const p of points) {
    if (p.value > peak) {
      peak = p.value
      peakDate = p.date
    }
    const dd = peak === 0 ? 0 : (p.value - peak) / peak
    series.push({ date: p.date, drawdown: dd })
    if (dd < maxDd) {
      maxDd = dd
      ddPeakDate = peakDate
      ddTroughDate = p.date
      troughValue = p.value
    }
  }

  let recoveryDate: string | null = null
  const troughIdx = points.findIndex((p) => p.date === ddTroughDate)
  const peakAtDrawdown = points.find((p) => p.date === ddPeakDate)?.value ?? troughValue
  for (let i = troughIdx + 1; i < points.length; i++) {
    if (points[i].value >= peakAtDrawdown) {
      recoveryDate = points[i].date
      break
    }
  }

  return {
    maxDrawdown: maxDd,
    peakDate: ddPeakDate,
    troughDate: ddTroughDate,
    recoveryDate,
    series,
  }
}

export function calmarRatio(annualizedReturn: number, maxDd: number): number | null {
  if (maxDd === 0) return null
  return annualizedReturn / Math.abs(maxDd)
}
