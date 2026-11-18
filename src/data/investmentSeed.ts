import type {
  Security,
  Portfolio,
  InvestmentTransaction,
  Watchlist,
  ResearchNote,
  CapitalTransfer,
} from '@/types/investment'
import { dollarsToCents } from '@/utils/currency'
import { sharesToMicros, dollarsToPriceMicros, grossCentsFromTrade } from '@/utils/investments/decimal'
import { createLotFromBuy, applyFifoSell } from '@/utils/investments/costBasis'
import type { PositionLot } from '@/types/investment'
import { listDemoSecurities } from './demoMarketData'

function sec(
  id: string,
  symbol: string,
  extras: Partial<Security> = {},
): Security {
  const meta = listDemoSecurities().find((s) => s.symbol === symbol)!
  return {
    id,
    symbol: meta.symbol,
    name: meta.name,
    exchange: meta.exchange,
    assetType: meta.assetType,
    currency: 'USD',
    providerSymbol: meta.symbol,
    sector: meta.sector,
    createdAt: '2025-05-01T00:00:00.000Z',
    ...extras,
  }
}

export const seedSecurities: Security[] = [
  sec('sec_aapl', 'AAPL'),
  sec('sec_msft', 'MSFT'),
  sec('sec_nvda', 'NVDA'),
  sec('sec_googl', 'GOOGL'),
  sec('sec_amzn', 'AMZN'),
  sec('sec_spy', 'SPY'),
  sec('sec_qqq', 'QQQ'),
  sec('sec_iwm', 'IWM'),
  sec('sec_amd', 'AMD'),
  sec('sec_meta', 'META'),
  sec('sec_avgo', 'AVGO'),
]

export const seedPortfolios: Portfolio[] = [
  {
    id: 'pf_core',
    name: 'Northstar Core Portfolio',
    description: 'Long-term diversified equity sleeve for company capital.',
    baseCurrency: 'USD',
    benchmarkSymbol: 'SPY',
    initialCash: dollarsToCents(250000),
    strategy: 'Core / quality compounders',
    createdAt: '2025-05-15T00:00:00.000Z',
  },
  {
    id: 'pf_growth',
    name: 'Northstar Growth Portfolio',
    description: 'Higher-beta technology and growth allocation.',
    baseCurrency: 'USD',
    benchmarkSymbol: 'QQQ',
    initialCash: dollarsToCents(120000),
    strategy: 'Growth / momentum',
    createdAt: '2025-06-01T00:00:00.000Z',
  },
]

function buy(
  id: string,
  portfolioId: string,
  securityId: string,
  date: string,
  shares: number,
  price: number,
  fees = 4.95,
): InvestmentTransaction {
  const quantityMicros = sharesToMicros(shares)
  const priceMicros = dollarsToPriceMicros(price)
  const gross = grossCentsFromTrade(quantityMicros, priceMicros)
  const feesCents = dollarsToCents(fees)
  return {
    id,
    portfolioId,
    securityId,
    type: 'BUY',
    tradeDate: date,
    settlementDate: date,
    quantityMicros,
    priceMicros,
    grossAmountCents: gross,
    feesCents,
    netAmountCents: -(gross + feesCents),
    currency: 'USD',
    createdAt: `${date}T15:00:00.000Z`,
  }
}

function sell(
  id: string,
  portfolioId: string,
  securityId: string,
  date: string,
  shares: number,
  price: number,
  fees = 4.95,
): InvestmentTransaction {
  const quantityMicros = sharesToMicros(shares)
  const priceMicros = dollarsToPriceMicros(price)
  const gross = grossCentsFromTrade(quantityMicros, priceMicros)
  const feesCents = dollarsToCents(fees)
  return {
    id,
    portfolioId,
    securityId,
    type: 'SELL',
    tradeDate: date,
    settlementDate: date,
    quantityMicros,
    priceMicros,
    grossAmountCents: gross,
    feesCents,
    netAmountCents: gross - feesCents,
    currency: 'USD',
    createdAt: `${date}T15:30:00.000Z`,
  }
}

