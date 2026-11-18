import type {
  InvestmentTransaction,
  PositionLot,
  Portfolio,
  Security,
  HoldingView,
  PortfolioValuation,
  MarketQuote,
} from '@/types/investment'
import { positionFromLots } from '@/utils/investments/costBasis'
import { avgCostMicros, microsToShares } from '@/utils/investments/decimal'
import { dailyReturns, cumulativeReturnFromValues } from '@/utils/investments/returns'

export function cashBalance(
  txns: InvestmentTransaction[],
  portfolioId: string,
  initialCash = 0,
): number {
  // initialCash is already represented by the opening DEPOSIT in seed;
  // only use initialCash if no deposit transactions exist.
  const relevant = txns.filter((t) => t.portfolioId === portfolioId)
  const hasFunding = relevant.some((t) => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL')
  const start = hasFunding ? 0 : initialCash
  return relevant.reduce((bal, t) => bal + t.netAmountCents, start)
}

export function totalRealizedPnL(
  realizedByTxn: Record<string, number>,
  txns: InvestmentTransaction[],
  portfolioId?: string,
): number {
  return txns
    .filter((t) => t.type === 'SELL' && (!portfolioId || t.portfolioId === portfolioId))
    .reduce((s, t) => s + (realizedByTxn[t.id] ?? 0), 0)
}

export function totalDividends(
  txns: InvestmentTransaction[],
  portfolioId?: string,
): number {
  return txns
    .filter((t) => t.type === 'DIVIDEND' && (!portfolioId || t.portfolioId === portfolioId))
    .reduce((s, t) => s + t.netAmountCents, 0)
}

export function totalFees(
  txns: InvestmentTransaction[],
  portfolioId?: string,
): number {
  return txns
    .filter((t) => !portfolioId || t.portfolioId === portfolioId)
    .reduce((s, t) => s + t.feesCents, 0)
}

export function investedCapital(
  txns: InvestmentTransaction[],
  portfolioId?: string,
): number {
  return txns
    .filter(
      (t) =>
        (t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL') &&
        (!portfolioId || t.portfolioId === portfolioId),
    )
    .reduce((s, t) => s + t.netAmountCents, 0)
}

/** A quote is a usable mark only when it has a positive price and is not unavailable. */
export function isUsableQuote(quote: MarketQuote | undefined | null): boolean {
  if (!quote) return false
  if (quote.freshness === 'unavailable') return false
  if (!Number.isFinite(quote.priceCents) || quote.priceCents <= 0) return false
  return true
}

export function buildHoldings(
  lots: PositionLot[],
  securities: Security[],
  quotes: Record<string, MarketQuote>,
  portfolioId?: string,
): HoldingView[] {
  const secMap = new Map(securities.map((s) => [s.id, s]))
  const keys = new Set(
    lots
      .filter((l) => l.remainingQuantityMicros > 0)
      .filter((l) => !portfolioId || l.portfolioId === portfolioId)
      .map((l) => `${l.portfolioId}:${l.securityId}`),
  )

  const holdings: HoldingView[] = []
  for (const key of keys) {
    const [pfId, securityId] = key.split(':')
    const sec = secMap.get(securityId)
    if (!sec) continue
    const { quantityMicros, costBasisCents } = positionFromLots(lots, pfId, securityId)
    if (quantityMicros <= 0) continue
    const quote = quotes[sec.symbol]
    const markAvailable = isUsableQuote(quote)
    const shares = microsToShares(quantityMicros)

    if (!markAvailable) {
      holdings.push({
        securityId,
        portfolioId: pfId,
        symbol: sec.symbol,
        name: sec.name,
        sector: sec.sector,
        assetType: sec.assetType,
        quantityMicros,
        avgCostMicros: avgCostMicros(costBasisCents, quantityMicros),
        costBasisCents,
        priceCents: 0,
        marketValueCents: 0,
        unrealizedPnLCents: 0,
        unrealizedReturnPercent: null,
        dailyChangeCents: 0,
        dailyChangePercent: 0,
        weight: 0,
        priceFreshness: quote?.freshness ?? 'unavailable',
        isDemoPrice: quote?.isDemo ?? false,
        markAvailable: false,
      })
      continue
    }

    // markAvailable guarantees a usable quote above
    const usable = quote!
    const priceCents = usable.priceCents
    const prev = usable.previousCloseCents
    const marketValueCents = Math.round(shares * priceCents)
    const unrealized = marketValueCents - costBasisCents
    const dailyChangeCents =
      prev != null && prev > 0 ? Math.round(shares * (priceCents - prev)) : 0
    const dailyChangePercent =
      prev != null && prev > 0 ? ((priceCents - prev) / prev) * 100 : 0

    holdings.push({
      securityId,
      portfolioId: pfId,
      symbol: sec.symbol,
      name: sec.name,
      sector: sec.sector,
      assetType: sec.assetType,
      quantityMicros,
      avgCostMicros: avgCostMicros(costBasisCents, quantityMicros),
      costBasisCents,
      priceCents,
      marketValueCents,
      unrealizedPnLCents: unrealized,
      unrealizedReturnPercent:
        costBasisCents === 0 ? null : (unrealized / costBasisCents) * 100,
      dailyChangeCents,
      dailyChangePercent,
      weight: 0,
      priceFreshness: usable.freshness,
      isDemoPrice: usable.isDemo,
      markAvailable: true,
    })
  }

  const totalMv = holdings
    .filter((h) => h.markAvailable)
    .reduce((s, h) => s + h.marketValueCents, 0)
  for (const h of holdings) {
    h.weight =
      !h.markAvailable || totalMv === 0 ? 0 : h.marketValueCents / totalMv
  }
  return holdings.sort((a, b) => {
    if (a.markAvailable !== b.markAvailable) return a.markAvailable ? -1 : 1
    return b.marketValueCents - a.marketValueCents
  })
}

export function valuePortfolio(
  portfolio: Portfolio,
  txns: InvestmentTransaction[],
  lots: PositionLot[],
  securities: Security[],
  quotes: Record<string, MarketQuote>,
  realizedByTxn: Record<string, number>,
): PortfolioValuation {
  const holdings = buildHoldings(lots, securities, quotes, portfolio.id)
  const marked = holdings.filter((h) => h.markAvailable)
  const securitiesMv = marked.reduce((s, h) => s + h.marketValueCents, 0)
  const cash = cashBalance(txns, portfolio.id, portfolio.initialCash)
  const costBasis = holdings.reduce((s, h) => s + h.costBasisCents, 0)
  const markedCost = marked.reduce((s, h) => s + h.costBasisCents, 0)
  return {
    portfolioId: portfolio.id,
    asOf: new Date().toISOString(),
    cashCents: cash,
    securitiesMarketValueCents: securitiesMv,
    totalValueCents: cash + securitiesMv,
    costBasisCents: costBasis,
    // Unrealized only over positions with a valid mark — never 0 − full cost
    unrealizedPnLCents: securitiesMv - markedCost,
    realizedPnLCents: totalRealizedPnL(realizedByTxn, txns, portfolio.id),
    dividendIncomeCents: totalDividends(txns, portfolio.id),
    feesCents: totalFees(txns, portfolio.id),
    investedCapitalCents: investedCapital(txns, portfolio.id),
    holdings,
  }
}

/**
 * Approximate historical portfolio equity curve using current holdings × historical prices
 * plus residual cash. This is a holdings-based reconstruction (not a full trade-replay NAV),
 * labeled accordingly in the UI when used for charts.
 */
export function approximateEquityCurve(
  holdings: { symbol: string; quantityMicros: number }[],
  cashCents: number,
  priceHistory: Record<string, { date: string; adjustedCloseCents: number }[]>,
): { date: string; valueCents: number }[] {
  const dates = new Set<string>()
  for (const bars of Object.values(priceHistory)) {
    for (const b of bars) dates.add(b.date)
  }
  const sorted = [...dates].sort()
  const idx: Record<string, Map<string, number>> = {}
  for (const [sym, bars] of Object.entries(priceHistory)) {
    idx[sym] = new Map(bars.map((b) => [b.date, b.adjustedCloseCents]))
  }

  const lastPx: Record<string, number> = {}
  return sorted.map((date) => {
    let mv = cashCents
    for (const h of holdings) {
      const px = idx[h.symbol]?.get(date)
      if (px != null) lastPx[h.symbol] = px
      const use = lastPx[h.symbol]
      if (use != null) {
        mv += Math.round(microsToShares(h.quantityMicros) * use)
      }
    }
    return { date, valueCents: mv }
  })
}

export function returnsFromCurve(curve: { valueCents: number }[]): number[] {
  return dailyReturns(curve.map((c) => c.valueCents))
}

export function totalReturnFromCurve(curve: { valueCents: number }[]): number {
  return cumulativeReturnFromValues(curve.map((c) => c.valueCents))
}
