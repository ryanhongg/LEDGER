import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { useLedgerStore } from '@/store/useLedgerStore'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate } from '@/utils/dates'
import { cn } from '@/utils/cn'
import type { Transaction } from '@/types'

const PAGE_SIZE = 12

interface Props {
  onView: (t: Transaction) => void
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
  onBulkDelete: () => void
}

export function TransactionTable({ onView, onEdit, onDelete, onBulkDelete }: Props) {
  const transactions = useLedgerStore((s) => s.transactions)
  const filters = useLedgerStore((s) => s.transactionFilters)
  const selected = useLedgerStore((s) => s.selectedTransactionIds)
  const setSelected = useLedgerStore((s) => s.setSelectedTransactionIds)
  const toggle = useLedgerStore((s) => s.toggleTransactionSelection)

  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [
    filters.search,
    filters.category,
    filters.type,
    filters.dateFrom,
    filters.dateTo,
    filters.paymentMethod,
  ])

  const filtered = useMemo(() => {
    let list = [...transactions]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.merchant?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q),
      )
    }
    if (filters.category) list = list.filter((t) => t.category === filters.category)
    if (filters.type) list = list.filter((t) => t.type === filters.type)
    if (filters.dateFrom) list = list.filter((t) => t.date >= filters.dateFrom)
    if (filters.dateTo) list = list.filter((t) => t.date <= filters.dateTo)
    if (filters.paymentMethod) {
      list = list.filter((t) => t.paymentMethod === filters.paymentMethod)
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') cmp = a.date.localeCompare(b.date)
      else cmp = a.amount - b.amount
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [transactions, filters, sortBy, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  )

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((t) => selected.includes(t.id))

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const toggleAllPage = () => {
    if (allPageSelected) {
      const pageIds = new Set(pageItems.map((t) => t.id))
      setSelected(selected.filter((id) => !pageIds.has(id)))
    } else {
      const merged = new Set([...selected, ...pageItems.map((t) => t.id)])
      setSelected([...merged])
    }
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-accent-soft border border-accent/15 rounded-[10px]">
          <span className="text-[13px] font-medium text-accent">
            {selected.length} selected
          </span>
          <Button variant="danger" size="sm" onClick={onBulkDelete}>
            <Trash2 size={13} />
            Delete selected
          </Button>
          <button
            onClick={() => setSelected([])}
            className="text-[12px] text-text-secondary hover:text-text ml-auto cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-[12px] bg-surface">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-bg/50">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAllPage}
                  className="rounded border-border accent-accent cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
                Merchant / Description
              </th>
              <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
                Category
              </th>
              <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
                Type
              </th>
              <th className="px-3 py-2.5">
                <button
                  onClick={() => toggleSort('date')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary hover:text-text cursor-pointer"
                >
                  Date <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
                Method
              </th>
              <th className="px-3 py-2.5 text-right">
                <button
                  onClick={() => toggleSort('amount')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary hover:text-text cursor-pointer ml-auto"
                >
                  Amount <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[13px] text-text-secondary">
                  No transactions match your filters
                </td>
              </tr>
            ) : (
              pageItems.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/60 last:border-0 hover:bg-bg/50 transition-colors cursor-pointer"
                  onClick={() => onView(t)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(t.id)}
                      onChange={() => toggle(t.id)}
                      className="rounded border-border accent-accent cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[13px] font-medium text-text truncate max-w-[260px]">
                      {t.description}
                    </div>
                    {t.merchant && (
                      <div className="text-[11px] text-text-secondary">{t.merchant}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="neutral">{t.category}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={t.type === 'income' ? 'positive' : 'negative'}>
                      {t.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                    {formatDisplayDate(t.date)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">
                    {t.paymentMethod}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-[13px] font-semibold tabular-nums text-right whitespace-nowrap',
                      t.type === 'income' ? 'text-positive' : 'text-negative',
                    )}
                  >
                    {t.type === 'income' ? '+' : '−'}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      trigger={
                        <button className="p-1.5 rounded-lg text-text-secondary hover:bg-bg hover:text-text cursor-pointer">
                          <MoreHorizontal size={15} />
                        </button>
                      }
                      items={[
                        { label: 'View', onClick: () => onView(t), icon: <Eye size={13} /> },
                        { label: 'Edit', onClick: () => onEdit(t), icon: <Pencil size={13} /> },
                        {
                          label: 'Delete',
                          onClick: () => onDelete(t),
                          icon: <Trash2 size={13} />,
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-[12px] text-text-secondary">
        <span>
          Showing {filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1}–
          {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of{' '}
          {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="px-2 tabular-nums">
            {currentPage + 1} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
