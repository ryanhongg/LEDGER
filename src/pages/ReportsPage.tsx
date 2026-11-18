import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, Printer } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Dropdown'
import { Badge } from '@/components/ui/Badge'
import { useLedgerStore } from '@/store/useLedgerStore'
import {
  filterByDateRange,
  getTotalRevenue,
  getTotalExpenses,
  getNetProfit,
  getExpenseBreakdown,
  buildCashFlowSeries,
} from '@/utils/calculations'
import { formatCurrency, centsToDollars } from '@/utils/currency'
import { formatChartDate, formatDisplayDate, toISODate } from '@/utils/dates'
import { exportTransactions, printReport } from '@/services/exportService'
import { cn } from '@/utils/cn'

type ReportType =
  | 'income-statement'
  | 'expense'
  | 'revenue'
  | 'profitability'
  | 'category'

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'income-statement', label: 'Income statement' },
  { value: 'expense', label: 'Expense report' },
  { value: 'revenue', label: 'Revenue analysis' },
  { value: 'profitability', label: 'Profitability report' },
  { value: 'category', label: 'Category breakdown' },
]

export function ReportsPage() {
  const transactions = useLedgerStore((s) => s.transactions)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const settings = useLedgerStore((s) => s.settings)
  const getDateRange = useLedgerStore((s) => s.getDateRange)
  const [reportType, setReportType] = useState<ReportType>('income-statement')
  const [categoryFilter, setCategoryFilter] = useState('')

  const range = getDateRange()

  const data = useMemo(() => {
    let filtered = filterByDateRange(transactions, range)
    if (categoryFilter) {
      filtered = filtered.filter((t) => t.category === categoryFilter)
    }
    const revenue = getTotalRevenue(filtered)
    const expenses = getTotalExpenses(filtered)
    const profit = getNetProfit(filtered)
    const breakdown = getExpenseBreakdown(filtered)
    const series = buildCashFlowSeries(
      transactions,
      range,
      'monthly',
      openingBalance,
    ).map((p) => ({
      label: formatChartDate(p.date, 'monthly'),
      revenue: centsToDollars(p.revenue),
      expenses: centsToDollars(p.expenses),
      profit: centsToDollars(p.net),
    }))

    const incomeByCat = new Map<string, number>()
    filtered
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        incomeByCat.set(t.category, (incomeByCat.get(t.category) ?? 0) + t.amount)
      })

    return {
      filtered,
      revenue,
      expenses,
      profit,
      margin: revenue === 0 ? 0 : (profit / revenue) * 100,
      breakdown,
      series,
      incomeByCat: Array.from(incomeByCat.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    }
  }, [transactions, range, categoryFilter, openingBalance])

  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category))
    return [...set].sort()
  }, [transactions])

  return (
    <>
      <Topbar
        title="Reports"
        breadcrumb="Analytics"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={printReport} className="no-print">
              <Printer size={14} />
              Print
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportTransactions(data.filtered)}
              className="no-print"
            >
              <Download size={14} />
              Export CSV
            </Button>
          </>
        }
      />
      <PageContainer className="print-area">
        <div className="mb-5 no-print">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Reports</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Generate analytics from your transaction data.
          </p>
        </div>

        <Card className="mb-4 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={reportType}
              onChange={(v) => setReportType(v as ReportType)}
              options={REPORT_TYPES}
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map((c) => ({ value: c, label: c }))}
              placeholder="All categories"
            />
            <div className="text-[12px] text-text-secondary ml-auto">
              {formatDisplayDate(toISODate(range.from))} –{' '}
              {formatDisplayDate(toISODate(range.to))}
            </div>
          </div>
        </Card>

        <div className="mb-2 print-only hidden">
          <h1 className="text-xl font-semibold">{settings.businessName}</h1>
          <p className="text-sm text-gray-600">
            {REPORT_TYPES.find((r) => r.value === reportType)?.label}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Metric label="Revenue" value={data.revenue} tone="positive" />
          <Metric label="Expenses" value={data.expenses} tone="negative" />
          <Metric label="Net profit" value={data.profit} signed />
          <Card>
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Profit margin
            </div>
            <div
              className={cn(
                'text-[22px] font-semibold tabular-nums',
                data.margin >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {data.margin.toFixed(1)}%
            </div>
          </Card>
        </div>

        {(reportType === 'income-statement' ||
          reportType === 'profitability' ||
          reportType === 'revenue') && (
          <Card className="mb-4">
            <CardHeader
              title={
                reportType === 'revenue'
                  ? 'Revenue over time'
                  : reportType === 'profitability'
                    ? 'Profitability trend'
                    : 'Income & expenses'
              }
            />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#747B87' }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#747B87' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('en-US', {
                        notation: 'compact',
                        style: 'currency',
                        currency: 'USD',
                      }).format(v)
                    }
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Math.round(Number(v) * 100))}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E8EAF0',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  {(reportType === 'income-statement' || reportType === 'revenue') && (
                    <Bar dataKey="revenue" name="Revenue" fill="#159B70" radius={[4, 4, 0, 0]} />
                  )}
                  {reportType === 'income-statement' && (
                    <Bar dataKey="expenses" name="Expenses" fill="#DC5757" radius={[4, 4, 0, 0]} />
                  )}
                  {reportType === 'profitability' && (
                    <Bar dataKey="profit" name="Net profit" fill="#315CE8" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {(reportType === 'expense' || reportType === 'category') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader title="Expense distribution" />
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.breakdown.map((e) => (
                        <Cell key={e.category} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Category totals" />
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {data.breakdown.map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="flex-1 text-[13px]">{item.category}</span>
                    <span className="text-[12px] text-text-secondary tabular-nums">
                      {item.percent.toFixed(0)}%
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums w-[90px] text-right">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {reportType === 'revenue' && (
          <Card className="mb-4">
            <CardHeader title="Revenue by category" />
            <div className="space-y-2">
              {data.incomeByCat.map((item) => (
                <div key={item.category} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <Badge variant="positive">{item.category}</Badge>
                  <span className="text-[14px] font-semibold tabular-nums text-positive">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card padded={false}>
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-[15px] font-semibold">Detailed transactions</h3>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {data.filtered.length} records in selected range
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  {['Date', 'Description', 'Category', 'Type', 'Amount'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.filtered]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 40)
                  .map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {formatDisplayDate(t.date)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px]">{t.description}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="neutral">{t.category}</Badge>
                      </td>
                      <td className="px-4 py-2.5 capitalize text-[12px]">{t.type}</td>
                      <td
                        className={cn(
                          'px-4 py-2.5 text-[13px] font-semibold tabular-nums text-right',
                          t.type === 'income' ? 'text-positive' : 'text-negative',
                        )}
                      >
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </>
  )
}

function Metric({
  label,
  value,
  tone,
  signed,
}: {
  label: string
  value: number
  tone?: 'positive' | 'negative'
  signed?: boolean
}) {
  return (
    <Card>
      <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'text-[22px] font-semibold tabular-nums tracking-[-0.02em]',
          tone === 'positive' || (signed && value >= 0)
            ? 'text-positive'
            : tone === 'negative' || (signed && value < 0)
              ? 'text-negative'
              : 'text-text',
        )}
      >
        {formatCurrency(value, { showSign: signed })}
      </div>
    </Card>
  )
}
