import { enqueueTiingo } from './tiingoQueue.js'

export type QuoteFreshness =
  | 'live_reference'
  | 'delayed'
  | 'end_of_day'
  | 'historical'
  | 'stale'
  | 'unavailable'

export interface NormalizedQuote {
  symbol: string
  price: number
  previousClose?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  timestamp: string
  provider: 'tiingo'
  priceType: 'end_of_day' | 'reference'
  freshness: QuoteFreshness
  quoteTimestamp?: string | null
  lastSaleTimestamp?: string | null
}

export interface NormalizedBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  adjustedClose: number
  volume: number
}

export interface SecuritySearchResult {
  symbol: string
  name: string
  exchange: string
  assetType: string
  currency: string
}

const BASE = 'https://api.tiingo.com'

async function tiingoFetchOnce(path: string, apiKey: string): Promise<unknown> {
  const url = path.includes('?')
    ? `${BASE}${path}&token=${encodeURIComponent(apiKey)}`
    : `${BASE}${path}?token=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${apiKey}`,
    },
  })

  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error('Invalid or unauthorized Tiingo API key'), {
      status: 401,
      code: 'INVALID_API_KEY',
    })
  }
  if (res.status === 429) {
    throw Object.assign(new Error('Tiingo rate limit exceeded'), {
      status: 429,
      code: 'RATE_LIMIT',
    })
  }
  if (!res.ok) {
    const text = await res.text()
    throw Object.assign(new Error(`Tiingo error ${res.status}: ${text.slice(0, 200)}`), {
      status: res.status,
      code: 'PROVIDER_ERROR',
    })
  }
  return res.json()
}

async function tiingoFetch(path: string, apiKey: string, retries = 1): Promise<unknown> {
  return enqueueTiingo(async () => {
    let attempt = 0
    for (;;) {
      try {
        return await tiingoFetchOnce(path, apiKey)
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code === 'RATE_LIMIT' && attempt < retries) {
          attempt += 1
          // Longer backoff — free/starter Tiingo plans throttle aggressively
          await new Promise((r) => setTimeout(r, 5000 * attempt))
          continue
        }
        throw e
      }
    }
  })
}

function classifyIexFreshness(row: {
  timestamp?: string
  quoteTimestamp?: string | null
  lastSaleTimestamp?: string | null
}): QuoteFreshness {
  const liveTs = row.quoteTimestamp || row.lastSaleTimestamp
  if (liveTs) {
    const ageMs = Date.now() - new Date(liveTs).getTime()
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 15 * 60_000) {
      return 'live_reference'
    }
    if (Number.isFinite(ageMs) && ageMs < 24 * 60 * 60_000) return 'delayed'
  }
  // Session snapshot / consolidated last without live quote timestamps
  return 'end_of_day'
}

export class TiingoProvider {
  private apiKey: string
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async testConnection(): Promise<{
    ok: boolean
    symbol: string
    price: number
    timestamp: string
    freshness: QuoteFreshness
    provider: 'tiingo'
  }> {
    const quote = await this.getQuote('AAPL')
    return {
      ok: true,
      symbol: quote.symbol,
      price: quote.price,
      timestamp: quote.timestamp,
      freshness: quote.freshness,
      provider: 'tiingo',
    }
  }

  async searchSecurities(query: string): Promise<SecuritySearchResult[]> {
    const data = (await tiingoFetch(
      `/tiingo/utilities/search?query=${encodeURIComponent(query)}`,
      this.apiKey,
    )) as Array<{
      ticker?: string
      name?: string
      exchangeCode?: string
      assetType?: string
    }>

    return (data ?? [])
      .filter((d) => d.ticker)
      .slice(0, 25)
      .map((d) => ({
        symbol: String(d.ticker).toUpperCase(),
        name: d.name ?? String(d.ticker),
        exchange: d.exchangeCode ?? 'UNKNOWN',
        assetType: (d.assetType ?? 'Stock').toLowerCase().includes('etf')
          ? 'etf'
          : 'stock',
        currency: 'USD',
      }))
  }

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const ticker = symbol.toUpperCase()
    const data = (await tiingoFetch(
      `/iex/${encodeURIComponent(ticker)}`,
      this.apiKey,
    )) as Array<{
      ticker?: string
      tngoLast?: number
      last?: number
      prevClose?: number
      open?: number
      high?: number
      low?: number
      volume?: number
      timestamp?: string
      quoteTimestamp?: string | null
      lastSaleTimestamp?: string | null
    }>

