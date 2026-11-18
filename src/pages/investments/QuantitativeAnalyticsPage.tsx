import { useEffect, useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  LineChart,
  Line,
} from 'recharts'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, Label } from '@/components/ui/Dropdown'
import { InvestmentKPICard } from '@/components/investments/InvestmentKPICard'
import { MarketDataStatus } from '@/components/investments/MarketDataStatus'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { usePortfolioValuation } from '@/hooks/usePortfolioValuation'
import {
  defaultHistoryStart,
  getHistories,
} from '@/services/marketData/MarketDataService'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'
import {
  approximateEquityCurve,
  returnsFromCurve,
} from '@/services/investments/ValuationService'
import {
  annualizedReturn,
  cumulativeReturn,
  moneyWeightedReturn,
  timeWeightedReturn,
} from '@/utils/investments/returns'
import { annualizedVolatility } from '@/utils/investments/volatility'
import { sharpeRatio, sortinoRatio } from '@/utils/investments/sharpe'
import { maxDrawdown, calmarRatio } from '@/utils/investments/drawdown'
import { beta, trackingError, informationRatio } from '@/utils/investments/beta'
import { historicalVaR, winRate } from '@/utils/investments/var'
import { correlationMatrix } from '@/utils/investments/correlation'
import { computeEfficientFrontier } from '@/utils/investments/optimization'
import { dailyReturns } from '@/utils/investments/returns'
import { formatPercent } from '@/utils/currency'

