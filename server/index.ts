import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import marketDataRouter from './routes/marketData.js'
import { errorHandler } from './middleware/errorHandler.js'
import { getStreamHub } from './services/providers/TiingoStreamHub.js'

const app = express()
const PORT = Number(process.env.PORT ?? 8787)

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ledger-market-api' })
})

app.use('/api/market', marketDataRouter)
app.use(errorHandler)

const server = http.createServer(app)

/** Browser-facing WS — never forwards the Tiingo API key. */
const wss = new WebSocketServer({ server, path: '/api/market/stream' })
const hub = getStreamHub()

wss.on('connection', (client) => {
  const send = (payload: unknown) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload))
    }
  }

  send({ type: 'hello', status: hub.getStatus(), configured: Boolean(process.env.TIINGO_API_KEY?.trim()) })

  const onQuote = (quote: unknown) => send({ type: 'quote', quote })
  const onStatus = (status: unknown) => send({ type: 'status', status })
  hub.on('quote', onQuote)
  hub.on('status', onStatus)

  client.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as {
        type?: string
        tickers?: string[]
      }
      if (msg.type === 'subscribe' && Array.isArray(msg.tickers)) {
        if (!process.env.TIINGO_API_KEY?.trim()) {
          send({
            type: 'error',
            code: 'NO_API_KEY',
            message: 'Streaming requires TIINGO_API_KEY on the server',
          })
          return
        }
        hub.setTickers(msg.tickers.map(String))
        send({ type: 'subscribed', status: hub.getStatus() })
      }
      if (msg.type === 'ping') {
        send({ type: 'pong', at: new Date().toISOString() })
      }
    } catch {
      send({ type: 'error', code: 'BAD_MESSAGE', message: 'Invalid JSON' })
    }
  })

  client.on('close', () => {
    hub.off('quote', onQuote)
    hub.off('status', onStatus)
  })
})

server.listen(PORT, () => {
  const configured = Boolean(process.env.TIINGO_API_KEY?.trim())
  console.log(`LEDGER market API on http://127.0.0.1:${PORT}`)
  console.log(`WebSocket stream: ws://127.0.0.1:${PORT}/api/market/stream`)
  console.log(
    configured
      ? 'Tiingo API key detected — REST + 24x5/IEX reference stream enabled.'
      : 'No TIINGO_API_KEY — demo mode only.',
  )
})
