import { describe, it, expect } from 'vitest'
import { mergeQuote } from '@/services/marketData/MarketDataService'
import type { MarketQuote } from '@/types/investment'

const good: MarketQuote = {
  symbol: 'AAPL',
  priceCents: 35627,
  timestamp: '2026-11-13T21:00:00+00:00',
  provider: 'tiingo',
  priceType: 'reference',
  freshness: 'end_of_day',
  isDemo: false,
}

const unavailable: MarketQuote = {
  symbol: 'AAPL',
  priceCents: 0,
  timestamp: '2026-11-14T02:00:00+00:00',
  provider: 'tiingo',
  priceType: 'end_of_day',
  freshness: 'unavailable',
  isDemo: false,
}

describe('quote merge policy', () => {
  it('keeps prior live mark when next quote is unavailable', () => {
    const merged = mergeQuote(good, unavailable)
    expect(merged.priceCents).toBe(35627)
    expect(merged.freshness).toBe('stale')
    expect(merged.isDemo).toBe(false)
  })

  it('accepts a newer usable quote', () => {
    const next: MarketQuote = { ...good, priceCents: 36000, freshness: 'live_reference' }
    expect(mergeQuote(good, next).priceCents).toBe(36000)
  })

  it('maps symbols distinctly for multi-security bags', () => {
    const aapl = mergeQuote(undefined, { ...good, symbol: 'AAPL' })
    const nvda = mergeQuote(undefined, {
      ...good,
      symbol: 'NVDA',
      priceCents: 16285,
    })
    expect(aapl.symbol).toBe('AAPL')
    expect(nvda.symbol).toBe('NVDA')
    expect(aapl.priceCents).not.toBe(nvda.priceCents)
  })
})
