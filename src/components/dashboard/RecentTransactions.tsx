import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLedgerStore } from '@/store/useLedgerStore'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

export function RecentTransactions() {
  const transactions = useLedgerStore((s) => s.transactions)

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  return (
    <Card>
      <CardHeader
        title="Recent Transactions"
        subtitle="Latest business activity"
        action={
          <Link
            to="/transactions"
            className="text-[12px] font-medium text-accent hover:underline"
          >
            View all
          </Link>
        }
      />
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              {['Transaction', 'Category', 'Date', 'Method', 'Amount'].map((h) => (
                <th
                  key={h}
                  className="pb-2 px-2 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/60 last:border-0 hover:bg-bg/60 transition-colors"
              >
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        t.type === 'income'
                          ? 'bg-positive-soft text-positive'
                          : 'bg-negative-soft text-negative',
                      )}
                    >
                      {t.type === 'income' ? (
                        <ArrowDownLeft size={13} />
                      ) : (
                        <ArrowUpRight size={13} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-text truncate max-w-[200px]">
                        {t.description}
                      </div>
                      {t.merchant && (
                        <div className="text-[11px] text-text-secondary">
                          {t.merchant}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <Badge variant="neutral">{t.category}</Badge>
                </td>
                <td className="py-2.5 px-2 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                  {formatDisplayDate(t.date)}
                </td>
                <td className="py-2.5 px-2 text-[12px] text-text-secondary whitespace-nowrap">
                  {t.paymentMethod}
                </td>
                <td
                  className={cn(
                    'py-2.5 px-2 text-[13px] font-semibold tabular-nums text-right whitespace-nowrap',
                    t.type === 'income' ? 'text-positive' : 'text-negative',
                  )}
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
