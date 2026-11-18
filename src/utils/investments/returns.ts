/**
 * Return & performance utilities.
 * Assumptions: 252 trading days/year for annualization.
 */

export const TRADING_DAYS_PER_YEAR = 252

export function simpleReturn(p0: number, p1: number): number {
  if (p0 === 0) return 0
  return (p1 - p0) / p0
}

export function dailyReturns(values: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < values.length; i++) {
    out.push(simpleReturn(values[i - 1], values[i]))
  }
  return out
}

/** Compound cumulative return from a series of period returns. */
export function cumulativeReturn(periodReturns: number[]): number {
  return periodReturns.reduce((acc, r) => acc * (1 + r), 1) - 1
}

export function cumulativeReturnFromValues(values: number[]): number {
  if (values.length < 2) return 0
  return simpleReturn(values[0], values[values.length - 1])
}

/**
 * Annualized return from cumulative return over n trading observations.
 * Annualized = (1 + R)^(252/n) - 1
 */
export function annualizedReturn(cumReturn: number, nObservations: number): number {
  if (nObservations <= 0) return 0
  if (1 + cumReturn <= 0) return -1
  return Math.pow(1 + cumReturn, TRADING_DAYS_PER_YEAR / nObservations) - 1
}

export interface CashFlowEvent {
  date: string
  /** Positive = inflow to portfolio (deposit), negative = outflow (withdrawal) */
  amount: number
}

/**
 * Time-weighted return using valuations immediately around external flows.
 * `points` must be chronological: value after any same-day flow adjustment.
 * Subperiod boundaries occur at each external cash flow.
 */
export function timeWeightedReturn(
  valuations: { date: string; value: number }[],
  flows: CashFlowEvent[],
): number {
  if (valuations.length < 2) return 0
  const flowByDate = new Map<string, number>()
  for (const f of flows) {
    flowByDate.set(f.date, (flowByDate.get(f.date) ?? 0) + f.amount)
  }

  let twr = 1
  for (let i = 1; i < valuations.length; i++) {
    const prev = valuations[i - 1]
    const cur = valuations[i]
    const flow = flowByDate.get(cur.date) ?? 0
    // Value just before flow ≈ cur.value - flow (if flow occurs at end of day)
    const endBeforeFlow = cur.value - flow
    if (prev.value === 0) continue
    const r = (endBeforeFlow - prev.value) / prev.value
    twr *= 1 + r
  }
  return twr - 1
}

/**
 * Money-weighted return via Newton-Raphson IRR on irregular cash flows.
 * Convention: initial investment negative, terminal value positive, deposits negative,
 * withdrawals positive (from investor perspective).
 * Returns null if no meaningful solution.
 */
export function moneyWeightedReturn(
  flows: { date: string; amount: number }[],
  terminalValue: number,
  terminalDate: string,
): number | null {
  if (flows.length === 0) return null
  const start = new Date(flows[0].date).getTime()
  const day = 86400000
  const all = [
    ...flows.map((f) => ({
      t: (new Date(f.date).getTime() - start) / day,
      // Investor: putting money in is negative
      cf: -f.amount,
    })),
    {
      t: (new Date(terminalDate).getTime() - start) / day,
      cf: terminalValue,
    },
  ]

  const npv = (r: number) =>
    all.reduce((s, x) => s + x.cf / Math.pow(1 + r, x.t / 365), 0)
  const dNpv = (r: number) =>
    all.reduce(
      (s, x) => s + (-x.t / 365) * x.cf / Math.pow(1 + r, x.t / 365 + 1),
      0,
    )

  let r = 0.1
  for (let i = 0; i < 50; i++) {
    const f = npv(r)
    const df = dNpv(r)
    if (Math.abs(df) < 1e-12) return null
    const next = r - f / df
    if (!Number.isFinite(next)) return null
    if (Math.abs(next - r) < 1e-10) return next
    r = next
  }
  return Number.isFinite(r) ? r : null
}

/** Normalize series to 100 at start for comparison charts. */
export function normalizeTo100(values: number[]): number[] {
  if (values.length === 0 || values[0] === 0) return values.map(() => 100)
  return values.map((v) => (v / values[0]) * 100)
}
