import type { HistoricalBar, MarketQuote, PriceFreshness } from '@/types/investment'
import {
  getDemoHistory,
  getDemoQuote,
  searchDemoSecurities,
} from '@/data/demoMarketData'
import { dollarsToCents } from '@/utils/currency'

export interface MarketStatus {
  provider: string
  configured: boolean
  mode: 'live_proxy' | 'demo'
  note: string
  websocket?: {
    state: string
    upstreamUrl: string | null
    lastMessageAt: string | null
    lastQuoteAt: string | null
    lastError: string | null
    subscribedTickers: string[]
  }
}

export interface ConnectionTestResult {
  ok: boolean
  message?: string
  testedAt?: string
  quote?: {
    symbol: string
    price: number
    timestamp: string
    freshness: PriceFreshness
    provider: string
  }
  error?: { code: string; message: string }
}

type QuoteListener = (symbol: string, quote: MarketQuote) => void

const quoteCache = new Map<string, { quote: MarketQuote; at: number }>()
const histCache = new Map<string, { bars: HistoricalBar[]; at: number }>()
const inflight = new Map<string, Promise<unknown>>()

let liveModeKnown: boolean | null = null

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.error?.message ?? body?.message ?? res.statusText), {
      status: res.status,
      code: body?.error?.code ?? body?.code,
      body,
    })
  }
  return res.json() as Promise<T>
}

export async function fetchMarketStatus(): Promise<MarketStatus> {
  try {
    const status = await api<MarketStatus>('/api/market/status')
    liveModeKnown = status.configured
    return status
  } catch {
    liveModeKnown = false
    return {
      provider: 'tiingo',
      configured: false,
      mode: 'demo',
      note: 'Market API unreachable.',
    }
  }
}

