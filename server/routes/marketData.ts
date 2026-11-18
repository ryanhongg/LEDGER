import { Router } from 'express'
import { getCache, setCache, logRequest } from '../database/connection.js'
import { TiingoProvider } from '../services/providers/TiingoProvider.js'
import { getStreamHub } from '../services/providers/TiingoStreamHub.js'

const router = Router()

function getProvider(): TiingoProvider | null {
  const key = process.env.TIINGO_API_KEY?.trim()
  if (!key) return null
  return new TiingoProvider(key)
}

function ttl(): number {
  return Number(process.env.MARKET_DATA_CACHE_TTL_SECONDS ?? 300)
}

function isRateLimit(e: unknown): boolean {
  return (e as { code?: string; status?: number }).code === 'RATE_LIMIT' ||
    (e as { status?: number }).status === 429
}

router.get('/status', (_req, res) => {
  const configured = Boolean(process.env.TIINGO_API_KEY?.trim())
  const stream = getStreamHub().getStatus()
  res.json({
    provider: process.env.MARKET_DATA_PROVIDER ?? 'tiingo',
    configured,
    mode: configured ? 'live_proxy' : 'demo',
    note: configured
      ? 'Tiingo credentials loaded server-side. REST IEX quotes + 24x5/IEX reference WebSocket. Live ticks only when the provider streams updates; after-hours REST snapshots are labeled end_of_day/delayed — not entitlement-verified exchange TOPS.'
      : 'No TIINGO_API_KEY configured. Frontend should use clearly labeled demo prices.',
    websocket: stream,
  })
})

