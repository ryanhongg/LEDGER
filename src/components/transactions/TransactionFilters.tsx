import { Search, X } from 'lucide-react'
import { Input, Select } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { useLedgerStore } from '@/store/useLedgerStore'

const CATEGORIES = [
  'Payroll', 'Marketing', 'Software', 'Operations', 'Rent', 'Equipment',
  'Insurance', 'Utilities', 'Travel', 'Other',
  'Client Payment', 'Consulting', 'Retainer', 'Product Sales', 'Other Income',
]

export function TransactionFiltersBar() {
  const filters = useLedgerStore((s) => s.transactionFilters)
  const setFilters = useLedgerStore((s) => s.setTransactionFilters)

  const hasFilters =
    filters.search ||
    filters.category ||
    filters.type ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.paymentMethod

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral"
        />
        <Input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search merchant or description…"
          className="pl-8"
        />
      </div>

      <Select
        value={filters.type}
        onChange={(v) => setFilters({ type: v as '' | 'income' | 'expense' })}
        options={[
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
        ]}
        placeholder="All types"
      />

      <Select
        value={filters.category}
        onChange={(v) => setFilters({ category: v })}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        placeholder="All categories"
      />

      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => setFilters({ dateFrom: e.target.value })}
        className="w-auto"
        title="From date"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => setFilters({ dateTo: e.target.value })}
        className="w-auto"
        title="To date"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setFilters({
              search: '',
              category: '',
              type: '',
              dateFrom: '',
              dateTo: '',
              paymentMethod: '',
            })
          }
        >
          <X size={14} />
          Clear
        </Button>
      )}
    </div>
  )
}
