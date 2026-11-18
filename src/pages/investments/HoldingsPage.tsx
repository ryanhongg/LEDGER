import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Dropdown'
import { MarketDataStatus } from '@/components/investments/MarketDataStatus'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { usePortfolioValuation } from '@/hooks/usePortfolioValuation'
import { formatCurrency } from '@/utils/currency'
import { formatShares, priceMicrosToDollars } from '@/utils/investments/decimal'

export function HoldingsPage() {
  const [params] = useSearchParams()
  const portfolios = useInvestmentStore((s) => s.portfolios)
  const selected = useInvestmentStore((s) => s.selectedPortfolioId)
  const setSelected = useInvestmentStore((s) => s.setSelectedPortfolio)
  const { holdings } = usePortfolioValuation()

  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [assetType, setAssetType] = useState(params.get('type') === 'etf' ? 'etf' : params.get('type') === 'stock' ? 'stock' : '')
  const [sort, setSort] = useState<'value' | 'pnl' | 'weight'>('value')

  const sectors = useMemo(
    () => [...new Set(holdings.map((h) => h.sector).filter(Boolean))] as string[],
    [holdings],
  )

  const filtered = useMemo(() => {
    let list = [...holdings]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q),
      )
    }
    if (sector) list = list.filter((h) => h.sector === sector)
    if (assetType === 'etf' || assetType === 'stock') {
      list = list.filter((h) => h.assetType === assetType)
    }
    list.sort((a, b) => {
      if (sort === 'pnl') return b.unrealizedPnLCents - a.unrealizedPnLCents
      if (sort === 'weight') return b.weight - a.weight
      return b.marketValueCents - a.marketValueCents
    })
    return list
  }, [holdings, search, sector, assetType, sort])

  return (
    <>
      <Topbar title="Holdings" breadcrumb="Investment Management" showDateRange={false} />
      <PageContainer>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Holdings</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Positions valued with current reference prices.
            </p>
          </div>
          <MarketDataStatus />
        </div>

        <Card className="mb-4 !p-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name…"
              className="max-w-xs"
            />
            <Select
              value={selected}
              onChange={(v) => setSelected(v)}
              options={[
                { value: 'all', label: 'All portfolios' },
                ...portfolios.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <Select
              value={assetType}
              onChange={setAssetType}
              placeholder="All types"
              options={[
                { value: 'stock', label: 'Equities' },
                { value: 'etf', label: 'ETFs' },
              ]}
            />
            <Select
              value={sector}
              onChange={setSector}
              placeholder="All sectors"
              options={sectors.map((s) => ({ value: s, label: s }))}
            />
            <Select
              value={sort}
              onChange={(v) => setSort(v as typeof sort)}
              options={[
                { value: 'value', label: 'Sort: Value' },
                { value: 'pnl', label: 'Sort: Unrealized' },
                { value: 'weight', label: 'Sort: Weight' },
              ]}
            />
          </div>
        </Card>

        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] min-w-[900px]">
              <thead className="bg-bg/60 border-b border-border">
                <tr className="text-text-secondary">
                  {['Symbol', 'Portfolio', 'Qty', 'Avg cost', 'Price', 'Mkt value', 'Cost basis', 'Unrealized', 'Day', 'Weight', 'Data'].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-text-secondary">
                      No holdings match filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((h) => {
                    const pf = portfolios.find((p) => p.id === h.portfolioId)
                    const marked = h.markAvailable
                    return (
                      <tr key={`${h.portfolioId}-${h.securityId}`} className="border-b border-border/50 hover:bg-bg/40">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold">{h.symbol}</div>
                          <div className="text-[11px] text-text-secondary">{h.name}</div>
                        </td>
                        <td className="px-3 py-2.5 text-text-secondary">{pf?.name ?? h.portfolioId}</td>
                        <td className="px-3 py-2.5 tabular-nums">{formatShares(h.quantityMicros)}</td>
                        <td className="px-3 py-2.5 tabular-nums">${priceMicrosToDollars(h.avgCostMicros).toFixed(2)}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {marked ? formatCurrency(h.priceCents) : '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold">
                          {marked ? formatCurrency(h.marketValueCents) : '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{formatCurrency(h.costBasisCents)}</td>
                        <td
                          className={`px-3 py-2.5 tabular-nums font-medium ${
                            !marked
                              ? 'text-text-secondary'
                              : h.unrealizedPnLCents >= 0
                                ? 'text-positive'
                                : 'text-negative'
                          }`}
                        >
                          {marked
                            ? formatCurrency(h.unrealizedPnLCents, { showSign: true })
                            : '—'}
                        </td>
                        <td
                          className={`px-3 py-2.5 tabular-nums ${
                            !marked
                              ? 'text-text-secondary'
                              : h.dailyChangeCents >= 0
                                ? 'text-positive'
                                : 'text-negative'
                          }`}
                        >
                          {marked ? `${h.dailyChangePercent.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {marked ? `${(h.weight * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={
                              h.isDemoPrice
                                ? 'amber'
                                : !marked
                                  ? 'negative'
                                  : h.priceFreshness === 'stale'
                                    ? 'amber'
                                    : 'accent'
                            }
                          >
                            {h.isDemoPrice
                              ? 'Demo'
                              : !marked
                                ? 'Unavailable'
                                : h.priceFreshness === 'stale'
                                  ? 'Stale'
                                  : h.priceFreshness === 'live_reference'
                                    ? 'Live'
                                    : h.priceFreshness === 'end_of_day'
                                      ? 'EOD'
                                      : h.priceFreshness}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </>
  )
}
