import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface Props {
  transaction: Transaction | null
  onClose: () => void
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}

export function TransactionDetails({ transaction, onClose, onEdit, onDelete }: Props) {
  useEffect(() => {
    if (!transaction) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [transaction, onClose])

  if (!transaction) return null

  const t = transaction

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#17191D]/30" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-[var(--shadow-lg)] animate-slide-in flex flex-col">
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold">Transaction details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-bg cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.04em] text-text-secondary mb-1">
              Amount
            </div>
            <div
              className={cn(
                'text-[28px] font-semibold tabular-nums tracking-[-0.03em]',
                t.type === 'income' ? 'text-positive' : 'text-negative',
              )}
            >
              {t.type === 'income' ? '+' : '−'}
              {formatCurrency(t.amount)}
            </div>
          </div>

          <Detail label="Description" value={t.description} />
          {t.merchant && <Detail label="Merchant / Client" value={t.merchant} />}
          <div className="flex gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-text-secondary mb-1">
                Type
              </div>
              <Badge variant={t.type === 'income' ? 'positive' : 'negative'}>
                {t.type === 'income' ? 'Income' : 'Expense'}
              </Badge>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-text-secondary mb-1">
                Category
              </div>
              <Badge variant="neutral">{t.category}</Badge>
            </div>
          </div>
          <Detail label="Date" value={formatDisplayDate(t.date)} />
          <Detail label="Payment method" value={t.paymentMethod} />
          {t.notes && <Detail label="Notes" value={t.notes} />}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0">
          <Button variant="secondary" className="flex-1" onClick={() => onEdit(t)}>
            <Pencil size={14} />
            Edit
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => onDelete(t)}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.04em] text-text-secondary mb-1">
        {label}
      </div>
      <div className="text-[13px] text-text">{value}</div>
    </div>
  )
}
