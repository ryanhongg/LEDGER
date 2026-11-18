import WebSocket from 'ws'
import { EventEmitter } from 'node:events'

export type StreamConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'subscribed'
  | 'streaming'
  | 'error'

export interface StreamQuoteUpdate {
  symbol: string
  price: number
  timestamp: string
  source: 'tiingo_24x5' | 'tiingo_iex_reference'
  freshness: 'live_reference'
  priceType: 'reference'
}

interface HubStatus {
  state: StreamConnectionState
  upstreamUrl: string | null
  thresholdLevel: number | null
  subscribedTickers: string[]
  lastMessageAt: string | null
  lastQuoteAt: string | null
  lastError: string | null
  subscriptionId: number | string | null
}

/**
 * Server-side Tiingo WebSocket hub.
 * Prefers 24x5 consolidated feed (equity/intraday); falls back to IEX reference (threshold 6).
 * API token never leaves this process.
 */
export class TiingoStreamHub extends EventEmitter {
  private ws: WebSocket | null = null
  private tickers = new Set<string>()
  private reconnectAttempt = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private intentionalClose = false
  private status: HubStatus = {
    state: 'disconnected',
    upstreamUrl: null,
    thresholdLevel: null,
    subscribedTickers: [],
    lastMessageAt: null,
    lastQuoteAt: null,
    lastError: null,
    subscriptionId: null,
  }

  private getApiKey: () => string | null

  constructor(getApiKey: () => string | null) {
    super()
    this.getApiKey = getApiKey
  }

  getStatus(): HubStatus {
    return {
      ...this.status,
      subscribedTickers: [...this.tickers],
    }
  }

  setTickers(symbols: string[]): void {
    const next = new Set(
      symbols.map((s) => s.trim().toLowerCase()).filter(Boolean),
    )
    const changed =
      next.size !== this.tickers.size ||
      [...next].some((t) => !this.tickers.has(t))
    this.tickers = next
    this.status.subscribedTickers = [...this.tickers]
    if (this.tickers.size === 0) {
      this.disconnect()
      return
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
      return
    }
    if (changed) {
      // Resubscribe on open connection by reconnecting cleanly
      this.reconnect(true)
    }
  }

  connect(): void {
    const key = this.getApiKey()
    if (!key) {
      this.status.state = 'error'
      this.status.lastError = 'No TIINGO_API_KEY configured'
      this.emit('status', this.getStatus())
      return
    }
    if (this.tickers.size === 0) return
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    this.intentionalClose = false
    // Prefer 24x5 consolidated; IEX threshold 6 is reference-only fallback
    this.openUpstream('wss://api.tiingo.com/equity/intraday', 6, key, 'tiingo_24x5')
  }

  private openUpstream(
    url: string,
    thresholdLevel: number,
    key: string,
    source: StreamQuoteUpdate['source'],
  ): void {
    this.status.state = 'connecting'
    this.status.upstreamUrl = url
    this.status.thresholdLevel = thresholdLevel
    this.status.lastError = null
    this.emit('status', this.getStatus())

    const ws = new WebSocket(url)
    this.ws = ws

    ws.on('open', () => {
      const payload = {
        eventName: 'subscribe',
        authorization: key,
        eventData: {
          thresholdLevel,
          tickers: [...this.tickers],
        },
      }
      ws.send(JSON.stringify(payload))
    })

    ws.on('message', (raw) => {
      this.status.lastMessageAt = new Date().toISOString()
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>
      } catch {
        return
      }

      const messageType = String(msg.messageType ?? '')
      if (messageType === 'I') {
        const data = msg.data as { subscriptionId?: number | string } | undefined
        this.status.subscriptionId = data?.subscriptionId ?? null
        this.status.state = 'subscribed'
        this.reconnectAttempt = 0
        this.emit('status', this.getStatus())
        return
      }
      if (messageType === 'H') {
        // heartbeat — connection alive; not a price
        if (this.status.state === 'subscribed') {
          // remain subscribed until first quote
        }
        this.emit('status', this.getStatus())
        return
      }
      if (messageType === 'E') {
        const response = msg.response as { message?: string; code?: number } | undefined
        const errMsg = response?.message ?? 'Tiingo stream error'
        // If 24x5 fails entitlement, fall back to IEX reference
        if (
          source === 'tiingo_24x5' &&
          this.ws === ws &&
          /threshold|subscription|entitle|valid/i.test(errMsg)
        ) {
          this.status.lastError = errMsg
          try {
            ws.close()
          } catch {
            /* ignore */
          }
          this.ws = null
          this.openUpstream('wss://api.tiingo.com/iex', 6, key, 'tiingo_iex_reference')
          return
        }
        this.status.state = 'error'
        this.status.lastError = errMsg
        this.emit('status', this.getStatus())
        return
      }

      // Price / data frames (messageType A or data array)
      const update = parseStreamQuote(msg, source)
      if (update) {
        this.status.state = 'streaming'
        this.status.lastQuoteAt = update.timestamp
        this.emit('quote', update)
        this.emit('status', this.getStatus())
      }
    })

