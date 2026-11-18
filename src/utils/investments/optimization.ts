import { sampleStdDev } from './volatility'
import { covariance } from './beta'
import { TRADING_DAYS_PER_YEAR } from './returns'

export interface OptimizationInput {
  symbols: string[]
  /** Aligned daily return matrix: returns[i][t] for asset i */
  returns: number[][]
  riskFreeRate?: number
  maxWeight?: number
}

export interface OptimizedPortfolio {
  weights: number[]
  expectedAnnualReturn: number
  annualVolatility: number
  sharpe: number
}

export interface EfficientFrontierResult {
  points: OptimizedPortfolio[]
  minVariance: OptimizedPortfolio
  maxSharpe: OptimizedPortfolio
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function covMatrix(returns: number[][]): number[][] {
  const n = returns.length
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const c = covariance(returns[i], returns[j])
      m[i][j] = c
      m[j][i] = c
    }
  }
  return m
}

function portfolioReturn(weights: number[], means: number[]): number {
  return weights.reduce((s, w, i) => s + w * means[i], 0)
}

function portfolioVariance(weights: number[], cov: number[][]): number {
  let v = 0
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      v += weights[i] * weights[j] * cov[i][j]
    }
  }
  return v
}

function normalize(w: number[], maxWeight: number): number[] {
  const clipped = w.map((x) => Math.min(maxWeight, Math.max(0, x)))
  const sum = clipped.reduce((a, b) => a + b, 0)
  if (sum === 0) return clipped.map(() => 1 / clipped.length)
  return clipped.map((x) => x / sum)
}

function evaluate(
  weights: number[],
  means: number[],
  cov: number[][],
  rf: number,
): OptimizedPortfolio {
  const dailyRet = portfolioReturn(weights, means)
  const dailyVar = portfolioVariance(weights, cov)
  const annRet = dailyRet * TRADING_DAYS_PER_YEAR
  const annVol = Math.sqrt(Math.max(0, dailyVar)) * Math.sqrt(TRADING_DAYS_PER_YEAR)
  const sharpe = annVol === 0 ? 0 : (annRet - rf) / annVol
  return {
    weights: [...weights],
    expectedAnnualReturn: annRet,
    annualVolatility: annVol,
    sharpe,
  }
}

/** Random long-only portfolios + local refinement for frontier approximation. */
export function computeEfficientFrontier(
  input: OptimizationInput,
  numPortfolios = 400,
): EfficientFrontierResult {
  const { returns, riskFreeRate = 0.04, maxWeight = 1 } = input
  const n = returns.length
  if (n === 0 || returns[0].length < 10) {
    throw new Error('Insufficient return history for optimization')
  }

  const means = returns.map((r) => mean(r))
  const cov = covMatrix(returns)
  const points: OptimizedPortfolio[] = []

  // Equal weight
  points.push(evaluate(normalize(Array(n).fill(1), maxWeight), means, cov, riskFreeRate))

  // Single-asset corners
  for (let i = 0; i < n; i++) {
    const w = Array(n).fill(0)
    w[i] = 1
    points.push(evaluate(normalize(w, maxWeight), means, cov, riskFreeRate))
  }

  for (let p = 0; p < numPortfolios; p++) {
    const raw = Array.from({ length: n }, () => Math.random())
    // Bias some toward lower variance via inverse-vol heuristic
    if (p % 5 === 0) {
      for (let i = 0; i < n; i++) {
        const vol = sampleStdDev(returns[i]) || 1
        raw[i] = 1 / vol
      }
    }
    const w = normalize(raw, maxWeight)
    points.push(evaluate(w, means, cov, riskFreeRate))
  }

  // Target-return projections: blend min-vol and max-return assets
  const sortedByRet = means
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m - b.m)
  for (let t = 0; t <= 20; t++) {
    const w = Array(n).fill(0)
    const lo = sortedByRet[0].i
    const hi = sortedByRet[sortedByRet.length - 1].i
    const alpha = t / 20
    w[lo] = 1 - alpha
    w[hi] = alpha
    // distribute remainder randomly among others for diversity
    for (let i = 0; i < n; i++) {
      if (i !== lo && i !== hi) w[i] = Math.random() * 0.15
    }
    points.push(evaluate(normalize(w, maxWeight), means, cov, riskFreeRate))
  }

  let minVariance = points[0]
  let maxSharpe = points[0]
  for (const pt of points) {
    if (pt.annualVolatility < minVariance.annualVolatility) minVariance = pt
    if (pt.sharpe > maxSharpe.sharpe) maxSharpe = pt
  }

  // Sort by volatility for frontier display; keep Pareto-ish lower envelope
  const sorted = [...points].sort((a, b) => a.annualVolatility - b.annualVolatility)
  const frontier: OptimizedPortfolio[] = []
  let bestRet = -Infinity
  for (const pt of sorted) {
    if (pt.expectedAnnualReturn >= bestRet - 1e-9) {
      frontier.push(pt)
      bestRet = Math.max(bestRet, pt.expectedAnnualReturn)
    }
  }

  return { points: frontier, minVariance, maxSharpe }
}

export function optimizeMaxSharpe(input: OptimizationInput): OptimizedPortfolio {
  return computeEfficientFrontier(input, 600).maxSharpe
}

export function optimizeMinVariance(input: OptimizationInput): OptimizedPortfolio {
  return computeEfficientFrontier(input, 600).minVariance
}
