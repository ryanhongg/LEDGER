import { describe, it, expect } from 'vitest'
import { getInvestmentSeedSnapshot } from '@/data/investmentSeed'
import {
  cashBalance,
  valuePortfolio,
  totalRealizedPnL,
} from '@/services/investments/ValuationService'
import { computeCompanyPosition } from '@/services/accounting/InvestmentAccountingService'
import { getDemoQuote } from '@/data/demoMarketData'
import { getSeedSnapshot } from '@/data/seedData'
import { getTotalExpenses, getNetProfit } from '@/utils/calculations'

describe('investment accounting integration', () => {
  const seed = getInvestmentSeedSnapshot()

  it('seed rebuilds lots without negative positions', () => {
    expect(seed.lots.every((l) => l.remainingQuantityMicros >= 0)).toBe(true)
    expect(seed.portfolios).toHaveLength(2)
    expect(seed.transactions.length).toBeGreaterThan(10)
  })

  it('cash balances reconcile from ledger', () => {
    for (const pf of seed.portfolios) {
      const cash = cashBalance(seed.transactions, pf.id)
      expect(cash).toBeGreaterThan(0)
    }
  })

  it('portfolio valuation uses quotes and does not invent holdings', () => {
    const quotes = Object.fromEntries(
      seed.securities.map((s) => [s.symbol, getDemoQuote(s.symbol)!]),
    )
    const core = seed.portfolios.find((p) => p.id === 'pf_core')!
    const v = valuePortfolio(
      core,
      seed.transactions,
      seed.lots,
      seed.securities,
      quotes,
      seed.realizedByTxn,
    )
    expect(v.holdings.length).toBeGreaterThan(0)
    expect(v.totalValueCents).toBe(v.cashCents + v.securitiesMarketValueCents)
    expect(v.realizedPnLCents).toBe(
      totalRealizedPnL(seed.realizedByTxn, seed.transactions, core.id),
    )
  })

  it('investment purchases are not operating expenses', () => {
    const ops = getSeedSnapshot()
    const expensesBefore = getTotalExpenses(ops.transactions)
    const profitBefore = getNetProfit(ops.transactions)
    // Company position subtracts transfers but ops P&L unchanged
    const quotes = Object.fromEntries(
      seed.securities.map((s) => [s.symbol, getDemoQuote(s.symbol)!]),
    )
    const valuations = seed.portfolios.map((p) =>
      valuePortfolio(
        p,
        seed.transactions,
        seed.lots,
        seed.securities,
        quotes,
        seed.realizedByTxn,
      ),
    )
    const position = computeCompanyPosition({
      openingBalanceCents: ops.openingBalance,
      operatingTransactions: ops.transactions,
      transfers: seed.capitalTransfers,
      valuations,
    })
    expect(getTotalExpenses(ops.transactions)).toBe(expensesBefore)
    expect(getNetProfit(ops.transactions)).toBe(profitBefore)
    expect(position.transfersOutToInvestmentsCents).toBeGreaterThan(0)
    expect(position.totalInvestmentAssetsCents).toBe(
      position.investmentCashCents + position.securitiesMarketValueCents,
    )
  })
})
