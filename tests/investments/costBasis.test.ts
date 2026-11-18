import { describe, it, expect } from 'vitest'
import { createLotFromBuy, applyFifoSell, positionFromLots } from '@/utils/investments/costBasis'
import {
  sharesToMicros,
  dollarsToPriceMicros,
  grossCentsFromTrade,
} from '@/utils/investments/decimal'
import type { InvestmentTransaction } from '@/types/investment'

function buyTxn(
  id: string,
  shares: number,
  price: number,
  fees = 0,
  date = '2025-01-01',
): InvestmentTransaction {
  const quantityMicros = sharesToMicros(shares)
  const priceMicros = dollarsToPriceMicros(price)
  const gross = grossCentsFromTrade(quantityMicros, priceMicros)
  return {
    id,
    portfolioId: 'pf',
    securityId: 'sec',
    type: 'BUY',
    tradeDate: date,
    settlementDate: date,
    quantityMicros,
    priceMicros,
    grossAmountCents: gross,
    feesCents: Math.round(fees * 100),
    netAmountCents: -(gross + Math.round(fees * 100)),
    currency: 'USD',
    createdAt: date,
  }
}

describe('FIFO cost basis', () => {
  it('single purchase creates lot with fees in basis', () => {
    const txn = buyTxn('1', 10, 100, 5)
    const lot = createLotFromBuy(txn, txn.feesCents)
    expect(lot.remainingQuantityMicros).toBe(sharesToMicros(10))
    expect(lot.remainingCostBasisCents).toBe(100000 + 500)
  })

  it('partial sale realizes FIFO gain', () => {
    let lots = [createLotFromBuy(buyTxn('1', 10, 100, 0, '2025-01-01'), 0)]
    lots = [
      ...lots,
      createLotFromBuy(buyTxn('2', 10, 120, 0, '2025-02-01'), 0),
    ]
    const result = applyFifoSell(
      lots,
      'pf',
      'sec',
      sharesToMicros(5),
      dollarsToPriceMicros(150),
      0,
    )
    // Sold from first lot: cost 5*100=500, proceeds 5*150=750, gain 250 dollars = 25000 cents
    expect(result.realizedPnLCents).toBe(25000)
    const pos = positionFromLots(result.lots, 'pf', 'sec')
    expect(pos.quantityMicros).toBe(sharesToMicros(15))
  })

  it('full sale across lots', () => {
    let lots = [createLotFromBuy(buyTxn('1', 10, 100, 0, '2025-01-01'), 0)]
    lots.push(createLotFromBuy(buyTxn('2', 5, 110, 0, '2025-02-01'), 0))
    const result = applyFifoSell(
      lots,
      'pf',
      'sec',
      sharesToMicros(15),
      dollarsToPriceMicros(100),
      0,
    )
    // cost 1000+550=1550, proceeds 1500, loss -50 dollars
    expect(result.realizedPnLCents).toBe(-5000)
    expect(positionFromLots(result.lots, 'pf', 'sec').quantityMicros).toBe(0)
  })

  it('rejects oversell', () => {
    const lots = [createLotFromBuy(buyTxn('1', 2, 50), 0)]
    expect(() =>
      applyFifoSell(lots, 'pf', 'sec', sharesToMicros(3), dollarsToPriceMicros(50), 0),
    ).toThrow(/Insufficient/)
  })

  it('supports fractional shares', () => {
    const txn = buyTxn('1', 1.5, 200, 0)
    const lot = createLotFromBuy(txn, 0)
    expect(lot.remainingQuantityMicros).toBe(sharesToMicros(1.5))
    const result = applyFifoSell(
      [lot],
      'pf',
      'sec',
      sharesToMicros(0.5),
      dollarsToPriceMicros(220),
      0,
    )
    expect(result.realizedPnLCents).toBe(1000) // 0.5 * (220-200) = 10 dollars
  })
})
