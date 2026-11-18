import { create } from 'zustand'
import type {
  Security,
  Portfolio,
  InvestmentTransaction,
  PositionLot,
  Watchlist,
  ResearchNote,
  CapitalTransfer,
  MarketQuote,
} from '@/types/investment'
import { getInvestmentSeedSnapshot, rebuildLotsFromTransactions } from '@/data/investmentSeed'
import { generateId } from '@/utils/formatting'
import {
  sharesToMicros,
  dollarsToPriceMicros,
  grossCentsFromTrade,
} from '@/utils/investments/decimal'
import { createLotFromBuy, applyFifoSell, positionFromLots } from '@/utils/investments/costBasis'
import { dollarsToCents } from '@/utils/currency'
import type { MarketStatus } from '@/services/marketData/MarketDataService'
import {
  fetchMarketStatus,
  getQuotes,
  mergeQuote,
  connectMarketStream,
} from '@/services/marketData/MarketDataService'
import { cashBalance } from '@/services/investments/ValuationService'

let stopStream: (() => void) | null = null

const STORAGE_KEY = 'ledger_investments_v1'

interface InvestmentState {
  securities: Security[]
  portfolios: Portfolio[]
  transactions: InvestmentTransaction[]
  lots: PositionLot[]
  realizedByTxn: Record<string, number>
  watchlists: Watchlist[]
  researchNotes: ResearchNote[]
  capitalTransfers: CapitalTransfer[]
  selectedPortfolioId: string | 'all'
  quotes: Record<string, MarketQuote>
  marketStatus: MarketStatus | null
  streamState: string
  streamError: string | null
  riskFreeRate: number
  hydrated: boolean

  hydrate: () => void
  persist: () => void
  resetDemoInvestments: () => void

  setSelectedPortfolio: (id: string | 'all') => void
  setRiskFreeRate: (r: number) => void
  refreshMarketStatus: () => Promise<void>
  refreshQuotes: (symbols?: string[]) => Promise<void>
  upsertQuote: (quote: MarketQuote) => void
  startMarketStream: () => void
  stopMarketStream: () => void

  addPortfolio: (p: Omit<Portfolio, 'id' | 'createdAt'>) => void
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => void
  deletePortfolio: (id: string) => void

  addSecurity: (s: Omit<Security, 'id' | 'createdAt'>) => Security
  ensureSecurity: (input: {
    symbol: string
    name: string
    exchange: string
    assetType: Security['assetType']
    sector?: string
  }) => Security

  recordDeposit: (portfolioId: string, amountCents: number, date: string, notes?: string) => string
  recordWithdrawal: (portfolioId: string, amountCents: number, date: string, notes?: string) => string
  recordBuy: (input: {
    portfolioId: string
    securityId: string
    tradeDate: string
    shares: number
    priceDollars: number
    feesDollars?: number
    notes?: string
  }) => void
  recordSell: (input: {
    portfolioId: string
    securityId: string
    tradeDate: string
    shares: number
    priceDollars: number
    feesDollars?: number
    notes?: string
  }) => void
  recordDividend: (input: {
    portfolioId: string
    securityId: string
    paymentDate: string
    shares: number
    amountPerShare: number
  }) => void

  addWatchlist: (name: string) => void
  removeWatchlist: (id: string) => void
  addToWatchlist: (watchlistId: string, securityId: string) => void
  removeFromWatchlist: (watchlistId: string, securityId: string) => void

