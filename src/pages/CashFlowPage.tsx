import { useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { ForecastChart } from '@/components/cashflow/ForecastChart'
import { ForecastAssumptionsPanel } from '@/components/cashflow/ForecastAssumptions'
import { CashFlowForecastMetrics } from '@/components/cashflow/CashFlowForecast'
import { useLedgerStore } from '@/store/useLedgerStore'
import {
  filterByDateRange,
  getTotalRevenue,
  getTotalExpenses,
  getCashBalance,
} from '@/utils/calculations'
import { formatCurrency } from '@/utils/currency'
import { parseISO } from '@/utils/dates'

export function CashFlowPage() {
  const transactions = useLedgerStore((s) => s.transactions)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const getDateRange = useLedgerStore((s) => s.getDateRange)

  const range = getDateRange()

  const metrics = useMemo(() => {
    const before = transactions.filter((t) => parseISO(t.date) < range.from)
    const opening = getCashBalance(before, openingBalance)
    const inRange = filterByDateRange(transactions, range)
    const inflows = getTotalRevenue(inRange)
    const outflows = getTotalExpenses(inRange)
    const closing = opening + inflows - outflows
    return { opening, inflows, outflows, closing }
  }, [transactions, range, openingBalance])

  return (
    <>
      <Topbar title="Cash Flow" breadcrumb="Finances" />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Cash Flow</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Analyze historical movement and project future cash position.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Metric label="Opening balance" value={metrics.opening} />
          <Metric label="Total inflows" value={metrics.inflows} tone="positive" />
          <Metric label="Total outflows" value={metrics.outflows} tone="negative" />
          <Metric label="Closing balance" value={metrics.closing} />
        </div>

        <div className="mb-4">
          <CashFlowForecastMetrics />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <ForecastChart />
          </div>
          <ForecastAssumptionsPanel />
        </div>
      </PageContainer>
    </>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'positive' | 'negative'
}) {
  return (
    <Card>
      <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
        {label}
      </div>
      <div
        className={`text-[22px] font-semibold tabular-nums tracking-[-0.02em] ${
          tone === 'positive'
            ? 'text-positive'
            : tone === 'negative'
              ? 'text-negative'
              : 'text-text'
        }`}
      >
        {formatCurrency(value)}
      </div>
    </Card>
  )
}
