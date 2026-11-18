import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { useLedgerStore } from '@/store/useLedgerStore'
import { buildCashFlowSeries } from '@/utils/calculations'
import { formatCurrency, centsToDollars } from '@/utils/currency'
import { formatChartDate } from '@/utils/dates'
import type { ChartGranularity } from '@/types'
import { cn } from '@/utils/cn'
import { useMemo, useState } from 'react'

const GRANULARITIES: ChartGranularity[] = ['daily', 'weekly', 'monthly']

export function CashFlowChart() {
  const transactions = useLedgerStore((s) => s.transactions)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const granularity = useLedgerStore((s) => s.chartGranularity)
  const setGranularity = useLedgerStore((s) => s.setChartGranularity)
  const datePeriod = useLedgerStore((s) => s.datePeriod)
  const customFrom = useLedgerStore((s) => s.customFrom)
  const customTo = useLedgerStore((s) => s.customTo)
  const getDateRange = useLedgerStore((s) => s.getDateRange)
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const range = getDateRange()
  const data = useMemo(() => {
    return buildCashFlowSeries(transactions, range, granularity, openingBalance).map(
      (p) => ({
        ...p,
        revenue: centsToDollars(p.revenue),
        expenses: centsToDollars(p.expenses),
        net: centsToDollars(p.net),
        label: formatChartDate(p.date, granularity),
      }),
    )
  // datePeriod/custom* ensure recalc when the global range changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, datePeriod, customFrom, customTo, granularity, openingBalance])

  return (
    <Card>
      <CardHeader
        title="Cash Flow Overview"
        subtitle="Revenue, expenses, and net cash flow over time."
        action={
          <div className="flex items-center gap-0.5 p-0.5 bg-bg border border-border rounded-lg">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  'h-7 px-2.5 text-[12px] font-medium rounded-md capitalize cursor-pointer transition-colors',
                  granularity === g
                    ? 'bg-white text-text shadow-sm border border-border'
                    : 'text-text-secondary hover:text-text',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        }
      />
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#747B87' }}
              tickLine={false}
              axisLine={{ stroke: '#E8EAF0' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#747B87' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(v)
              }
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #E8EAF0',
                borderRadius: 10,
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(23,25,29,0.06)',
              }}
              formatter={(value) => formatCurrency(Math.round(Number(value) * 100))}
              labelStyle={{ color: '#747B87', marginBottom: 4 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8, cursor: 'pointer' }}
              iconType="circle"
              iconSize={8}
              onClick={(e) => {
                const key = String(e.dataKey)
                setHidden((h) => ({ ...h, [key]: !h[key] }))
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#159B70"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              hide={hidden.revenue}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#DC5757"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              hide={hidden.expenses}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net cash flow"
              stroke="#315CE8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              hide={hidden.net}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