export async function testMarketConnection(): Promise<ConnectionTestResult> {
  try {
    const data = await api<ConnectionTestResult>('/api/market/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    liveModeKnown = true
    return data
  } catch (e) {
    const err = e as { message?: string; code?: string; body?: ConnectionTestResult }
    if (err.body && typeof err.body === 'object') {
      return {
        ok: false,
        error: err.body.error ?? {
          code: err.code ?? 'TEST_FAILED',
          message: err.message ?? 'Connection test failed',
        },
      }
    }
    return {
      ok: false,
      error: {
        code: (e as { code?: string }).code ?? 'TEST_FAILED',
        message: e instanceof Error ? e.message : 'Connection test failed',
      },
    }
  }
}

export async function searchSecurities(query: string) {
  if (!query.trim()) return []
  try {
    const data = await api<{
      mode: string
      results: Array<{
        symbol: string
        name: string
        exchange: string
        assetType: string
        currency: string
      }>
    }>(`/api/market/search?q=${encodeURIComponent(query)}`)
    if (data.mode === 'demo' || data.results.length === 0) {
      return searchDemoSecurities(query)
    }
    return data.results
  } catch {
    return searchDemoSecurities(query)
  }
}

function toQuoteFromLive(raw: {
  symbol: string
  price: number
  previousClose?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  timestamp: string
  freshness?: PriceFreshness
  priceType?: 'end_of_day' | 'reference'
}): MarketQuote {
  return {
    symbol: raw.symbol.toUpperCase(),
    priceCents: dollarsToCents(raw.price),
    previousCloseCents:
      raw.previousClose != null ? dollarsToCents(raw.previousClose) : undefined,
    openCents: raw.open != null ? dollarsToCents(raw.open) : undefined,
    highCents: raw.high != null ? dollarsToCents(raw.high) : undefined,
    lowCents: raw.low != null ? dollarsToCents(raw.low) : undefined,
    volume: raw.volume,
    timestamp: raw.timestamp,
    provider: 'tiingo',
    priceType: raw.priceType === 'reference' ? 'reference' : 'end_of_day',
    freshness: raw.freshness ?? 'end_of_day',
    isDemo: false,
  }
}

function unavailableQuote(symbol: string): MarketQuote {
  return {
    symbol: symbol.toUpperCase(),
    priceCents: 0,
    timestamp: new Date().toISOString(),
    provider: liveModeKnown ? 'tiingo' : 'none',
    priceType: liveModeKnown ? 'end_of_day' : 'demo',
    freshness: 'unavailable',
    isDemo: !liveModeKnown,
  }
}

/** Prefer an existing usable mark over a synthetic unavailable/zero quote. */
export function mergeQuote(
  previous: MarketQuote | undefined,
  next: MarketQuote,
): MarketQuote {
  const nextUsable =
    next.freshness !== 'unavailable' &&
    Number.isFinite(next.priceCents) &&
    next.priceCents > 0

  if (nextUsable) return next

  if (
    previous &&
    previous.freshness !== 'unavailable' &&
    previous.priceCents > 0 &&
    !previous.isDemo
  ) {
    return { ...previous, freshness: 'stale' }
  }

  if (
    previous &&
    previous.isDemo &&
    previous.priceCents > 0 &&
    liveModeKnown !== true
  ) {
    return previous
  }

  return next.freshness === 'unavailable' ? next : unavailableQuote(next.symbol)
}

export async function getQuote(symbol: string, force = false): Promise<MarketQuote> {
  const key = symbol.toUpperCase()
  const cached = quoteCache.get(key)
  if (!force && cached && Date.now() - cached.at < 30_000) return cached.quote

  const inflightKey = `q:${key}`
  if (inflight.has(inflightKey)) {
    return inflight.get(inflightKey) as Promise<MarketQuote>
  }

  const promise = (async () => {
    try {
      const data = await api<{ quote: Parameters<typeof toQuoteFromLive>[0] }>(
        `/api/market/quote/${key}${force ? '?force=1' : ''}`,
      )
      const quote = toQuoteFromLive(data.quote)
      const merged = mergeQuote(cached?.quote, quote)
      quoteCache.set(key, { quote: merged, at: Date.now() })
      liveModeKnown = true
      return merged
    } catch (e) {
      const code = (e as { code?: string }).code
      const status = (e as { status?: number }).status

      if (liveModeKnown || code === 'INVALID_API_KEY' || status === 401) {
        const merged = mergeQuote(cached?.quote, unavailableQuote(key))
        quoteCache.set(key, { quote: merged, at: Date.now() })
        return merged
      }

      if (cached && !cached.quote.isDemo) {
        const stale = { ...cached.quote, freshness: 'stale' as const }
        quoteCache.set(key, { quote: stale, at: Date.now() })
        return stale
      }
      const demo = getDemoQuote(key)
      if (!demo) {
        const u = unavailableQuote(key)
        quoteCache.set(key, { quote: u, at: Date.now() })
        return u
      }
      quoteCache.set(key, { quote: demo, at: Date.now() })
      return demo
    } finally {
      inflight.delete(inflightKey)
    }
  })()

  inflight.set(inflightKey, promise)
  return promise
}

/**
 * Multi-symbol REST quotes via server batch endpoint (sequential upstream).
 * Falls back to per-symbol getQuote if the batch route is unavailable.
 */
export async function getQuotes(
  symbols: string[],
  force = false,
): Promise<Record<string, MarketQuote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean))]
  const out: Record<string, MarketQuote> = {}
  if (unique.length === 0) return out

  try {
    const qs = new URLSearchParams({
      symbols: unique.join(','),
      ...(force ? { force: '1' } : {}),
    })
    const data = await api<{
      quotes: Record<string, Parameters<typeof toQuoteFromLive>[0]>
      errors?: Record<string, { code: string; message: string }>
    }>(`/api/market/quotes?${qs}`)

    liveModeKnown = true
    for (const sym of unique) {
      const raw = data.quotes?.[sym]
      const prev = quoteCache.get(sym)?.quote
      if (raw && typeof raw.price === 'number') {
        const merged = mergeQuote(prev, toQuoteFromLive(raw))
        quoteCache.set(sym, { quote: merged, at: Date.now() })
        out[sym] = merged
      } else {
        const merged = mergeQuote(prev, unavailableQuote(sym))
        quoteCache.set(sym, { quote: merged, at: Date.now() })
        out[sym] = merged
      }
    }
    return out
  } catch {
    for (const sym of unique) {
      out[sym] = await getQuote(sym, force)
    }
    return out
  }
}

export function applyStreamQuote(update: {
  symbol: string
  price: number
  timestamp: string
  freshness?: PriceFreshness
}): MarketQuote {
  const key = update.symbol.toUpperCase()
  const prev = quoteCache.get(key)?.quote
  const quote: MarketQuote = {
    symbol: key,
    priceCents: dollarsToCents(update.price),
    previousCloseCents: prev?.previousCloseCents,
    openCents: prev?.openCents,
    highCents: prev?.highCents,
    lowCents: prev?.lowCents,
    volume: prev?.volume,
    timestamp: update.timestamp,
    provider: 'tiingo',
    priceType: 'reference',
    freshness: update.freshness ?? 'live_reference',
    isDemo: false,
  }
  const merged = mergeQuote(prev, quote)
  quoteCache.set(key, { quote: merged, at: Date.now() })
  return merged
}

