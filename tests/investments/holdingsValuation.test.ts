import { describe, it, expect } from 'vitest'
import {
  buildHoldings,
  isUsableQuote,
  valuePortfolio,
} from '@/services/investments/ValuationService'
import { sharesToMicros, dollarsToPriceMicros } from '@/utils/investments/decimal'
import { createLotFromBuy } from '@/utils/investments/costBasis'
import type {
  InvestmentTransaction,
  MarketQuote,
  Portfolio,
  Security,
} from '@/types/investment'

function buy(
  id: string,
  shares: number,
  price: number,
  fees = 0,
): InvestmentTransaction {
  const quantityMicros = sharesToMicros(shares)
  const priceMicros = dollarsToPriceMicros(price)
  const gross = Math.round(shares * price * 100)
  return {
    id,
    portfolioId: 'pf1',
    securityId: 'sec-spy',
    type: 'BUY',
    tradeDate: '2025-05-16',
    settlementDate: '2025-05-16',
    quantityMicros,
    priceMicros,
    grossAmountCents: gross,
    feesCents: Math.round(fees * 100),
    netAmountCents: -(gross + Math.round(fees * 100)),
    currency: 'USD',
    createdAt: '2025-05-16',
  }
}

const security: Security = {
  id: 'sec-spy',
  symbol: 'SPY',
  name: 'SPDR S&P 500',
  exchange: 'ARCA',
  assetType: 'etf',
  currency: 'USD',
  providerSymbol: 'SPY',
  createdAt: '2025-01-01',
}

const portfolio: Portfolio = {
  id: 'pf1',
  name: 'Core',
  description: '',
  baseCurrency: 'USD',
  benchmarkSymbol: 'SPY',
  initialCash: 10000000,
  strategy: 'core',
  createdAt: '2025-01-01',
}

describe('holdings valuation mark rules', () => {
  it('treats unavailable zero quotes as unusable', () => {
    expect(
      isUsableQuote({
        symbol: 'SPY',
        priceCents: 0,
        timestamp: new Date().toISOString(),
        provider: 'tiingo',
        priceType: 'end_of_day',
        freshness: 'unavailable',
        isDemo: false,
      }),
    ).toBe(false)
  })

  it('does not invent unrealized PnL when mark is unavailable', () => {
    const txn = buy('t1', 100, 519.66, 0)
    const lot = createLotFromBuy(txn, txn.feesCents)
    const quotes: Record<string, MarketQuote> = {
      SPY: {
        symbol: 'SPY',
        priceCents: 0,
        timestamp: new Date().toISOString(),
        provider: 'tiingo',
        priceType: 'end_of_day',
        freshness: 'unavailable',
        isDemo: false,
      },
    }

    const holdings = buildHoldings([lot], [security], quotes, 'pf1')
    expect(holdings).toHaveLength(1)
    const h = holdings[0]
    expect(h.quantityMicros).toBe(sharesToMicros(100))
    expect(h.costBasisCents).toBeGreaterThan(0)
    expect(h.markAvailable).toBe(false)
    expect(h.marketValueCents).toBe(0)
    expect(h.unrealizedPnLCents).toBe(0)
    expect(h.unrealizedReturnPercent).toBeNull()
    expect(h.weight).toBe(0)

    const valuation = valuePortfolio(portfolio, [txn], [lot], [security], quotes, {})
    // Portfolio unrealized must not equal −costBasis from a missing mark
    expect(valuation.unrealizedPnLCents).toBe(0)
    expect(valuation.securitiesMarketValueCents).toBe(0)
  })

  it('computes MV, cost, unrealized, and weight from a valid quote', () => {
    const txn = buy('t1', 100, 500, 0)
    const lot = createLotFromBuy(txn, 0)
    const quotes: Record<string, MarketQuote> = {
      SPY: {
        symbol: 'SPY',
        priceCents: 75437, // $754.37
        previousCloseCents: 75712,
        timestamp: '2026-11-13T21:00:00+00:00',
        provider: 'tiingo',
        priceType: 'reference',
        freshness: 'end_of_day',
        isDemo: false,
      },
    }

    const holdings = buildHoldings([lot], [security], quotes, 'pf1')
    const h = holdings[0]
    expect(h.markAvailable).toBe(true)
    expect(h.marketValueCents).toBe(100 * 75437)
    expect(h.costBasisCents).toBe(50000_00) // 100 * $500
    expect(h.unrealizedPnLCents).toBe(h.marketValueCents - h.costBasisCents)
    expect(h.unrealizedReturnPercent).not.toBeNull()
    expect(h.weight).toBe(1)
    expect(h.dailyChangeCents).toBe(100 * (75437 - 75712))
  })
})
