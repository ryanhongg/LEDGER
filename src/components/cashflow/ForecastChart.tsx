import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
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
import { buildCashFlowSeries, generateForecast } from '@/utils/calculations'
import { getDateRange as makeRange } from '@/utils/dates'
import { centsToDollars, formatCurrency } from '@/utils/currency'
import { formatChartDate } from '@/utils/dates'

export function ForecastChart() {
  const transactions = useLedgerStore((s) => s.transactions)
  const recurring = useLedgerStore((s) => s.recurring)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const assumptions = useLedgerStore((s) => s.forecastAssumptions)

  const chart = useMemo(() => {
    const now = new Date()
    const histRange = makeRange('last90')
    const historical = buildCashFlowSeries(
      transactions,
      histRange,
      'weekly',
      openingBalance,
    ).map((p) => ({
      label: formatChartDate(p.date, 'weekly'),
      date: p.date,
      balance: centsToDollars(p.balance ?? 0),
      revenue: centsToDollars(p.revenue),
      expenses: centsToDollars(p.expenses),
      forecast: undefined as number | undefined,
    }))

    const forecast = generateForecast(
      transactions,
      recurring,
      assumptions,
      openingBalance,
      now,
    )

    const lastHist = historical[historical.length - 1]
    const forecastPoints = forecast.points.map((p) => ({
      label: formatChartDate(p.date, 'weekly'),
      date: p.date,
      balance: undefined as number | undefined,
      revenue: centsToDollars(p.revenue),
      expenses: centsToDollars(p.expenses),
      forecast: centsToDollars(p.balance ?? 0),
    }))

    if (lastHist && forecastPoints.length > 0) {
      forecastPoints.unshift({
        label: lastHist.label,
        date: lastHist.date,
        balance: lastHist.balance,
        revenue: lastHist.revenue,
        expenses: lastHist.expenses,
        forecast: lastHist.balance,
      })
    }

    return [...historical, ...forecastPoints.slice(1)]
  }, [transactions, recurring, openingBalance, assumptions])

  return (
    <Card>
      <CardHeader
        title="Cash Flow Projection"
        subtitle="Historical balance with projected cash forward"
      />
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#315CE8" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#315CE8" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              }}
              formatter={(value, name) => [
                formatCurrency(Math.round(Number(value) * 100)),
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
            <Area
              type="monotone"
              dataKey="balance"
              name="Historical cash"
              stroke="#315CE8"
              fill="url(#balFill)"
              strokeWidth={2}
              connectNulls={false}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Projected cash"
              stroke="#315CE8"
              strokeWidth={2}
              strokeDasharray="6 4"
              connectNulls={false}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#159B70"
              strokeWidth={1.5}
              strokeOpacity={0.45}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#DC5757"
              strokeWidth={1.5}
              strokeOpacity={0.45}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-text-secondary mt-3">
        Forecasts are estimates based on historical averages and recurring commitments — not guarantees.
      </p>
    </Card>
  )
}