    const row = Array.isArray(data) ? data[0] : null
    const iexPrice = row ? (row.tngoLast ?? row.last) : null

    if (row && iexPrice != null) {
      const freshness = classifyIexFreshness(row)
      return {
        symbol: ticker,
        price: iexPrice,
        previousClose: row.prevClose,
        open: row.open,
        high: row.high,
        low: row.low,
        volume: row.volume,
        timestamp:
          row.quoteTimestamp ||
          row.lastSaleTimestamp ||
          row.timestamp ||
          new Date().toISOString(),
        provider: 'tiingo',
        priceType: 'reference',
        freshness,
        quoteTimestamp: row.quoteTimestamp ?? null,
        lastSaleTimestamp: row.lastSaleTimestamp ?? null,
      }
    }

    // Empty IEX payload or null last → EOD adjusted close (not fabricated)
    return this.getEodQuote(ticker)
  }

  private async getEodQuote(ticker: string): Promise<NormalizedQuote> {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 10)
    const eod = await this.getHistoricalPrices(
      ticker,
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
    )
    const last = eod[eod.length - 1]
    if (!last) {
      throw Object.assign(new Error(`No quote for ${ticker}`), {
        status: 404,
        code: 'NO_QUOTE',
      })
    }
    return {
      symbol: ticker,
      price: last.adjustedClose,
      previousClose: eod.length > 1 ? eod[eod.length - 2].adjustedClose : undefined,
      open: last.open,
      high: last.high,
      low: last.low,
      volume: last.volume,
      timestamp: last.date,
      provider: 'tiingo',
      priceType: 'end_of_day',
      freshness: 'end_of_day',
    }
  }

  async getHistoricalPrices(
    symbol: string,
    startDate?: string,
    endDate?: string,
  ): Promise<NormalizedBar[]> {
    const ticker = symbol.toUpperCase()
    const params = new URLSearchParams({ format: 'json' })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    const data = (await tiingoFetch(
      `/tiingo/daily/${encodeURIComponent(ticker)}/prices?${params}`,
      this.apiKey,
    )) as Array<{
      date: string
      open: number
      high: number
      low: number
      close: number
      adjClose: number
      volume: number
    }>

    return (data ?? []).map((d) => ({
      date: d.date.slice(0, 10),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      adjustedClose: d.adjClose ?? d.close,
      volume: d.volume ?? 0,
    }))
  }

  async getDividends(
    symbol: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ date: string; amount: number }[]> {
    const ticker = symbol.toUpperCase()
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const qs = params.toString()
    const data = (await tiingoFetch(
      `/tiingo/corporate-actions/${encodeURIComponent(ticker)}/distributions${qs ? `?${qs}` : ''}`,
      this.apiKey,
    )) as Array<{ exDate?: string; date?: string; amount?: number; value?: number }>

    return (data ?? [])
      .map((d) => ({
        date: (d.exDate ?? d.date ?? '').slice(0, 10),
        amount: d.amount ?? d.value ?? 0,
      }))
      .filter((d) => d.date && d.amount)
  }

  async getMeta(symbol: string): Promise<{
    symbol: string
    name: string
    exchange: string
    startDate?: string
    endDate?: string
  }> {
    const ticker = symbol.toUpperCase()
    const data = (await tiingoFetch(
      `/tiingo/daily/${encodeURIComponent(ticker)}`,
      this.apiKey,
    )) as {
      ticker?: string
      name?: string
      exchangeCode?: string
      startDate?: string
      endDate?: string
    }
    return {
      symbol: data.ticker ?? ticker,
      name: data.name ?? ticker,
      exchange: data.exchangeCode ?? 'UNKNOWN',
      startDate: data.startDate,
      endDate: data.endDate,
    }
  }
}
