import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { useLedgerStore } from '@/store/useLedgerStore'
import { filterByDateRange, getExpenseBreakdown } from '@/utils/calculations'
import { formatCurrency } from '@/utils/currency'

export function ExpenseBreakdown() {
  const transactions = useLedgerStore((s) => s.transactions)
  const getDateRange = useLedgerStore((s) => s.getDateRange)
  const setTransactionFilters = useLedgerStore((s) => s.setTransactionFilters)
  const navigate = useNavigate()

  const range = getDateRange()
  const data = useMemo(() => {
    const filtered = filterByDateRange(transactions, range)
    return getExpenseBreakdown(filtered)
  }, [transactions, range])

  const total = data.reduce((s, d) => s + d.amount, 0)

  const handleClick = (category: string) => {
    setTransactionFilters({ category, type: 'expense', search: '' })
    navigate('/transactions')
  }

  return (
    <Card className="h-full">
      <CardHeader
        title="Expense Breakdown"
        subtitle="Where your money is going"
      />
      {data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[13px] text-text-secondary">
          No expenses in this period
        </div>
      ) : (
        <>
          <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  strokeWidth={0}
                  onClick={(_, index) => handleClick(data[index].category)}
                  style={{ cursor: 'pointer' }}
                >
                  {data.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E8EAF0',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[11px] text-text-secondary">Total</div>
              <div className="text-[14px] font-semibold tabular-nums">
                {formatCurrency(total, { compact: true })}
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1.5 max-h-[180px] overflow-y-auto">
            {data.map((item) => (
              <button
                key={item.category}
                onClick={() => handleClick(item.category)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors cursor-pointer text-left"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: item.color }}
                />
                <span className="flex-1 text-[12px] text-text truncate">
                  {item.category}
                </span>
                <span className="text-[11px] text-text-secondary tabular-nums">
                  {item.percent.toFixed(0)}%
                </span>
                <span className="text-[12px] font-medium tabular-nums text-text w-[72px] text-right">
                  {formatCurrency(item.amount)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