export function QuantitativeAnalyticsPage() {
  const riskFreeRate = useInvestmentStore((s) => s.riskFreeRate)
  const setRiskFreeRate = useInvestmentStore((s) => s.setRiskFreeRate)
  const transactions = useInvestmentStore((s) => s.transactions)
  const selected = useInvestmentStore((s) => s.selectedPortfolioId)
  const { holdings, aggregate } = usePortfolioValuation()

  const [metrics, setMetrics] = useState<Record<string, number | string | null>>({})
  const [corr, setCorr] = useState<{ labels: string[]; matrix: (number | null)[][] } | null>(null)
  const [frontier, setFrontier] = useState<
    Array<{ vol: number; ret: number; sharpe: number; kind?: string }>
  >([])
  const [ddSeries, setDdSeries] = useState<{ date: string; drawdown: number }[]>([])
  const [insufficient, setInsufficient] = useState(false)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [histStatus, setHistStatus] = useState<'available' | 'loading' | 'unavailable'>(
    'loading',
  )
  const [histMeta, setHistMeta] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError(null)
      setLoading(true)
      setHistStatus('loading')
      if (holdings.length === 0) {
        setInsufficient(true)
        setHistStatus('unavailable')
        setHistMeta('No holdings to analyze.')
        setLoading(false)
        return
      }
      const startStr = defaultHistoryStart(1)

      const symbols = holdings.slice(0, 8).map((h) => h.symbol)
      const tickers = [...new Set([...symbols, 'SPY'])]
      const { histories, isDemo, errors, priceBasis } = await getHistories(
        tickers,
        startStr,
        undefined,
        reloadToken > 0,
      )
      if (cancelled) return

      const hist: Record<string, { date: string; adjustedCloseCents: number }[]> = {}
      const returnSeries: Record<string, number[]> = {}
      const missing: string[] = []

      for (const sym of tickers) {
        const bars = histories[sym] ?? []
        hist[sym] = bars.map((b) => ({
          date: b.date,
          adjustedCloseCents: b.adjustedCloseCents,
        }))
        returnSeries[sym] = dailyReturns(bars.map((b) => b.adjustedCloseCents))
        if (bars.length < 21) missing.push(sym)
      }

      setDemo(isDemo)
      const errParts = Object.entries(errors).map(([s, m]) => `${s}: ${m}`)
      if (missing.length) {
        errParts.push(
          `Insufficient bars (<21) for: ${missing.join(', ')}. Need ~1 year of adjusted daily prices.`,
        )
      }
      setHistMeta(
        `Basis: ${priceBasis} · start ${startStr} · ${tickers.length} symbols`,
      )

      const curve = approximateEquityCurve(
        holdings.map((h) => ({ symbol: h.symbol, quantityMicros: h.quantityMicros })),
        aggregate.cashCents,
        hist,
      )
      const rets = returnsFromCurve(curve)
      if (rets.length < 20) {
        setInsufficient(true)
        setHistStatus(isDemo ? 'available' : 'unavailable')
        setError(
          errParts.length
            ? errParts.join(' ')
            : `Only ${rets.length} daily portfolio returns after aligning history (need ~20+). Missing or short series: ${missing.join(', ') || 'unknown'}.`,
        )
        setLoading(false)
        return
      }
      setInsufficient(false)
      setHistStatus('available')
      if (errParts.length) setError(errParts.join(' '))
      else setError(null)

      const cum = cumulativeReturn(rets)
      const ann = annualizedReturn(cum, rets.length)
      const vol = annualizedVolatility(rets)
      const sharpe = sharpeRatio(rets, riskFreeRate)
      const sortino = sortinoRatio(rets, riskFreeRate)
      const dd = maxDrawdown(curve.map((c) => ({ date: c.date, value: c.valueCents })))
      setDdSeries(dd.series)

      const spyR = returnSeries.SPY ?? []
      const alignedN = Math.min(rets.length, spyR.length)
      const pAlign = rets.slice(-alignedN)
      const bAlign = spyR.slice(-alignedN)

      const flows = transactions
        .filter(
          (t) =>
            (t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL') &&
            (selected === 'all' || t.portfolioId === selected),
        )
        .map((t) => ({
          date: t.tradeDate,
          amount: t.type === 'DEPOSIT' ? t.grossAmountCents : -t.grossAmountCents,
        }))

      const twr = timeWeightedReturn(
        curve.map((c) => ({ date: c.date, value: c.valueCents })),
        flows,
      )
      const mwr = moneyWeightedReturn(
        flows.map((f) => ({ date: f.date, amount: f.amount })),
        aggregate.totalValueCents,
        curve[curve.length - 1]?.date ?? new Date().toISOString().slice(0, 10),
      )

      setMetrics({
        cumulative: cum,
        annualized: ann,
        volatility: vol,
        sharpe,
        sortino,
        maxDd: dd.maxDrawdown,
        ddPeak: dd.peakDate,
        ddTrough: dd.troughDate,
        ddRecovery: dd.recoveryDate,
        calmar: calmarRatio(ann, dd.maxDrawdown),
        beta: beta(pAlign, bAlign),
        trackingError: trackingError(pAlign, bAlign),
        infoRatio: informationRatio(pAlign, bAlign),
        var95_1d: historicalVaR(rets, 0.95, 1),
        var99_5d: historicalVaR(rets, 0.99, 5),
        winRate: winRate(rets),
        twr,
        mwr,
        n: rets.length,
      })

      const corrSymbols = symbols.slice(0, 6)
      const corrInput: Record<string, number[]> = {}
      const minLen = Math.min(...corrSymbols.map((s) => returnSeries[s]?.length ?? 0))
      if (minLen >= 20) {
        for (const s of corrSymbols) corrInput[s] = returnSeries[s].slice(-minLen)
        setCorr(correlationMatrix(corrInput))
      } else {
        setCorr(null)
      }

      try {
        const optSymbols = symbols.slice(0, 5)
        const optReturns = optSymbols.map((s) => {
          const r = returnSeries[s] ?? []
          return r.slice(-Math.min(r.length, minLen || r.length))
        })
        const n = Math.min(...optReturns.map((r) => r.length))
        if (n >= 30) {
          const trimmed = optReturns.map((r) => r.slice(-n))
          const result = computeEfficientFrontier({
            symbols: optSymbols,
            returns: trimmed,
            riskFreeRate,
            maxWeight: 0.45,
          })
          type FrontierPt = { vol: number; ret: number; sharpe: number; kind?: string }
          const pts: FrontierPt[] = [
            ...result.points.map(
              (p): FrontierPt => ({
                vol: p.annualVolatility * 100,
                ret: p.expectedAnnualReturn * 100,
                sharpe: p.sharpe,
              }),
            ),
            {
              vol: result.minVariance.annualVolatility * 100,
              ret: result.minVariance.expectedAnnualReturn * 100,
              sharpe: result.minVariance.sharpe,
              kind: 'Min var',
            },
            {
              vol: result.maxSharpe.annualVolatility * 100,
              ret: result.maxSharpe.expectedAnnualReturn * 100,
              sharpe: result.maxSharpe.sharpe,
              kind: 'Max Sharpe',
            },
          ]
          setFrontier(pts)
        } else {
          setFrontier([])
        }
      } catch (e) {
        setFrontier([])
        setError(e instanceof Error ? e.message : 'Optimization failed')
      }
      if (!cancelled) setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [
    holdings,
    aggregate.cashCents,
    aggregate.totalValueCents,
    riskFreeRate,
    transactions,
    selected,
    reloadToken,
  ])

  const corrColor = (v: number | null) => {
    if (v == null) return '#F7F8FA'
    const t = (v + 1) / 2
    const r = Math.round(220 - t * 100)
    const g = Math.round(80 + t * 120)
    const b = Math.round(100 + (1 - Math.abs(v)) * 80)
    return `rgb(${r},${g},${b})`
  }

  const fmt = (v: number | string | null | undefined, pct = true) => {
    if (v == null || v === '') return '—'
    if (typeof v === 'string') return v
    return pct ? formatPercent(v * 100) : v.toFixed(3)
  }

  return (
    <>
      <Topbar title="Quantitative Analytics" breadcrumb="Investment Management" showDateRange={false} />
      <PageContainer>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Quantitative Analytics</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Returns, risk, correlation, and mean-variance optimization from observed prices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="mb-0">Risk-free</Label>
              <Input
                type="number"
                step="0.005"
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Badge
              variant={
                histStatus === 'available'
                  ? 'positive'
                  : histStatus === 'loading'
                    ? 'neutral'
                    : 'amber'
              }
            >
              Historical:{' '}
              {histStatus === 'available'
                ? 'Available'
                : histStatus === 'loading'
                  ? 'Loading'
                  : 'Unavailable'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => setReloadToken((n) => n + 1)}
            >
              <RefreshCw size={13} />
              {loading ? 'Loading…' : 'Refresh history'}
            </Button>
            <MarketDataStatus />
          </div>
        </div>

        {histMeta && (
          <div className="mb-3 text-[12px] text-text-secondary">{histMeta}</div>
        )}

        {demo && (
          <div className="mb-4 px-3 py-2 rounded-[10px] border border-amber/30 bg-amber-soft text-[12px] text-amber">
            Analytics currently include demo/synthetic prices. Live Tiingo adjusted closes are preferred when available.
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 rounded-[10px] border border-border bg-bg text-[12px] text-text-secondary">
            {error}
          </div>
        )}

        {loading && insufficient ? (
          <Card>
            <div className="py-12 text-center text-[13px] text-text-secondary">
              Loading historical adjusted prices from Tiingo…
            </div>
          </Card>
        ) : insufficient ? (
          <Card>
            <div className="py-12 text-center text-[13px] text-text-secondary space-y-2">
              <div>
                Insufficient historical observations for reliable analytics (need ~20+ daily
                returns).
              </div>
              <div className="text-[12px]">
                {error ??
                  'Retrieve at least one year of adjusted daily prices for holdings and SPY.'}
              </div>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <InvestmentKPICard label="Cumulative return" valueCents={Math.round((Number(metrics.cumulative) || 0) * aggregate.investedCapitalCents)} changePercent={(Number(metrics.cumulative) || 0) * 100} />
              <Card className="!p-4">
                <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">Annualized return</div>
                <div className="text-[22px] font-semibold tabular-nums">{fmt(metrics.annualized as number)}</div>
                <div className="text-[11px] text-text-secondary mt-1">252-day convention · n={String(metrics.n ?? '—')}</div>
              </Card>
              <Card className="!p-4">
                <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">Ann. volatility</div>
                <div className="text-[22px] font-semibold tabular-nums">{fmt(metrics.volatility as number)}</div>
                <div className="text-[11px] text-text-secondary mt-1">Sample σ × √252</div>
              </Card>
              <Card className="!p-4">
                <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">Sharpe</div>
                <div className="text-[22px] font-semibold tabular-nums">
                  {metrics.sharpe == null ? '—' : (metrics.sharpe as number).toFixed(2)}
                </div>
                <div className="text-[11px] text-text-secondary mt-1">rf = {(riskFreeRate * 100).toFixed(1)}% (illustrative)</div>
              </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-[13px]">
              {[
                ['Max drawdown', fmt(metrics.maxDd as number)],
                ['Beta vs SPY', metrics.beta == null ? '—' : (metrics.beta as number).toFixed(2)],
                ['VaR 95% 1d', metrics.var95_1d == null ? '—' : formatPercent((metrics.var95_1d as number) * 100)],
                ['VaR 99% 5d', metrics.var99_5d == null ? '—' : formatPercent((metrics.var99_5d as number) * 100)],
                ['Sortino', metrics.sortino == null ? '—' : (metrics.sortino as number).toFixed(2)],
                ['Calmar', metrics.calmar == null ? '—' : (metrics.calmar as number).toFixed(2)],
                ['TWR', fmt(metrics.twr as number)],
                ['MWR (IRR)', metrics.mwr == null ? '—' : formatPercent((metrics.mwr as number) * 100)],
                ['Tracking error', fmt(metrics.trackingError as number)],
                ['Info ratio', metrics.infoRatio == null ? '—' : (metrics.infoRatio as number).toFixed(2)],
                ['Win rate', metrics.winRate == null ? '—' : formatPercent((metrics.winRate as number) * 100)],
                ['DD trough', String(metrics.ddTrough ?? '—')],
              ].map(([label, value]) => (
                <Card key={label as string} className="!p-3">
                  <div className="text-[10px] uppercase text-text-secondary">{label}</div>
                  <div className="text-[16px] font-semibold tabular-nums mt-1">{value}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
              <Card>
                <CardHeader title="Drawdown" subtitle="Peak-to-trough percentage decline" />
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ddSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(2)}%`} />
                      <Line type="monotone" dataKey="drawdown" stroke="#DC5757" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Correlation matrix"
                  subtitle="Pearson correlation of daily returns"
                  action={!corr ? <Badge variant="amber">Insufficient data</Badge> : undefined}
                />
                {corr ? (
                  <div className="overflow-x-auto">
                    <table className="text-[11px]">
                      <thead>
                        <tr>
                          <th className="p-1" />
                          {corr.labels.map((l) => (
                            <th key={l} className="p-1 font-medium">{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {corr.matrix.map((row, i) => (
                          <tr key={corr.labels[i]}>
                            <td className="p-1 font-medium">{corr.labels[i]}</td>
                            {row.map((v, j) => (
                              <td
                                key={j}
                                className="p-1 text-center tabular-nums min-w-[40px]"
                                style={{ background: corrColor(v) }}
                                title={v == null ? 'n/a' : v.toFixed(3)}
                              >
                                {v == null ? '—' : v.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[12px] text-text-secondary">Need aligned return history</div>
                )}
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Efficient frontier"
                subtitle="Long-only mean-variance sampling · historical estimates ≠ future outcomes"
                action={error ? <Badge variant="negative">{error}</Badge> : undefined}
              />
              <div className="h-[280px]">
                {frontier.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[12px] text-text-secondary">
                    Not enough history to optimize
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" />
                      <XAxis type="number" dataKey="vol" name="Vol %" unit="%" tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="ret" name="Return %" unit="%" tick={{ fontSize: 10 }} />
                      <ZAxis range={[40, 40]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter
                        data={frontier.filter((p) => !p.kind)}
                        fill="#315CE8"
                        fillOpacity={0.35}
                      />
                      <Scatter
                        data={frontier.filter((p) => p.kind)}
                        fill="#DC5757"
                        shape="diamond"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="text-[11px] text-text-secondary mt-2">
                VaR is historical simulation only — not a guarantee or maximum loss. Optimization uses sampled long-only portfolios with weight caps.
              </p>
            </Card>
          </>
        )}
      </PageContainer>
    </>
  )
}