export async function getHistory(
  symbol: string,
  start?: string,
  end?: string,
  force = false,
): Promise<{
  bars: HistoricalBar[]
  isDemo: boolean
  priceBasis: string
  error?: string
}> {
  const key = `${symbol.toUpperCase()}:${start ?? ''}:${end ?? ''}`
  const cached = histCache.get(key)
  if (!force && cached && Date.now() - cached.at < 3_600_000) {
    return { bars: cached.bars, isDemo: false, priceBasis: 'adjusted_close' }
  }

  try {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    if (force) params.set('force', '1')
    const qs = params.toString()
    const data = await api<{
      bars: Array<{
        date: string
        open: number
        high: number
        low: number
        close: number
        adjustedClose: number
        volume: number
      }>
      priceBasis: string
      staleCache?: boolean
    }>(`/api/market/history/${symbol.toUpperCase()}${qs ? `?${qs}` : ''}`)

    const bars: HistoricalBar[] = (data.bars ?? []).map((b) => ({
      date: b.date,
      openCents: dollarsToCents(b.open),
      highCents: dollarsToCents(b.high),
      lowCents: dollarsToCents(b.low),
      closeCents: dollarsToCents(b.close),
      adjustedCloseCents: dollarsToCents(b.adjustedClose),
      volume: b.volume,
    }))
    if (bars.length > 0) {
      histCache.set(key, { bars, at: Date.now() })
    }
    liveModeKnown = true
    return {
      bars,
      isDemo: false,
      priceBasis: data.priceBasis ?? 'adjusted_close',
      error:
        bars.length === 0
          ? `No historical bars returned for ${symbol.toUpperCase()}`
          : undefined,
    }
  } catch (e) {
    if (cached?.bars?.length) {
      return {
        bars: cached.bars,
        isDemo: false,
        priceBasis: 'adjusted_close',
        error: e instanceof Error ? e.message : 'History fetch failed; using cache',
      }
    }
    if (liveModeKnown) {
      return {
        bars: [],
        isDemo: false,
        priceBasis: 'unavailable',
        error:
          e instanceof Error
            ? e.message
            : `Historical data unavailable for ${symbol.toUpperCase()}`,
      }
    }
    let bars = getDemoHistory(symbol)
    if (start) bars = bars.filter((b) => b.date >= start)
    if (end) bars = bars.filter((b) => b.date <= end)
    return { bars, isDemo: true, priceBasis: 'demo_synthetic' }
  }
}

/** Default lookback for analytics (~1 year of trading days). */
export function defaultHistoryStart(years = 1): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

export async function getHistories(
  symbols: string[],
  start?: string,
  end?: string,
  force = false,
): Promise<{
  histories: Record<string, HistoricalBar[]>
  isDemo: boolean
  errors: Record<string, string>
  priceBasis: string
}> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean))]
  const histories: Record<string, HistoricalBar[]> = {}
  const errors: Record<string, string> = {}
  let anyDemo = false
  let basis = 'adjusted_close'

  // Sequential to respect Tiingo rate limits
  for (const sym of unique) {
    const result = await getHistory(sym, start, end, force)
    histories[sym] = result.bars
    if (result.isDemo) anyDemo = true
    if (result.error) errors[sym] = result.error
    if (result.priceBasis === 'unavailable') basis = 'unavailable'
    else if (!anyDemo) basis = result.priceBasis
  }

  return { histories, isDemo: anyDemo, errors, priceBasis: basis }
}

export function subscribeQuotes(
  symbols: string[],
  listener: QuoteListener,
  intervalMs = 60_000,
): () => void {
  let cancelled = false
  const tick = async () => {
    if (cancelled) return
    const map = await getQuotes(symbols, false)
    for (const [sym, q] of Object.entries(map)) {
      if (cancelled) return
      listener(sym, q)
    }
  }
  void tick()
  const id = window.setInterval(() => void tick(), intervalMs)
  return () => {
    cancelled = true
    window.clearInterval(id)
  }
}

/** Browser WebSocket to LEDGER proxy (no API key). */
export function connectMarketStream(options: {
  tickers: string[]
  onQuote: (quote: MarketQuote) => void
  onStatus?: (status: unknown) => void
  onError?: (message: string) => void
}): () => void {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${window.location.host}/api/market/stream`
  let ws: WebSocket | null = null
  let closed = false
  let attempt = 0
  let timer: number | null = null

  const connect = () => {
    if (closed) return
    ws = new WebSocket(url)
    ws.onopen = () => {
      attempt = 0
      ws?.send(JSON.stringify({ type: 'subscribe', tickers: options.tickers }))
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type: string
          quote?: {
            symbol: string
            price: number
            timestamp: string
            freshness?: PriceFreshness
          }
          status?: unknown
          message?: string
        }
        if (msg.type === 'quote' && msg.quote) {
          options.onQuote(applyStreamQuote(msg.quote))
        }
        if (msg.type === 'status' || msg.type === 'subscribed' || msg.type === 'hello') {
          options.onStatus?.(msg.status ?? msg)
        }
        if (msg.type === 'error') {
          options.onError?.(msg.message ?? 'Stream error')
        }
      } catch {
        /* ignore */
      }
    }
    ws.onclose = () => {
      if (closed) return
      attempt += 1
      const delay = Math.min(30_000, 1000 * 2 ** attempt)
      timer = window.setTimeout(connect, delay)
    }
    ws.onerror = () => {
      options.onError?.('WebSocket connection error')
    }
  }

  connect()

  return () => {
    closed = true
    if (timer) window.clearTimeout(timer)
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
  }
}
