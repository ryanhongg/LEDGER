import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select, TextArea, Label } from '@/components/ui/Dropdown'
import type { Transaction, TransactionType, Category, PaymentMethod } from '@/types'
import { parseAmountToCents, centsToDollars } from '@/utils/currency'
import { toISODate } from '@/utils/dates'

const EXPENSE_CATEGORIES = [
  'Payroll', 'Marketing', 'Software', 'Operations', 'Rent',
  'Equipment', 'Insurance', 'Utilities', 'Travel', 'Other',
]
const INCOME_CATEGORIES = [
  'Client Payment', 'Consulting', 'Retainer', 'Product Sales', 'Other Income',
]
const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Transfer', 'Credit Card', 'Debit Card', 'Cash', 'Check', 'PayPal', 'Wire Transfer', 'ACH',
]

interface TransactionFormProps {
  initial?: Transaction
  onSubmit: (data: Omit<Transaction, 'id'>) => void
  onCancel: () => void
}

export function TransactionForm({ initial, onSubmit, onCancel }: TransactionFormProps) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(
    initial ? centsToDollars(initial.amount).toFixed(2) : '',
  )
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [category, setCategory] = useState<string>(initial?.category ?? 'Operations')
  const [date, setDate] = useState(initial?.date ?? toISODate(new Date()))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? 'Bank Transfer',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [merchant, setMerchant] = useState(initial?.merchant ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleTypeChange = (t: string) => {
    const next = t as TransactionType
    setType(next)
    setCategory(next === 'income' ? 'Client Payment' : 'Operations')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!description.trim()) e.description = 'Description is required'
    const cents = parseAmountToCents(amount)
    if (!amount || cents <= 0) e.amount = 'Enter a valid amount greater than zero'
    if (!date) e.date = 'Date is required'
    if (!category) e.category = 'Category is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    onSubmit({
      description: description.trim(),
      amount: parseAmountToCents(amount),
      type,
      category: category as Category,
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
      merchant: merchant.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Client payment — Acme Corp"
        />
        {errors.description && (
          <p className="text-[11px] text-negative mt-1">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-[11px] text-negative mt-1">{errors.amount}</p>
          )}
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            value={type}
            onChange={handleTypeChange}
            options={[
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={category}
            onChange={setCategory}
            options={categories.map((c) => ({ value: c, label: c }))}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {errors.date && (
            <p className="text-[11px] text-negative mt-1">{errors.date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="payment">Payment method</Label>
          <Select
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="merchant">Merchant / Client</Label>
          <Input
            id="merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <TextArea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? 'Save changes' : 'Add transaction'}</Button>
      </div>
    </form>
  )
}
