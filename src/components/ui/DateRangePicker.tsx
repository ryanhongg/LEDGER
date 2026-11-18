import { Calendar } from 'lucide-react'
import { useLedgerStore } from '@/store/useLedgerStore'
import type { DatePeriod } from '@/types'
import { cn } from '@/utils/cn'
import { format } from 'date-fns'
import { toISODate, subDays } from '@/utils/dates'

const PERIODS: { value: DatePeriod; label: string }[] = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisYear', label: 'This year' },
  { value: 'custom', label: 'Custom' },
]

export function DateRangePicker({ className }: { className?: string }) {
  const datePeriod = useLedgerStore((s) => s.datePeriod)
  const customFrom = useLedgerStore((s) => s.customFrom)
  const customTo = useLedgerStore((s) => s.customTo)
  const setDatePeriod = useLedgerStore((s) => s.setDatePeriod)
  const getDateRange = useLedgerStore((s) => s.getDateRange)

  const range = getDateRange()
  const rangeLabel = `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`

  const selectPeriod = (period: DatePeriod) => {
    if (period === 'custom') {
      const now = new Date()
      setDatePeriod(
        'custom',
        customFrom ?? toISODate(subDays(now, 29)),
        customTo ?? toISODate(now),
      )
      return
    }
    setDatePeriod(period)
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className="hidden sm:flex items-center gap-1 p-0.5 bg-bg border border-border rounded-[10px]">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => selectPeriod(p.value)}
            className={cn(
              'h-7 px-2.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer',
              datePeriod === p.value
                ? 'bg-white text-text shadow-sm border border-border'
                : 'text-text-secondary hover:text-text',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {datePeriod !== 'custom' && (
        <div className="flex items-center gap-1.5 h-9 px-3 bg-white border border-border rounded-[10px] text-[12px] text-text-secondary">
          <Calendar size={14} className="text-neutral" />
          <span className="tabular-nums whitespace-nowrap">{rangeLabel}</span>
        </div>
      )}

      {datePeriod === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-neutral hidden sm:block" />
          <input
            type="date"
            value={customFrom ?? ''}
            onChange={(e) => setDatePeriod('custom', e.target.value, customTo ?? e.target.value)}
            className="h-9 px-2 text-[12px] border border-border rounded-[10px] bg-white"
          />
          <span className="text-text-secondary text-[12px]">to</span>
          <input
            type="date"
            value={customTo ?? ''}
            onChange={(e) => setDatePeriod('custom', customFrom ?? e.target.value, e.target.value)}
            className="h-9 px-2 text-[12px] border border-border rounded-[10px] bg-white"
          />
        </div>
      )}

      <select
        className="sm:hidden h-9 px-2 text-[12px] border border-border rounded-[10px] bg-white"
        value={datePeriod}
        onChange={(e) => selectPeriod(e.target.value as DatePeriod)}
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
