import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Dropdown'
import { InvestmentKPICard } from '@/components/investments/InvestmentKPICard'
import { MarketDataStatus } from '@/components/investments/MarketDataStatus'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { usePortfolioValuation } from '@/hooks/usePortfolioValuation'
import { formatCurrency } from '@/utils/currency'
import { getHistories } from '@/services/marketData/MarketDataService'
import { approximateEquityCurve } from '@/services/investments/ValuationService'
import { normalizeTo100 } from '@/utils/investments/returns'
import { formatDisplayDate } from '@/utils/dates'

const RANGES = [
  { value: '1M', days: 21 },
  { value: '3M', days: 63 },
  { value: '6M', days: 126 },
  { value: 'YTD', days: 220 },
  { value: '1Y', days: 252 },
]

export function InvestmentOverviewPage() {
  const portfolios = useInvestmentStore((s) => s.portfolios)
  const selected = useInvestmentStore((s) => s.selectedPortfolioId)
  const setSelected = useInvestmentStore((s) => s.setSelectedPortfolio)
  const transactions = useInvestmentStore((s) => s.transactions)
  const securities = useInvestmentStore((s) => s.securities)
  const { aggregate, holdings, totalReturn, todayPnL } = usePortfolioValuation()

  const [range, setRange] = useState('3M')
  const [curve, setCurve] = useState<{ date: string; portfolio: number; spy?: number; qqq?: number }[]>([])
  const [loadingChart, setLoadingChart] = useState(false)
  const [demoChart, setDemoChart] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoadingChart(true)
      const days = RANGES.find((r) => r.value === range)?.days ?? 63
      const start = new Date()
      start.setDate(start.getDate() - Math.ceil(days * 1.5))
      const startStr = start.toISOString().slice(0, 10)

      const symbols = [...new Set(holdings.map((h) => h.symbol))]
      const hist: Record<string, { date: string; adjustedCloseCents: number }[]> = {}
      const { histories, isDemo: anyDemo } = await getHistories(
        [...symbols, 'SPY', 'QQQ'],
        startStr,
      )
      for (const [sym, bars] of Object.entries(histories)) {
        hist[sym] = bars.map((b) => ({
          date: b.date,
          adjustedCloseCents: b.adjustedCloseCents,
        }))
      }
      if (cancelled) return

      const equity = approximateEquityCurve(
        holdings.map((h) => ({
          symbol: h.symbol,
          quantityMicros: h.quantityMicros,
        })),
        aggregate.cashCents,
        hist,
      ).slice(-days)

      const spy = hist.SPY ?? []
      const qqq = hist.QQQ ?? []
      const spyMap = new Map(spy.map((b) => [b.date, b.adjustedCloseCents]))
      const qqqMap = new Map(qqq.map((b) => [b.date, b.adjustedCloseCents]))

      const portVals = equity.map((e) => e.valueCents)
      const normPort = normalizeTo100(portVals)
      const spyAligned = equity.map((e) => spyMap.get(e.date) ?? 0)
      const qqqAligned = equity.map((e) => qqqMap.get(e.date) ?? 0)
      // forward-fill zeros
      let ls = spyAligned.find((v) => v > 0) ?? 1
      let lq = qqqAligned.find((v) => v > 0) ?? 1
      const spyFill = spyAligned.map((v) => {
        if (v > 0) ls = v
        return ls
      })
      const qqqFill = qqqAligned.map((v) => {
        if (v > 0) lq = v
        return lq
      })

      setDemoChart(anyDemo)
      setCurve(
        equity.map((e, i) => ({
          date: e.date,
          portfolio: normPort[i],
          spy: normalizeTo100(spyFill)[i],
          qqq: normalizeTo100(qqqFill)[i],
        })),
      )
      setLoadingChart(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [holdings, aggregate.cashCents, range])

  const allocation = useMemo(() => {
    const cash = aggregate.cashCents
    const byType = new Map<string, number>()
    for (const h of holdings) {
      const key = h.assetType === 'etf' ? 'ETFs' : 'Equities'
      byType.set(key, (byType.get(key) ?? 0) + h.marketValueCents)
    }
    if (cash > 0) byType.set('Cash', cash)
    const colors: Record<string, string> = {
      Equities: '#315CE8',
      ETFs: '#7C5CFC',
      Cash: '#8993A3',
    }
    return [...byType.entries()].map(([name, value]) => ({
      name,
      value,
      color: colors[name] ?? '#8993A3',
    }))
  }, [holdings, aggregate.cashCents])

  const recent = [...transactions]
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
    .filter((t) => selected === 'all' || t.portfolioId === selected)
    .slice(0, 8)

  const secName = (id?: string) =>
    securities.find((s) => s.id === id)?.symbol ?? '—'

  return (
    <>
      <Topbar title="Investment Overview" breadcrumb="Investment Management" showDateRange={false} />
      <PageContainer>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Investment Overview</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Monitor portfolio performance, capital allocation, and investment risk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selected}
              onChange={(v) => setSelected(v as string)}
              options={[
                { value: 'all', label: 'All portfolios' },
                ...portfolios.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <Select
              value={range}
              onChange={setRange}
              options={RANGES.map((r) => ({ value: r.value, label: r.value }))}
            />
            <MarketDataStatus />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          <InvestmentKPICard label="Total Portfolio Value" valueCents={aggregate.totalValueCents} />
          <InvestmentKPICard
            label="Total Return"
            valueCents={aggregate.totalValueCents - aggregate.investedCapitalCents}
            changePercent={totalReturn}
            tone={totalReturn >= 0 ? 'positive' : 'negative'}
          />
          <InvestmentKPICard
            label="Today's P&L"
            valueCents={todayPnL}
            tone={todayPnL >= 0 ? 'positive' : 'negative'}
          />
          <InvestmentKPICard label="Invested Capital" valueCents={aggregate.investedCapitalCents} />
          <InvestmentKPICard label="Cash Available" valueCents={aggregate.cashCents} />
          <InvestmentKPICard
            label="Unrealized P&L"
            valueCents={aggregate.unrealizedPnLCents}
            tone={aggregate.unrealizedPnLCents >= 0 ? 'positive' : 'negative'}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Portfolio vs Benchmarks"
              subtitle={
                demoChart
                  ? 'Indexed to 100 · Holdings-based reconstruction · Demo prices labeled'
                  : 'Indexed to 100 · Holdings-based reconstruction · Provider adjusted closes'
              }
              action={demoChart ? <Badge variant="amber">Demo series</Badge> : <Badge variant="accent">Provider</Badge>}
            />
            <div className="h-[300px]">
              {loadingChart ? (
                <div className="h-full skeleton" />
              ) : curve.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-text-secondary">
                  Insufficient price history
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#747B87' }} tickLine={false} minTickGap={40} />
                    <YAxis tick={{ fontSize: 10, fill: '#747B87' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E8EAF0' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="#315CE8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="spy" name="SPY" stroke="#159B70" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="qqq" name="QQQ" stroke="#DC5757" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Asset Allocation" subtitle="Market value by type" />
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2} strokeWidth={0}>
                    {allocation.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {allocation.map((a) => (
                <Link
                  key={a.name}
                  to={`/investments/holdings?type=${a.name === 'ETFs' ? 'etf' : a.name === 'Equities' ? 'stock' : 'cash'}`}
                  className="flex items-center gap-2 text-[12px] hover:bg-bg rounded-lg px-2 py-1"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                  <span className="flex-1">{a.name}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(a.value)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              title="Top Holdings"
              action={
                <Link to="/investments/holdings" className="text-[12px] text-accent hover:underline">
                  View all
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium text-right">Value</th>
                    <th className="pb-2 font-medium text-right">Unrealized</th>
                    <th className="pb-2 font-medium text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.slice(0, 6).map((h) => (
                    <tr key={`${h.portfolioId}-${h.securityId}`} className="border-b border-border/50">
                      <td className="py-2">
                        <div className="font-semibold">{h.symbol}</div>
                        <div className="text-[11px] text-text-secondary">{h.name}</div>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(h.marketValueCents)}</td>
                      <td className={`py-2 text-right tabular-nums ${h.unrealizedPnLCents >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(h.unrealizedPnLCents, { showSign: true })}
                      </td>
                      <td className="py-2 text-right tabular-nums">{(h.weight * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent Activity"
              action={
                <Link to="/investments/transactions" className="text-[12px] text-accent hover:underline">
                  Trade ledger
                </Link>
              }
            />
            <div className="space-y-2">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <Badge variant={t.type === 'BUY' || t.type === 'DEPOSIT' ? 'accent' : t.type === 'SELL' ? 'negative' : 'neutral'}>
                    {t.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">
                      {t.securityId ? secName(t.securityId) : 'Cash'} · {formatDisplayDate(t.tradeDate)}
                    </div>
                  </div>
                  <div className={`text-[12px] font-semibold tabular-nums ${t.netAmountCents >= 0 ? 'text-positive' : 'text-text'}`}>
                    {formatCurrency(Math.abs(t.netAmountCents))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
