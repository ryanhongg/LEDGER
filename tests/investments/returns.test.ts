import { describe, it, expect } from 'vitest'
import {
  simpleReturn,
  dailyReturns,
  cumulativeReturn,
  annualizedReturn,
  timeWeightedReturn,
  moneyWeightedReturn,
  normalizeTo100,
} from '@/utils/investments/returns'
import { annualizedVolatility, sampleStdDev } from '@/utils/investments/volatility'
import { sharpeRatio } from '@/utils/investments/sharpe'
import { maxDrawdown } from '@/utils/investments/drawdown'
import { beta } from '@/utils/investments/beta'
import { historicalVaR } from '@/utils/investments/var'
import { pearsonCorrelation } from '@/utils/investments/correlation'
import { computeEfficientFrontier } from '@/utils/investments/optimization'

describe('return metrics', () => {
  it('simple and cumulative returns', () => {
    expect(simpleReturn(100, 110)).toBeCloseTo(0.1)
    expect(cumulativeReturn([0.1, -0.05])).toBeCloseTo(0.045)
  })

  it('annualized return formula', () => {
    const cum = 0.1
    const ann = annualizedReturn(cum, 126)
    expect(ann).toBeCloseTo(Math.pow(1.1, 252 / 126) - 1)
  })

  it('time-weighted return isolates external flows', () => {
    const valuations = [
      { date: '2025-01-01', value: 100 },
      { date: '2025-02-01', value: 160 }, // includes +50 deposit at end
      { date: '2025-03-01', value: 176 },
    ]
    const twr = timeWeightedReturn(valuations, [
      { date: '2025-02-01', amount: 50 },
    ])
    // period1: (110-100)/100 = 0.1 ; period2: (176-160)/160 = 0.1
    expect(twr).toBeCloseTo(0.21, 2)
  })

  it('money-weighted return solves IRR', () => {
    const mwr = moneyWeightedReturn(
      [{ date: '2025-01-01', amount: 1000 }],
      1100,
      '2026-01-01',
    )
    expect(mwr).not.toBeNull()
    expect(mwr!).toBeCloseTo(0.1, 2)
  })

  it('normalize to 100', () => {
    expect(normalizeTo100([50, 55, 60])[0]).toBe(100)
    expect(normalizeTo100([50, 55, 60])[2]).toBeCloseTo(120)
  })
})

describe('risk metrics', () => {
  const rets = dailyReturns([100, 101, 99, 102, 98, 103, 101, 104, 100, 105, 103, 106])

  it('volatility and sharpe', () => {
    expect(sampleStdDev(rets)).toBeGreaterThan(0)
    expect(annualizedVolatility(rets)).toBeGreaterThan(0)
    const s = sharpeRatio(rets, 0)
    expect(s).not.toBeNull()
  })

  it('max drawdown', () => {
    const dd = maxDrawdown([
      { date: 'a', value: 100 },
      { date: 'b', value: 120 },
      { date: 'c', value: 90 },
      { date: 'd', value: 95 },
      { date: 'e', value: 120 },
    ])
    expect(dd.maxDrawdown).toBeCloseTo(-0.25)
    expect(dd.peakDate).toBe('b')
    expect(dd.troughDate).toBe('c')
    expect(dd.recoveryDate).toBe('e')
  })

  it('beta of identical series is ~1', () => {
    expect(beta(rets, rets)).toBeCloseTo(1, 5)
  })

  it('historical VaR returns positive loss estimate', () => {
    const long = Array.from({ length: 40 }, (_, i) => Math.sin(i) * 0.01)
    const v = historicalVaR(long, 0.95, 1)
    expect(v).not.toBeNull()
    expect(v!).toBeGreaterThanOrEqual(0)
  })

  it('correlation of series with itself is 1', () => {
    expect(pearsonCorrelation(rets, rets)).toBeCloseTo(1, 5)
  })

  it('efficient frontier respects long-only constraints', () => {
    const r1 = Array.from({ length: 60 }, (_, i) => 0.001 + Math.sin(i / 5) * 0.01)
    const r2 = Array.from({ length: 60 }, (_, i) => 0.0005 + Math.cos(i / 7) * 0.012)
    const result = computeEfficientFrontier({
      symbols: ['A', 'B'],
      returns: [r1, r2],
      riskFreeRate: 0.02,
      maxWeight: 1,
    })
    expect(result.maxSharpe.weights.every((w) => w >= -1e-9)).toBe(true)
    expect(result.maxSharpe.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
    expect(result.points.length).toBeGreaterThan(0)
  })
})
