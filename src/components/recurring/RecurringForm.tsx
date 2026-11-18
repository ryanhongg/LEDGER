import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Label } from '@/components/ui/Dropdown'
import type { RecurringExpense, RecurringFrequency, RecurringStatus } from '@/types'
import { parseAmountToCents, centsToDollars } from '@/utils/currency'
import { toISODate } from '@/utils/dates'

const CATEGORIES = [
  'Payroll', 'Marketing', 'Software', 'Operations', 'Rent',
  'Equipment', 'Insurance', 'Utilities', 'Travel', 'Other',
]

interface Props {
  initial?: RecurringExpense
  onSubmit: (data: Omit<RecurringExpense, 'id'>) => void
  onCancel: () => void
}

export function RecurringForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(
    initial ? centsToDollars(initial.amount).toFixed(2) : '',
  )
  const [category, setCategory] = useState(initial?.category ?? 'Software')
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initial?.frequency ?? 'monthly',
  )
  const [nextPaymentDate, setNextPaymentDate] = useState(
    initial?.nextPaymentDate ?? toISODate(new Date()),
  )
  const [status, setStatus] = useState<RecurringStatus>(initial?.status ?? 'active')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!name.trim()) err.name = 'Name is required'
    const cents = parseAmountToCents(amount)
    if (!amount || cents <= 0) err.amount = 'Enter a valid amount'
    if (!nextPaymentDate) err.nextPaymentDate = 'Next payment date is required'
    setErrors(err)
    if (Object.keys(err).length > 0) return

    onSubmit({
      name: name.trim(),
      amount: cents,
      category,
      frequency,
      nextPaymentDate,
      status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Office Rent"
        />
        {errors.name && <p className="text-[11px] text-negative mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && (
            <p className="text-[11px] text-negative mt-1">{errors.amount}</p>
          )}
        </div>
        <div>
          <Label>Category</Label>
          <Select
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            className="w-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Frequency</Label>
          <Select
            value={frequency}
            onChange={(v) => setFrequency(v as RecurringFrequency)}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            className="w-full"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={status}
            onChange={(v) => setStatus(v as RecurringStatus)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
            ]}
            className="w-full"
          />
        </div>
      </div>
      <div>
        <Label>Next payment date</Label>
        <Input
          type="date"
          value={nextPaymentDate}
          onChange={(e) => setNextPaymentDate(e.target.value)}
        />
        {errors.nextPaymentDate && (
          <p className="text-[11px] text-negative mt-1">{errors.nextPaymentDate}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? 'Save changes' : 'Add recurring'}</Button>
      </div>
    </form>
  )
}