  addResearchNote: (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateResearchNote: (id: string, updates: Partial<ResearchNote>) => void
  deleteResearchNote: (id: string) => void

  importTransactions: (txns: Omit<InvestmentTransaction, 'id' | 'createdAt'>[]) => void
}

function persistSlice(get: () => InvestmentState) {
  const s = get()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      securities: s.securities,
      portfolios: s.portfolios,
      transactions: s.transactions,
      lots: s.lots,
      realizedByTxn: s.realizedByTxn,
      watchlists: s.watchlists,
      researchNotes: s.researchNotes,
      capitalTransfers: s.capitalTransfers,
      selectedPortfolioId: s.selectedPortfolioId,
      riskFreeRate: s.riskFreeRate,
    }),
  )
}

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  securities: [],
  portfolios: [],
  transactions: [],
  lots: [],
  realizedByTxn: {},
  watchlists: [],
  researchNotes: [],
  capitalTransfers: [],
  selectedPortfolioId: 'pf_core',
  quotes: {},
  marketStatus: null,
  streamState: 'disconnected',
  streamError: null,
  riskFreeRate: 0.04,
  hydrated: false,

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        set({
          ...data,
          quotes: {},
          marketStatus: null,
          streamState: 'disconnected',
          streamError: null,
          hydrated: true,
        })
      } else {
        const seed = getInvestmentSeedSnapshot()
        set({
          ...seed,
          quotes: {},
          marketStatus: null,
          streamState: 'disconnected',
          streamError: null,
          riskFreeRate: 0.04,
          hydrated: true,
        })
        persistSlice(get)
      }
    } catch {
      const seed = getInvestmentSeedSnapshot()
      set({
        ...seed,
        quotes: {},
        marketStatus: null,
        streamState: 'disconnected',
        streamError: null,
        riskFreeRate: 0.04,
        hydrated: true,
      })
    }
    void (async () => {
      await get().refreshMarketStatus()
      await get().refreshQuotes()
      if (get().marketStatus?.configured) {
        get().startMarketStream()
      }
    })()
  },

  persist: () => persistSlice(get),

  resetDemoInvestments: () => {
    localStorage.removeItem(STORAGE_KEY)
    const seed = getInvestmentSeedSnapshot()
    set({ ...seed, quotes: {}, marketStatus: get().marketStatus, riskFreeRate: 0.04, hydrated: true })
    persistSlice(get)
    void get().refreshQuotes()
  },

  setSelectedPortfolio: (id) => {
    set({ selectedPortfolioId: id })
    persistSlice(get)
  },

  setRiskFreeRate: (r) => {
    set({ riskFreeRate: r })
    persistSlice(get)
  },

  refreshMarketStatus: async () => {
    const status = await fetchMarketStatus()
    set({ marketStatus: status })
  },

  refreshQuotes: async (symbols) => {
    const secs = get().securities
    const syms =
      symbols ??
      [...new Set(secs.map((s) => s.symbol))]
    const prior = get().quotes
    const fetched = await getQuotes(syms, true)
    const next = { ...prior }
    for (const sym of syms) {
      const key = sym.toUpperCase()
      if (fetched[key]) {
        next[key] = mergeQuote(prior[key] ?? prior[sym], fetched[key])
      }
    }
    set({ quotes: next })
  },

  upsertQuote: (quote) => {
    set((s) => {
      const key = quote.symbol.toUpperCase()
      const prev = s.quotes[key]
      return { quotes: { ...s.quotes, [key]: mergeQuote(prev, quote) } }
    })
  },

  startMarketStream: () => {
    get().stopMarketStream()
    const tickers = [...new Set(get().securities.map((s) => s.symbol))]
    if (tickers.length === 0) return
    set({ streamState: 'connecting', streamError: null })
    stopStream = connectMarketStream({
      tickers,
      onQuote: (q) => get().upsertQuote(q),
      onStatus: (status) => {
        const st = status as { state?: string; lastError?: string | null }
        if (st?.state) {
          set({
            streamState: st.state,
            streamError: st.lastError ?? null,
            marketStatus: get().marketStatus
              ? {
                  ...get().marketStatus!,
                  websocket: {
                    ...(get().marketStatus!.websocket ?? {
                      upstreamUrl: null,
                      lastMessageAt: null,
                      lastQuoteAt: null,
                      subscribedTickers: tickers,
                    }),
                    state: st.state,
                    lastError: st.lastError ?? null,
                    subscribedTickers: tickers,
                    upstreamUrl: get().marketStatus!.websocket?.upstreamUrl ?? null,
                    lastMessageAt: get().marketStatus!.websocket?.lastMessageAt ?? null,
                    lastQuoteAt: get().marketStatus!.websocket?.lastQuoteAt ?? null,
                  },
                }
              : get().marketStatus,
          })
        }
      },
      onError: (message) => set({ streamError: message, streamState: 'error' }),
    })
  },

  stopMarketStream: () => {
    stopStream?.()
    stopStream = null
    set({ streamState: 'disconnected' })
  },

  addPortfolio: (p) => {
    const portfolio: Portfolio = {
      ...p,
      id: generateId('pf'),
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ portfolios: [...s.portfolios, portfolio] }))
    if (p.initialCash > 0) {
      get().recordDeposit(portfolio.id, p.initialCash, new Date().toISOString().slice(0, 10), 'Initial cash')
    }
    persistSlice(get)
  },

  updatePortfolio: (id, updates) => {
    set((s) => ({
      portfolios: s.portfolios.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
    persistSlice(get)
  },

  deletePortfolio: (id) => {
    set((s) => ({
      portfolios: s.portfolios.filter((p) => p.id !== id),
      transactions: s.transactions.filter((t) => t.portfolioId !== id),
      lots: s.lots.filter((l) => l.portfolioId !== id),
      capitalTransfers: s.capitalTransfers.filter((c) => c.portfolioId !== id),
      selectedPortfolioId:
        s.selectedPortfolioId === id ? 'all' : s.selectedPortfolioId,
    }))
    persistSlice(get)
  },

  addSecurity: (input) => {
    const security: Security = {
      ...input,
      id: generateId('sec'),
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ securities: [...s.securities, security] }))
    persistSlice(get)
    return security
  },

  ensureSecurity: (input) => {
    const existing = get().securities.find(
      (s) => s.symbol.toUpperCase() === input.symbol.toUpperCase(),
    )
    if (existing) return existing
    return get().addSecurity({
      symbol: input.symbol.toUpperCase(),
      name: input.name,
      exchange: input.exchange,
      assetType: input.assetType,
      currency: 'USD',
      providerSymbol: input.symbol.toUpperCase(),
      sector: input.sector,
    })
  },

  recordDeposit: (portfolioId, amountCents, date, notes) => {
    const id = generateId('itx')
    const txn: InvestmentTransaction = {
      id,
      portfolioId,
      type: 'DEPOSIT',
      tradeDate: date,
      settlementDate: date,
      quantityMicros: 0,
      priceMicros: 0,
      grossAmountCents: amountCents,
      feesCents: 0,
      netAmountCents: amountCents,
      currency: 'USD',
      notes,
      createdAt: new Date().toISOString(),
    }
    const transfer: CapitalTransfer = {
      id: generateId('xfer'),
      direction: 'ops_to_investment',
      amountCents,
      date,
      portfolioId,
      investmentTxnId: id,
      notes,
    }
    set((s) => ({
      transactions: [txn, ...s.transactions],
      capitalTransfers: [transfer, ...s.capitalTransfers],
    }))
    persistSlice(get)
    return id
  },

  recordWithdrawal: (portfolioId, amountCents, date, notes) => {
    const bal = cashBalance(get().transactions, portfolioId)
    if (amountCents > bal) throw new Error('Insufficient portfolio cash')

    const id = generateId('itx')
    const txn: InvestmentTransaction = {
      id,
      portfolioId,
      type: 'WITHDRAWAL',
      tradeDate: date,
      settlementDate: date,
      quantityMicros: 0,
      priceMicros: 0,
      grossAmountCents: amountCents,
      feesCents: 0,
      netAmountCents: -amountCents,
      currency: 'USD',
      notes,
      createdAt: new Date().toISOString(),
    }
    const transfer: CapitalTransfer = {
      id: generateId('xfer'),
      direction: 'investment_to_ops',
      amountCents,
      date,
      portfolioId,
      investmentTxnId: id,
      notes,
    }
    set((s) => ({
      transactions: [txn, ...s.transactions],
      capitalTransfers: [transfer, ...s.capitalTransfers],
    }))
    persistSlice(get)
    return id
  },

  recordBuy: (input) => {
    const quantityMicros = sharesToMicros(input.shares)
    if (quantityMicros <= 0) throw new Error('Quantity must be positive')
    const priceMicros = dollarsToPriceMicros(input.priceDollars)
    if (priceMicros <= 0) throw new Error('Price must be positive')
    const feesCents = dollarsToCents(input.feesDollars ?? 0)
    const gross = grossCentsFromTrade(quantityMicros, priceMicros)
    const total = gross + feesCents

    const bal = cashBalance(get().transactions, input.portfolioId)
    if (total > bal) throw new Error('Insufficient portfolio cash for purchase')

    const txn: InvestmentTransaction = {
      id: generateId('itx'),
      portfolioId: input.portfolioId,
      securityId: input.securityId,
      type: 'BUY',
      tradeDate: input.tradeDate,
      settlementDate: input.tradeDate,
      quantityMicros,
      priceMicros,
      grossAmountCents: gross,
      feesCents,
      netAmountCents: -total,
      currency: 'USD',
      notes: input.notes,
      createdAt: new Date().toISOString(),
    }
    const lot = createLotFromBuy(txn, feesCents)
    set((s) => ({
      transactions: [txn, ...s.transactions],
      lots: [...s.lots, lot],
    }))
    persistSlice(get)
  },

  recordSell: (input) => {
    const quantityMicros = sharesToMicros(input.shares)
    if (quantityMicros <= 0) throw new Error('Quantity must be positive')
    const priceMicros = dollarsToPriceMicros(input.priceDollars)
    if (priceMicros <= 0) throw new Error('Price must be positive')
    const feesCents = dollarsToCents(input.feesDollars ?? 0)
    const pos = positionFromLots(get().lots, input.portfolioId, input.securityId)
    if (quantityMicros > pos.quantityMicros) {
      throw new Error('Cannot sell more shares than held (short selling disabled)')
    }
    const gross = grossCentsFromTrade(quantityMicros, priceMicros)
    const txn: InvestmentTransaction = {
      id: generateId('itx'),
      portfolioId: input.portfolioId,
      securityId: input.securityId,
      type: 'SELL',
      tradeDate: input.tradeDate,
      settlementDate: input.tradeDate,
      quantityMicros,
      priceMicros,
      grossAmountCents: gross,
      feesCents,
      netAmountCents: gross - feesCents,
      currency: 'USD',
      notes: input.notes,
      createdAt: new Date().toISOString(),
    }
    const result = applyFifoSell(
      get().lots,
      input.portfolioId,
      input.securityId,
      quantityMicros,
      priceMicros,
      feesCents,
    )
    set((s) => ({
      transactions: [txn, ...s.transactions],
      lots: result.lots,
      realizedByTxn: { ...s.realizedByTxn, [txn.id]: result.realizedPnLCents },
    }))
    persistSlice(get)
  },

  recordDividend: (input) => {
    const quantityMicros = sharesToMicros(input.shares)
    const priceMicros = dollarsToPriceMicros(input.amountPerShare)
    const gross = grossCentsFromTrade(quantityMicros, priceMicros)
    const txn: InvestmentTransaction = {
      id: generateId('itx'),
      portfolioId: input.portfolioId,
      securityId: input.securityId,
      type: 'DIVIDEND',
      tradeDate: input.paymentDate,
      settlementDate: input.paymentDate,
      quantityMicros,
      priceMicros,
      grossAmountCents: gross,
      feesCents: 0,
      netAmountCents: gross,
      currency: 'USD',
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ transactions: [txn, ...s.transactions] }))
    persistSlice(get)
  },

  addWatchlist: (name) => {
    set((s) => ({
      watchlists: [
        ...s.watchlists,
        { id: generateId('wl'), name, securityIds: [], createdAt: new Date().toISOString() },
      ],
    }))
    persistSlice(get)
  },

  removeWatchlist: (id) => {
    set((s) => ({ watchlists: s.watchlists.filter((w) => w.id !== id) }))
    persistSlice(get)
  },

  addToWatchlist: (watchlistId, securityId) => {
    set((s) => ({
      watchlists: s.watchlists.map((w) =>
        w.id === watchlistId && !w.securityIds.includes(securityId)
          ? { ...w, securityIds: [...w.securityIds, securityId] }
          : w,
      ),
    }))
    persistSlice(get)
  },

  removeFromWatchlist: (watchlistId, securityId) => {
    set((s) => ({
      watchlists: s.watchlists.map((w) =>
        w.id === watchlistId
          ? { ...w, securityIds: w.securityIds.filter((id) => id !== securityId) }
          : w,
      ),
    }))
    persistSlice(get)
  },

  addResearchNote: (note) => {
    const now = new Date().toISOString()
    set((s) => ({
      researchNotes: [
        { ...note, id: generateId('note'), createdAt: now, updatedAt: now },
        ...s.researchNotes,
      ],
    }))
    persistSlice(get)
  },

  updateResearchNote: (id, updates) => {
    set((s) => ({
      researchNotes: s.researchNotes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
      ),
    }))
    persistSlice(get)
  },

  deleteResearchNote: (id) => {
    set((s) => ({ researchNotes: s.researchNotes.filter((n) => n.id !== id) }))
    persistSlice(get)
  },

  importTransactions: (txns) => {
    const stamped = txns.map((t) => ({
      ...t,
      id: generateId('itx'),
      createdAt: new Date().toISOString(),
    }))
    const merged = [...stamped, ...get().transactions]
    const { lots, realizedByTxn } = rebuildLotsFromTransactions(merged)
    set({ transactions: merged, lots, realizedByTxn })
    persistSlice(get)
  },
}))