function cash(
  id: string,
  portfolioId: string,
  type: 'DEPOSIT' | 'WITHDRAWAL',
  date: string,
  dollars: number,
): InvestmentTransaction {
  const cents = dollarsToCents(dollars)
  return {
    id,
    portfolioId,
    type,
    tradeDate: date,
    settlementDate: date,
    quantityMicros: 0,
    priceMicros: 0,
    grossAmountCents: cents,
    feesCents: 0,
    netAmountCents: type === 'DEPOSIT' ? cents : -cents,
    currency: 'USD',
    notes: type === 'DEPOSIT' ? 'Capital transfer from operating cash' : 'Return of capital to operations',
    createdAt: `${date}T12:00:00.000Z`,
  }
}

function dividend(
  id: string,
  portfolioId: string,
  securityId: string,
  date: string,
  shares: number,
  perShare: number,
): InvestmentTransaction {
  const quantityMicros = sharesToMicros(shares)
  const priceMicros = dollarsToPriceMicros(perShare)
  const gross = grossCentsFromTrade(quantityMicros, priceMicros)
  return {
    id,
    portfolioId,
    securityId,
    type: 'DIVIDEND',
    tradeDate: date,
    settlementDate: date,
    quantityMicros,
    priceMicros,
    grossAmountCents: gross,
    feesCents: 0,
    netAmountCents: gross,
    currency: 'USD',
    notes: 'Cash dividend',
    createdAt: `${date}T16:00:00.000Z`,
  }
}

export const seedInvestmentTxns: InvestmentTransaction[] = [
  // Core funding + buys
  cash('itx_c1', 'pf_core', 'DEPOSIT', '2025-05-15', 250000),
  buy('itx_c2', 'pf_core', 'sec_spy', '2025-05-16', 80, 512.4),
  buy('itx_c3', 'pf_core', 'sec_aapl', '2025-05-20', 120, 201.5),
  buy('itx_c4', 'pf_core', 'sec_msft', '2025-05-20', 40, 418.2),
  buy('itx_c5', 'pf_core', 'sec_googl', '2025-06-03', 90, 158.75),
  buy('itx_c6', 'pf_core', 'sec_amzn', '2025-06-10', 55, 178.3),
  buy('itx_c7', 'pf_core', 'sec_nvda', '2025-06-18', 100, 108.4),
  buy('itx_c8', 'pf_core', 'sec_aapl', '2025-07-22', 40, 215.1),
  dividend('itx_c9', 'pf_core', 'sec_aapl', '2025-08-15', 160, 0.25),
  dividend('itx_c10', 'pf_core', 'sec_msft', '2025-09-12', 40, 0.83),
  sell('itx_c11', 'pf_core', 'sec_nvda', '2025-09-25', 25, 128.6),
  buy('itx_c12', 'pf_core', 'sec_spy', '2025-10-08', 20, 548.2),

  // Growth funding + buys
  cash('itx_g1', 'pf_growth', 'DEPOSIT', '2025-06-01', 120000),
  buy('itx_g2', 'pf_growth', 'sec_qqq', '2025-06-02', 60, 448.5),
  buy('itx_g3', 'pf_growth', 'sec_nvda', '2025-06-05', 150, 102.8),
  buy('itx_g4', 'pf_growth', 'sec_amd', '2025-06-12', 80, 152.4),
  buy('itx_g5', 'pf_growth', 'sec_meta', '2025-07-01', 25, 492.1),
  buy('itx_g6', 'pf_growth', 'sec_avgo', '2025-07-18', 40, 158.75),
  buy('itx_g7', 'pf_growth', 'sec_nvda', '2025-08-14', 50, 118.2),
  sell('itx_g8', 'pf_growth', 'sec_amd', '2025-09-18', 30, 168.9),
  cash('itx_g9', 'pf_growth', 'DEPOSIT', '2025-10-01', 25000),
  buy('itx_g10', 'pf_growth', 'sec_meta', '2025-10-03', 10, 560.4),
]

