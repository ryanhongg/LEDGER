/**
 * DEMO market prices — clearly synthetic for offline / no-API-key use.
 * NEVER present these as live market observations in the UI without the demo label.
 */
import type { HistoricalBar, MarketQuote } from '@/types/investment'
import { dollarsToCents } from '@/utils/currency'

type DemoSeries = {
  symbol: string
  name: string
  exchange: string
  assetType: 'stock' | 'etf'
  sector: string
  /** Starting price in dollars ~6 months ago */
  start: number
  /** Drift / day */
  drift: number
  vol: number
}

const SPECS: DemoSeries[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', assetType: 'stock', sector: 'Technology', start: 198, drift: 0.0004, vol: 0.012 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', assetType: 'stock', sector: 'Technology', start: 415, drift: 0.00035, vol: 0.011 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', assetType: 'stock', sector: 'Technology', start: 95, drift: 0.0012, vol: 0.025 },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ', assetType: 'stock', sector: 'Communication Services', start: 155, drift: 0.0005, vol: 0.014 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', assetType: 'stock', sector: 'Consumer Discretionary', start: 175, drift: 0.00045, vol: 0.015 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEARCA', assetType: 'etf', sector: 'Broad Market', start: 510, drift: 0.0003, vol: 0.008 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', assetType: 'etf', sector: 'Technology', start: 440, drift: 0.0004, vol: 0.01 },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSEARCA', assetType: 'etf', sector: 'Small Cap', start: 205, drift: 0.0002, vol: 0.012 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', assetType: 'stock', sector: 'Technology', start: 145, drift: 0.0006, vol: 0.022 },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', assetType: 'stock', sector: 'Communication Services', start: 480, drift: 0.00055, vol: 0.016 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', assetType: 'stock', sector: 'Technology', start: 145, drift: 0.0007, vol: 0.018 },
]

/** Deterministic PRNG for reproducible demo series. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tradingDaysBack(n: number, end = new Date()): string[] {
  const dates: string[] = []
  const d = new Date(end)
  while (dates.length < n) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().slice(0, 10))
    }
    d.setDate(d.getDate() - 1)
  }
  return dates.reverse()
}

function buildBars(spec: DemoSeries, days = 160): HistoricalBar[] {
  const rand = mulberry32(
    [...spec.symbol].reduce((s, c) => s + c.charCodeAt(0), 0) * 997,
  )
  const dates = tradingDaysBack(days)
  let price = spec.start
  return dates.map((date) => {
    const shock = (rand() - 0.5) * 2 * spec.vol
    price = Math.max(1, price * (1 + spec.drift + shock))
    const open = price * (1 + (rand() - 0.5) * 0.004)
    const high = Math.max(open, price) * (1 + rand() * 0.006)
    const low = Math.min(open, price) * (1 - rand() * 0.006)
    const close = price
    return {
      date,
      openCents: dollarsToCents(open),
      highCents: dollarsToCents(high),
      lowCents: dollarsToCents(low),
      closeCents: dollarsToCents(close),
      adjustedCloseCents: dollarsToCents(close),
      volume: Math.floor(5_000_000 + rand() * 20_000_000),
    }
  })
}

const BAR_CACHE: Record<string, HistoricalBar[]> = {}
for (const spec of SPECS) {
  BAR_CACHE[spec.symbol] = buildBars(spec)
}

export function getDemoSecurityMeta(symbol: string) {
  return SPECS.find((s) => s.symbol === symbol.toUpperCase())
}

export function listDemoSecurities() {
  return SPECS.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    exchange: s.exchange,
    assetType: s.assetType,
    sector: s.sector,
    currency: 'USD',
  }))
}

export function getDemoHistory(symbol: string): HistoricalBar[] {
  return BAR_CACHE[symbol.toUpperCase()] ?? []
}

export function getDemoQuote(symbol: string): MarketQuote | null {
  const bars = getDemoHistory(symbol)
  if (bars.length === 0) return null
  const last = bars[bars.length - 1]
  const prev = bars[bars.length - 2]
  return {
    symbol: symbol.toUpperCase(),
    priceCents: last.adjustedCloseCents,
    previousCloseCents: prev?.adjustedCloseCents,
    openCents: last.openCents,
    highCents: last.highCents,
    lowCents: last.lowCents,
    volume: last.volume,
    timestamp: `${last.date}T21:00:00.000Z`,
    provider: 'demo',
    priceType: 'demo',
    freshness: 'demo',
    isDemo: true,
  }
}

export function searchDemoSecurities(query: string) {
  const q = query.toLowerCase()
  return listDemoSecurities().filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
  )
}
