import { RefreshCw, Wifi, WifiOff, AlertTriangle, Radio } from 'lucide-react'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

function newestLiveQuoteTimestamp(
  quotes: Record<string, { timestamp: string; isDemo: boolean; freshness: string; priceCents: number }>,
) {
  const times = Object.values(quotes)
    .filter(
      (q) =>
        !q.isDemo &&
        q.freshness !== 'unavailable' &&
        q.priceCents > 0 &&
        q.timestamp,
    )
    .map((q) => q.timestamp)
    .sort()
  return times.length ? times[times.length - 1] : null
}

function connectionLabel(streamState: string, configured: boolean) {
  if (!configured) return 'Offline'
  switch (streamState) {
    case 'streaming':
    case 'subscribed':
    case 'connecting':
      return 'Connected'
    case 'error':
      return 'Error'
    default:
      return 'Disconnected'
  }
}

function streamingLabel(streamState: string, lastQuoteAt: string | null | undefined) {
  if (streamState === 'streaming' && lastQuoteAt) return 'Active'
  if (streamState === 'subscribed') return 'Waiting for ticks'
  if (streamState === 'connecting') return 'Connecting'
  if (streamState === 'error') return 'Unavailable'
  return 'Inactive'
}

function dataStatusLabel(quotes: Record<string, { freshness: string; isDemo: boolean; priceCents: number }>) {
  const usable = Object.values(quotes).filter(
    (q) => !q.isDemo && q.freshness !== 'unavailable' && q.priceCents > 0,
  )
  if (usable.length === 0) return 'Unavailable'
  if (usable.some((q) => q.freshness === 'live_reference')) return 'Live reference'
  if (usable.some((q) => q.freshness === 'stale')) return 'Stale'
  if (usable.some((q) => q.freshness === 'delayed')) return 'Delayed'
  return 'End of day'
}

export function MarketDataStatus({ className }: { className?: string }) {
  const status = useInvestmentStore((s) => s.marketStatus)
  const streamState = useInvestmentStore((s) => s.streamState)
  const streamError = useInvestmentStore((s) => s.streamError)
  const refreshMarketStatus = useInvestmentStore((s) => s.refreshMarketStatus)
  const refreshQuotes = useInvestmentStore((s) => s.refreshQuotes)
  const startMarketStream = useInvestmentStore((s) => s.startMarketStream)
  const quotes = useInvestmentStore((s) => s.quotes)

  const demoCount = Object.values(quotes).filter((q) => q.isDemo).length
  const liveCount = Object.values(quotes).filter(
    (q) => !q.isDemo && q.freshness !== 'unavailable' && q.priceCents > 0,
  ).length
  const staleCount = Object.values(quotes).filter((q) => q.freshness === 'stale').length
  const latestTs = newestLiveQuoteTimestamp(quotes)
  const mode = status?.mode ?? 'demo'
  const configured = Boolean(status?.configured)
  const lastStreamQuote = status?.websocket?.lastQuoteAt ?? null

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-[12px]', className)}>
      {mode === 'demo' ? (
        <Badge variant="amber">
          <WifiOff size={11} />
          Provider: Demo
        </Badge>
      ) : (
        <Badge variant="accent">
          <Wifi size={11} />
          Provider: Tiingo
        </Badge>
      )}

      {mode !== 'demo' && (
        <>
          <Badge
            variant={
              connectionLabel(streamState, configured) === 'Connected'
                ? 'positive'
                : streamState === 'error'
                  ? 'negative'
                  : 'neutral'
            }
          >
            Connection: {connectionLabel(streamState, configured)}
          </Badge>
          <Badge
            variant={
              streamingLabel(streamState, lastStreamQuote) === 'Active'
                ? 'positive'
                : 'neutral'
            }
          >
            <Radio size={11} />
            Streaming: {streamingLabel(streamState, lastStreamQuote)}
          </Badge>
          <Badge variant="neutral">Data: {dataStatusLabel(quotes)}</Badge>
        </>
      )}

      {latestTs && (
        <Badge variant="neutral">
          Last quote: {new Date(latestTs).toLocaleString()}
        </Badge>
      )}

      {demoCount > 0 && <Badge variant="amber">{demoCount} demo</Badge>}
      {liveCount > 0 && <Badge variant="positive">{liveCount} priced</Badge>}
      {staleCount > 0 && (
        <Badge variant="negative">
          <AlertTriangle size={11} />
          {staleCount} stale
        </Badge>
      )}
      {streamError && (
        <Badge variant="negative" className="max-w-[220px] truncate">
          {streamError}
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void refreshMarketStatus()
          void refreshQuotes()
          if (status?.configured) startMarketStream()
        }}
      >
        <RefreshCw size={13} />
        Refresh prices
      </Button>
    </div>
  )
}
