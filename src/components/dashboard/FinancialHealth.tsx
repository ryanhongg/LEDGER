import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { useLedgerStore } from '@/store/useLedgerStore'
import { getFinancialHealth } from '@/utils/calculations'
import { formatPercent } from '@/utils/currency'
import { cn } from '@/utils/cn'

export function FinancialHealth() {
  const transactions = useLedgerStore((s) => s.transactions)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const getDateRange = useLedgerStore((s) => s.getDateRange)

  const range = getDateRange()
  const health = useMemo(
    () => getFinancialHealth(transactions, range, openingBalance),
    [transactions, range, openingBalance],
  )

  const metrics = [
    {
      label: 'Profit margin',
      value: formatPercent(health.profitMargin),
      tip: 'Net profit as a percentage of total revenue for the selected period.',
      good: health.profitMargin >= 20,
    },
    {
      label: 'Expense-to-revenue',
      value: `${health.expenseToRevenue.toFixed(1)}%`,
      tip: 'How much of every revenue dollar is spent on expenses.',
      good: health.expenseToRevenue <= 75,
    },
    {
      label: 'Revenue growth',
      value: formatPercent(health.revenueGrowth),
      tip: 'Change in revenue compared with the previous period of equal length.',
      good: health.revenueGrowth >= 0,
    },
    {
      label: 'Cash runway',
      value: health.isCashGrowing
        ? 'Growing'
        : health.cashRunwayDays !== null
          ? `${health.cashRunwayDays} days`
          : 'N/A',
      tip: health.isCashGrowing
        ? 'Cash is currently growing — runway is not applicable while net cash generation is positive.'
        : 'Estimated days of cash remaining at the current average daily burn rate.',
      good: health.isCashGrowing || (health.cashRunwayDays ?? 0) > 90,
    },
  ]

  return (
    <Card>
      <CardHeader
        title="Financial Health"
        subtitle="Key ratios derived from your transaction data"
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-border bg-bg/50 px-3.5 py-3"
          >
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[11px] text-text-secondary">{m.label}</span>
              <Tooltip content={m.tip}>
                <Info size={11} className="text-neutral cursor-help" />
              </Tooltip>
            </div>
            <div
              className={cn(
                'text-[18px] font-semibold tabular-nums tracking-[-0.02em]',
                m.good ? 'text-positive' : 'text-negative',
              )}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