    ws.on('error', (err) => {
      this.status.state = 'error'
      this.status.lastError = err.message
      this.emit('status', this.getStatus())
    })

    ws.on('close', () => {
      if (this.ws === ws) this.ws = null
      if (this.intentionalClose) {
        this.status.state = 'disconnected'
        this.emit('status', this.getStatus())
        return
      }
      this.status.state = 'disconnected'
      this.emit('status', this.getStatus())
      this.scheduleReconnect()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    if (this.tickers.size === 0) return
    const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private reconnect(force = false): void {
    this.intentionalClose = !force ? this.intentionalClose : false
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
      this.ws = null
    }
    this.connect()
  }

  disconnect(): void {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
      this.ws = null
    }
    this.status.state = 'disconnected'
    this.emit('status', this.getStatus())
  }
}

function parseStreamQuote(
  msg: Record<string, unknown>,
  source: StreamQuoteUpdate['source'],
): StreamQuoteUpdate | null {
  const data = msg.data
  if (!Array.isArray(data) || data.length < 2) return null

  // IEX threshold 6 reference: [date, ticker, referencePrice]
  // Trade-like frames may include more fields; pick price flexibly.
  let timestamp = ''
  let symbol = ''
  let price: number | null = null

  if (typeof data[0] === 'string' && typeof data[1] === 'string') {
    // Could be [date, ticker, price] OR [msgType, date, ...]
    if (/^\d{4}-\d{2}-\d{2}/.test(data[0]) || data[0].includes('T')) {
      timestamp = data[0]
      symbol = String(data[1]).toUpperCase()
      const p = data[2]
      if (typeof p === 'number') price = p
    } else if (data[0] === 'T' || data[0] === 'Q' || data[0] === 'A') {
      timestamp = String(data[1] ?? '')
      // IEX TOPS: ticker at index 3, last at 9, mid at 6
      symbol = String(data[3] ?? '').toUpperCase()
      const last = data[9]
      const mid = data[6]
      const ref = data[2]
      if (typeof last === 'number') price = last
      else if (typeof mid === 'number') price = mid
      else if (typeof ref === 'number') price = ref
    }
  }

  // Some consolidated frames: object in data
  if (!price && data.length >= 3 && typeof data[2] === 'number') {
    timestamp = String(data[0] ?? new Date().toISOString())
    symbol = String(data[1] ?? '').toUpperCase()
    price = data[2]
  }

  if (!symbol || price == null || !Number.isFinite(price)) return null

  return {
    symbol,
    price,
    timestamp: timestamp || new Date().toISOString(),
    source,
    freshness: 'live_reference',
    priceType: 'reference',
  }
}

let hubSingleton: TiingoStreamHub | null = null

export function getStreamHub(): TiingoStreamHub {
  if (!hubSingleton) {
    hubSingleton = new TiingoStreamHub(
      () => process.env.TIINGO_API_KEY?.trim() || null,
    )
  }
  return hubSingleton
}
