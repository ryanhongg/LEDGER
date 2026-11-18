import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { Budget } from '@/types'

interface Props {
  budget: Budget
  spent: number
  onEdit: () => void
  onDelete: () => void
}

export function BudgetCard({ budget, spent, onEdit, onDelete }: Props) {
  const pct = budget.limit === 0 ? 0 : (spent / budget.limit) * 100
  const remaining = budget.limit - spent

  let barColor = 'bg-accent'
  let status: 'normal' | 'amber' | 'over' = 'normal'
  if (pct >= 100) {
    barColor = 'bg-negative'
    status = 'over'
  } else if (pct >= 80) {
    barColor = 'bg-amber'
    status = 'amber'
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold text-text">{budget.name}</h4>
            <Badge
              variant={
                status === 'over' ? 'negative' : status === 'amber' ? 'amber' : 'accent'
              }
            >
              {status === 'over' ? 'Over budget' : status === 'amber' ? 'Near limit' : 'On track'}
            </Badge>
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5 capitalize">
            {budget.category} · {budget.period}
          </p>
        </div>
        <Dropdown
          trigger={
            <button className="p-1.5 rounded-lg text-text-secondary hover:bg-bg cursor-pointer">
              <MoreHorizontal size={15} />
            </button>
          }
          items={[
            { label: 'Edit', onClick: onEdit, icon: <Pencil size={13} /> },
            { label: 'Delete', onClick: onDelete, icon: <Trash2 size={13} />, danger: true },
          ]}
        />
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[11px] text-text-secondary">Spent</div>
          <div className="text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
            {formatCurrency(spent)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-secondary">of {formatCurrency(budget.limit)}</div>
          <div
            className={cn(
              'text-[13px] font-medium tabular-nums',
              remaining < 0 ? 'text-negative' : 'text-text-secondary',
            )}
          >
            {remaining >= 0
              ? `${formatCurrency(remaining)} left`
              : `${formatCurrency(Math.abs(remaining))} over`}
          </div>
        </div>
      </div>

      <div className="h-2 bg-bg rounded-full overflow-hidden border border-border/60">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-text-secondary tabular-nums">
        {pct.toFixed(0)}% used
      </div>
    </Card>
  )
}