export function rebuildLotsFromTransactions(
  txns: InvestmentTransaction[],
): { lots: PositionLot[]; realizedByTxn: Record<string, number> } {
  let lots: PositionLot[] = []
  const realizedByTxn: Record<string, number> = {}
  const ordered = [...txns].sort((a, b) =>
    a.tradeDate.localeCompare(b.tradeDate) || a.createdAt.localeCompare(b.createdAt),
  )

  for (const txn of ordered) {
    if (txn.type === 'BUY' && txn.securityId) {
      lots = [...lots, createLotFromBuy(txn, txn.feesCents)]
    } else if (txn.type === 'SELL' && txn.securityId) {
      const result = applyFifoSell(
        lots,
        txn.portfolioId,
        txn.securityId,
        txn.quantityMicros,
        txn.priceMicros,
        txn.feesCents,
      )
      lots = result.lots
      realizedByTxn[txn.id] = result.realizedPnLCents
    }
  }
  return { lots, realizedByTxn }
}

export const seedWatchlists: Watchlist[] = [
  {
    id: 'wl_1',
    name: 'Core Watch',
    securityIds: ['sec_aapl', 'sec_msft', 'sec_spy', 'sec_qqq'],
    createdAt: '2025-06-01T00:00:00.000Z',
  },
  {
    id: 'wl_2',
    name: 'Growth Candidates',
    securityIds: ['sec_nvda', 'sec_amd', 'sec_meta', 'sec_avgo'],
    createdAt: '2025-07-01T00:00:00.000Z',
  },
]

export const seedResearchNotes: ResearchNote[] = [
  {
    id: 'note_1',
    securityId: 'sec_nvda',
    title: 'AI infrastructure cycle',
    rationale: 'Durable demand for accelerated compute across cloud and enterprise.',
    bullCase: 'Continued data-center capex and software attach expand TAM.',
    bearCase: 'Customer concentration and competitive ASIC risk.',
    risks: 'Valuation compression; supply chain; export controls.',
    targetPriceCents: dollarsToCents(160),
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-10-15T00:00:00.000Z',
  },
]

export const seedCapitalTransfers: CapitalTransfer[] = [
  {
    id: 'xfer_1',
    direction: 'ops_to_investment',
    amountCents: dollarsToCents(250000),
    date: '2025-05-15',
    portfolioId: 'pf_core',
    investmentTxnId: 'itx_c1',
    notes: 'Initial capitalization of Core Portfolio',
  },
  {
    id: 'xfer_2',
    direction: 'ops_to_investment',
    amountCents: dollarsToCents(120000),
    date: '2025-06-01',
    portfolioId: 'pf_growth',
    investmentTxnId: 'itx_g1',
    notes: 'Initial capitalization of Growth Portfolio',
  },
  {
    id: 'xfer_3',
    direction: 'ops_to_investment',
    amountCents: dollarsToCents(25000),
    date: '2025-10-01',
    portfolioId: 'pf_growth',
    investmentTxnId: 'itx_g9',
    notes: 'Additional growth sleeve funding',
  },
]

export function getInvestmentSeedSnapshot() {
  const { lots, realizedByTxn } = rebuildLotsFromTransactions(seedInvestmentTxns)
  return {
    securities: structuredClone(seedSecurities),
    portfolios: structuredClone(seedPortfolios),
    transactions: structuredClone(seedInvestmentTxns),
    lots: structuredClone(lots),
    realizedByTxn: { ...realizedByTxn },
    watchlists: structuredClone(seedWatchlists),
    researchNotes: structuredClone(seedResearchNotes),
    capitalTransfers: structuredClone(seedCapitalTransfers),
    selectedPortfolioId: 'pf_core' as string | 'all',
  }
}
