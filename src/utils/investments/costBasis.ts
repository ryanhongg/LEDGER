import type { PositionLot, InvestmentTransaction } from '@/types/investment'
import { generateId } from '@/utils/formatting'
import { grossCentsFromTrade } from './decimal'

export interface LotMatch {
  lotId: string
  quantityMicros: number
  costBasisCents: number
  proceedsCents: number
  realizedPnLCents: number
}

export interface SellResult {
  lots: PositionLot[]
  matches: LotMatch[]
  realizedPnLCents: number
  remainingCostBasisReleasedCents: number
}

/** Create a new lot from a BUY. Fees are included in cost basis. */
export function createLotFromBuy(
  txn: InvestmentTransaction,
  feesAllocatedCents: number,
): PositionLot {
  const gross = grossCentsFromTrade(txn.quantityMicros, txn.priceMicros)
  const cost = gross + feesAllocatedCents
  return {
    id: generateId('lot'),
    portfolioId: txn.portfolioId,
    securityId: txn.securityId!,
    sourceTransactionId: txn.id,
    acquisitionDate: txn.tradeDate,
    originalQuantityMicros: txn.quantityMicros,
    remainingQuantityMicros: txn.quantityMicros,
    unitCostMicros: txn.priceMicros,
    remainingCostBasisCents: cost,
  }
}

/**
 * FIFO sell: consume oldest lots first.
 * Net proceeds = gross - sell fees (allocated proportionally for P&L).
 */
export function applyFifoSell(
  lots: PositionLot[],
  portfolioId: string,
  securityId: string,
  sellQuantityMicros: number,
  sellPriceMicros: number,
  sellFeesCents: number,
): SellResult {
  const relevant = lots
    .filter(
      (l) =>
        l.portfolioId === portfolioId &&
        l.securityId === securityId &&
        l.remainingQuantityMicros > 0,
    )
    .sort((a, b) => a.acquisitionDate.localeCompare(b.acquisitionDate))

  const available = relevant.reduce((s, l) => s + l.remainingQuantityMicros, 0)
  if (sellQuantityMicros > available) {
    throw new Error(
      `Insufficient shares: requested ${sellQuantityMicros}, available ${available}`,
    )
  }

  const grossProceeds = grossCentsFromTrade(sellQuantityMicros, sellPriceMicros)
  let remaining = sellQuantityMicros
  let realized = 0
  let costReleased = 0
  const matches: LotMatch[] = []
  const nextLots = lots.map((l) => ({ ...l }))

  for (const lot of relevant) {
    if (remaining <= 0) break
    const idx = nextLots.findIndex((x) => x.id === lot.id)
    const current = nextLots[idx]
    const take = Math.min(current.remainingQuantityMicros, remaining)
    const portion =
      current.remainingQuantityMicros === 0
        ? 0
        : take / current.remainingQuantityMicros
    const costTake = Math.round(current.remainingCostBasisCents * portion)
    const proceedsTake = Math.round(
      (grossProceeds * take) / sellQuantityMicros,
    )
    const feeTake = Math.round((sellFeesCents * take) / sellQuantityMicros)
    const pnl = proceedsTake - feeTake - costTake

    matches.push({
      lotId: current.id,
      quantityMicros: take,
      costBasisCents: costTake,
      proceedsCents: proceedsTake - feeTake,
      realizedPnLCents: pnl,
    })

    current.remainingQuantityMicros -= take
    current.remainingCostBasisCents -= costTake
    if (current.remainingQuantityMicros === 0) current.remainingCostBasisCents = 0

    remaining -= take
    realized += pnl
    costReleased += costTake
  }

  return {
    lots: nextLots,
    matches,
    realizedPnLCents: realized,
    remainingCostBasisReleasedCents: costReleased,
  }
}

export function positionFromLots(
  lots: PositionLot[],
  portfolioId: string,
  securityId: string,
): { quantityMicros: number; costBasisCents: number } {
  const open = lots.filter(
    (l) =>
      l.portfolioId === portfolioId &&
      l.securityId === securityId &&
      l.remainingQuantityMicros > 0,
  )
  return {
    quantityMicros: open.reduce((s, l) => s + l.remainingQuantityMicros, 0),
    costBasisCents: open.reduce((s, l) => s + l.remainingCostBasisCents, 0),
  }
}
