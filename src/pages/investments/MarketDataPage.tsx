import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Dropdown'
import { MarketDataStatus } from '@/components/investments/MarketDataStatus'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import {
  searchSecurities,
  getHistory,
  getQuote,
} from '@/services/marketData/MarketDataService'
import { formatCurrency, centsToDollars } from '@/utils/currency'

export function MarketDataPage() {
  const ensureSecurity = useInvestmentStore((s) => s.ensureSecurity)
  const addToWatchlist = useInvestmentStore((s) => s.addToWatchlist)
  const watchlists = useInvestmentStore((s) => s.watchlists)
  const marketStatus = useInvestmentStore((s) => s.marketStatus)
  const refreshMarketStatus = useInvestmentStore((s) => s.refreshMarketStatus)

  const [query, setQuery] = useState('AAPL')
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof searchSecurities>>
  >([])
  const [symbol, setSymbol] = useState('AAPL')
  const [bars, setBars] = useState<{ date: string; close: number }[]>([])
  const [isDemo, setIsDemo] = useState(true)
  const [quoteLabel, setQuoteLabel] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void refreshMarketStatus()
  }, [refreshMarketStatus])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const start = new Date()
      start.setMonth(start.getMonth() - 6)
      const { bars: hist, isDemo: demo } = await getHistory(
        symbol,
        start.toISOString().slice(0, 10),
      )
      const q = await getQuote(symbol)
      if (cancelled) return
      setIsDemo(demo || q.isDemo)
      setQuoteLabel(
        `${formatCurrency(q.priceCents)} · ${q.freshness} · ${q.provider}`,
      )
      setBars(
        hist.map((b) => ({
          date: b.date,
          close: centsToDollars(b.adjustedCloseCents),
        })),
      )
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [symbol])

  const runSearch = async () => {
    const r = await searchSecurities(query)
    setResults(r)
  }

  return (
    <>
      <Topbar title="Market Data" breadcrumb="Investment Management" showDateRange={false} />
      <PageContainer>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Market Data</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Search securities, inspect history, and monitor data freshness.
            </p>
          </div>
          <MarketDataStatus />
        </div>

        <Card className="mb-4">
          <CardHeader title="Provider configuration" subtitle="API keys stay on the server (.env) — never in the browser" />
          <div className="text-[13px] space-y-1 text-text-secondary">
            <p>
              Mode:{' '}
              <strong className="text-text">{marketStatus?.mode ?? '…'}</strong>
            </p>
            <p>{marketStatus?.note}</p>
            <p className="text-[12px]">
              Set <code className="bg-bg px-1 rounded">TIINGO_API_KEY</code> in{' '}
              <code className="bg-bg px-1 rounded">.env</code> and restart{' '}
              <code className="bg-bg px-1 rounded">npm run dev</code>.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-1">
            <CardHeader title="Security search" />
            <div className="flex gap-2 mb-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticker or name" />
              <Button onClick={() => void runSearch()}>Search</Button>
            </div>
            <div className="space-y-1 max-h-[360px] overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.symbol}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-bg cursor-pointer"
                  onClick={() => {
                    setSymbol(r.symbol)
                    const sec = ensureSecurity({
                      symbol: r.symbol,
                      name: r.name,
                      exchange: r.exchange,
                      assetType: r.assetType === 'etf' ? 'etf' : 'stock',
                    })
                    if (watchlists[0]) addToWatchlist(watchlists[0].id, sec.id)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[13px]">{r.symbol}</span>
                    <Badge variant="neutral">{r.assetType}</Badge>
                  </div>
                  <div className="text-[11px] text-text-secondary">{r.name} · {r.exchange}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader
              title={`${symbol} price history`}
              subtitle={quoteLabel}
              action={
                isDemo ? <Badge variant="amber">Demo / synthetic</Badge> : <Badge variant="accent">Provider</Badge>
              }
            />
            <div className="h-[340px]">
              {loading ? (
                <div className="h-full skeleton" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#747B87' }} minTickGap={40} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#747B87' }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Adj close']}
                      contentStyle={{ fontSize: 12, borderRadius: 10 }}
                    />
                    <Line type="monotone" dataKey="close" stroke="#315CE8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
