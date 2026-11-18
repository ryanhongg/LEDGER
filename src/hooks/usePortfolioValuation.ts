import { useMemo } from 'react'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { valuePortfolio, buildHoldings } from '@/services/investments/ValuationService'
import type { PortfolioValuation, HoldingView } from '@/types/investment'

export function usePortfolioValuation(portfolioId?: string | 'all') {
  const portfolios = useInvestmentStore((s) => s.portfolios)
  const transactions = useInvestmentStore((s) => s.transactions)
  const lots = useInvestmentStore((s) => s.lots)
  const securities = useInvestmentStore((s) => s.securities)
  const quotes = useInvestmentStore((s) => s.quotes)
  const realizedByTxn = useInvestmentStore((s) => s.realizedByTxn)
  const selected = useInvestmentStore((s) => s.selectedPortfolioId)

  const id = portfolioId ?? selected

  return useMemo(() => {
    const targets =
      id === 'all' ? portfolios : portfolios.filter((p) => p.id === id)

    const valuations: PortfolioValuation[] = targets.map((p) =>
      valuePortfolio(p, transactions, lots, securities, quotes, realizedByTxn),
    )

    const holdings: HoldingView[] =
      id === 'all'
        ? buildHoldings(lots, securities, quotes)
        : valuations[0]?.holdings ?? []

    if (id === 'all' && holdings.length) {
      const totalMv = holdings.reduce((s, h) => s + h.marketValueCents, 0)
      for (const h of holdings) {
        h.weight = totalMv === 0 ? 0 : h.marketValueCents / totalMv
      }
    }

    const aggregate: PortfolioValuation = {
      portfolioId: id === 'all' ? 'all' : (targets[0]?.id ?? ''),
      asOf: new Date().toISOString(),
      cashCents: valuations.reduce((s, v) => s + v.cashCents, 0),
      securitiesMarketValueCents: valuations.reduce(
        (s, v) => s + v.securitiesMarketValueCents,
        0,
      ),
      totalValueCents: valuations.reduce((s, v) => s + v.totalValueCents, 0),
      costBasisCents: valuations.reduce((s, v) => s + v.costBasisCents, 0),
      unrealizedPnLCents: valuations.reduce((s, v) => s + v.unrealizedPnLCents, 0),
      realizedPnLCents: valuations.reduce((s, v) => s + v.realizedPnLCents, 0),
      dividendIncomeCents: valuations.reduce((s, v) => s + v.dividendIncomeCents, 0),
      feesCents: valuations.reduce((s, v) => s + v.feesCents, 0),
      investedCapitalCents: valuations.reduce((s, v) => s + v.investedCapitalCents, 0),
      holdings,
    }

    const totalReturn =
      aggregate.investedCapitalCents === 0
        ? 0
        : ((aggregate.totalValueCents - aggregate.investedCapitalCents) /
            aggregate.investedCapitalCents) *
          100

    const todayPnL = holdings.reduce((s, h) => s + h.dailyChangeCents, 0)

    return { valuations, aggregate, holdings, totalReturn, todayPnL }
  }, [portfolios, transactions, lots, securities, quotes, realizedByTxn, id])
}
