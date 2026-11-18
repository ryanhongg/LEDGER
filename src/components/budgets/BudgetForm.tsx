import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Label } from '@/components/ui/Dropdown'
import type { Budget, BudgetPeriod } from '@/types'
import { parseAmountToCents, centsToDollars } from '@/utils/currency'

const CATEGORIES = [
  'Marketing', 'Payroll', 'Operations', 'Software', 'Equipment', 'Rent',
  'Insurance', 'Utilities', 'Travel', 'Other',
]

interface Props {
  initial?: Budget
  onSubmit: (data: Omit<Budget, 'id'>) => void
  onCancel: () => void
}

export function BudgetForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Marketing')
  const [limit, setLimit] = useState(
    initial ? centsToDollars(initial.limit).toFixed(2) : '',
  )
  const [period, setPeriod] = useState<BudgetPeriod>(initial?.period ?? 'monthly')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!name.trim()) err.name = 'Name is required'
    const cents = parseAmountToCents(limit)
    if (!limit || cents <= 0) err.limit = 'Enter a valid budget limit'
    setErrors(err)
    if (Object.keys(err).length > 0) return

    onSubmit({
      name: name.trim(),
      category,
      limit: cents,
      period,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Budget name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing" />
        {errors.name && <p className="text-[11px] text-negative mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            className="w-full"
          />
        </div>
        <div>
          <Label>Period</Label>
          <Select
            value={period}
            onChange={(v) => setPeriod(v as BudgetPeriod)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            className="w-full"
          />
        </div>
      </div>
      <div>
        <Label>Budget limit</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="0.00"
        />
        {errors.limit && <p className="text-[11px] text-negative mt-1">{errors.limit}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? 'Save changes' : 'Create budget'}</Button>
      </div>
    </form>
  )
}