/** Validates credentials with a live AAPL quote. Never returns the API key. */
router.post('/test-connection', async (_req, res, next) => {
  try {
    const provider = getProvider()
    if (!provider) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_API_KEY',
          message: 'TIINGO_API_KEY is not set in the server environment.',
        },
      })
    }
    logRequest('test-connection')
    const result = await provider.testConnection()
    res.json({
      ok: true,
      provider: 'tiingo',
      testedAt: new Date().toISOString(),
      quote: result,
      message: `Authenticated. AAPL ${result.freshness} quote received.`,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim()
    if (!q) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'q required' } })

    const provider = getProvider()
    if (!provider) {
      return res.json({ mode: 'demo', results: [] })
    }

    const cacheKey = `search:${q.toLowerCase()}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ mode: 'live', results: cached.payload, cachedAt: cached.fetchedAt })

    logRequest('search')
    const results = await provider.searchSecurities(q)
    setCache(cacheKey, results, ttl())
    res.json({ mode: 'live', results })
  } catch (e) {
    next(e)
  }
})

async function fetchQuoteWithCache(
  provider: TiingoProvider,
  symbol: string,
  force: boolean,
): Promise<{
  mode: 'live'
  quote: unknown
  freshness: string
  cachedAt?: string
  staleCache?: boolean
}> {
  const cacheKey = `quote:${symbol}`
  if (!force) {
    const cached = getCache(cacheKey)
    if (cached) {
      const q = cached.payload as { freshness?: string }
      return {
        mode: 'live',
        quote: cached.payload,
        cachedAt: cached.fetchedAt,
        freshness: q.freshness ?? 'end_of_day',
      }
    }
  }

  try {
    logRequest('quote')
    const quote = await provider.getQuote(symbol)
    setCache(cacheKey, quote, Math.min(ttl(), 120))
    return { mode: 'live', quote, freshness: quote.freshness }
  } catch (e) {
    const stale = getCache(cacheKey, { allowExpired: true })
    if (stale && isRateLimit(e)) {
      const q = stale.payload as { freshness?: string }
      return {
        mode: 'live',
        quote: { ...(stale.payload as object), freshness: 'stale' },
        cachedAt: stale.fetchedAt,
        freshness: 'stale',
        staleCache: true,
      }
    }
    if (stale && !force) {
      const q = stale.payload as { freshness?: string }
      return {
        mode: 'live',
        quote: { ...(stale.payload as object), freshness: q.freshness ?? 'stale' },
        cachedAt: stale.fetchedAt,
        freshness: q.freshness ?? 'stale',
        staleCache: true,
      }
    }
    throw e
  }
}

router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase()
    const provider = getProvider()
    if (!provider) {
      return res.status(503).json({
        error: {
          code: 'DEMO_MODE',
          message: 'No API key configured. Use demo prices on the client.',
        },
      })
    }

    const force = String(req.query.force ?? '') === '1'
    const result = await fetchQuoteWithCache(provider, symbol, force)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

/** Multi-symbol quotes — fetched sequentially server-side to respect rate limits. */
router.get('/quotes', async (req, res, next) => {
  try {
    const provider = getProvider()
    if (!provider) {
      return res.status(503).json({
        error: {
          code: 'DEMO_MODE',
          message: 'No API key configured. Use demo prices on the client.',
        },
      })
    }

    const raw = String(req.query.symbols ?? '')
    const symbols = [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      ),
    ].slice(0, 40)

    if (symbols.length === 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'symbols query required' },
      })
    }

    const force = String(req.query.force ?? '') === '1'
    const quotes: Record<string, unknown> = {}
    const errors: Record<string, { code: string; message: string }> = {}

    for (const symbol of symbols) {
      try {
        const result = await fetchQuoteWithCache(provider, symbol, force)
        quotes[symbol] = result.quote
      } catch (e) {
        errors[symbol] = {
          code: (e as { code?: string }).code ?? 'PROVIDER_ERROR',
          message: e instanceof Error ? e.message : 'Quote failed',
        }
      }
    }

    res.json({ mode: 'live', quotes, errors })
  } catch (e) {
    next(e)
  }
})

router.post('/stream/subscribe', (req, res) => {
  const configured = Boolean(process.env.TIINGO_API_KEY?.trim())
  if (!configured) {
    return res.status(503).json({
      error: { code: 'DEMO_MODE', message: 'No API key — streaming unavailable' },
    })
  }
  const tickers = Array.isArray(req.body?.tickers)
    ? (req.body.tickers as unknown[]).map((t) => String(t).toUpperCase())
    : []
  const hub = getStreamHub()
  hub.setTickers(tickers)
  res.json({ ok: true, websocket: hub.getStatus() })
})

router.get('/history/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase()
    const startDate = req.query.start ? String(req.query.start) : undefined
    const endDate = req.query.end ? String(req.query.end) : undefined
    const force = String(req.query.force ?? '') === '1'
    const provider = getProvider()
    if (!provider) {
      return res.status(503).json({
        error: {
          code: 'DEMO_MODE',
          message: 'No API key configured. Use demo prices on the client.',
        },
      })
    }

    const cacheKey = `hist:${symbol}:${startDate ?? ''}:${endDate ?? ''}`
    if (!force) {
      const cached = getCache(cacheKey)
      if (cached) {
        return res.json({
          mode: 'live',
          bars: cached.payload,
          cachedAt: cached.fetchedAt,
          priceBasis: 'adjusted_close',
        })
      }
    }

    try {
      logRequest('history')
      const bars = await provider.getHistoricalPrices(symbol, startDate, endDate)
      setCache(cacheKey, bars, 3600 * 12)
      res.json({ mode: 'live', bars, priceBasis: 'adjusted_close' })
    } catch (e) {
      const stale = getCache(cacheKey, { allowExpired: true })
      if (stale && isRateLimit(e)) {
        return res.json({
          mode: 'live',
          bars: stale.payload,
          cachedAt: stale.fetchedAt,
          priceBasis: 'adjusted_close',
          staleCache: true,
        })
      }
      throw e
    }
  } catch (e) {
    next(e)
  }
})

router.get('/meta/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase()
    const provider = getProvider()
    if (!provider) {
      return res.status(503).json({ error: { code: 'DEMO_MODE', message: 'No API key' } })
    }
    const cacheKey = `meta:${symbol}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ mode: 'live', meta: cached.payload })
    logRequest('meta')
    const meta = await provider.getMeta(symbol)
    setCache(cacheKey, meta, 86400)
    res.json({ mode: 'live', meta })
  } catch (e) {
    next(e)
  }
})

export default router
