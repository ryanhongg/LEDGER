import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { useLedgerStore } from '@/store/useLedgerStore'
import { getBudgetSpent } from '@/utils/calculations'
import { formatCurrency } from '@/utils/currency'
import type { Budget } from '@/types'

export function BudgetsPage() {
  const budgets = useLedgerStore((s) => s.budgets)
  const transactions = useLedgerStore((s) => s.transactions)
  const addBudget = useLedgerStore((s) => s.addBudget)
  const updateBudget = useLedgerStore((s) => s.updateBudget)
  const deleteBudget = useLedgerStore((s) => s.deleteBudget)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)

  const rows = useMemo(
    () =>
      budgets.map((b) => ({
        budget: b,
        spent: getBudgetSpent(transactions, b),
      })),
    [budgets, transactions],
  )

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const remaining = totalBudget - totalSpent
  const overCount = rows.filter((r) => r.spent > r.budget.limit).length

  return (
    <>
      <Topbar
        title="Budgets"
        breadcrumb="Finances"
        showDateRange={false}
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} />
            Create budget
          </Button>
        }
      />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Budgets</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Track spending against category limits. Progress updates from transactions.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Stat label="Total budget" value={formatCurrency(totalBudget)} />
          <Stat label="Total spent" value={formatCurrency(totalSpent)} />
          <Stat
            label="Remaining"
            value={formatCurrency(remaining)}
            tone={remaining >= 0 ? 'positive' : 'negative'}
          />
          <Stat
            label="Over limit"
            value={String(overCount)}
            tone={overCount > 0 ? 'negative' : 'positive'}
          />
        </div>

        {rows.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <p className="text-[14px] font-medium">No budgets yet</p>
              <p className="text-[12px] text-text-secondary mt-1 mb-4">
                Create a budget to start tracking category spending.
              </p>
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={14} />
                Create budget
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(({ budget, spent }) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                spent={spent}
                onEdit={() => setEditing(budget)}
                onDelete={() => setDeleting(budget)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create budget">
        <BudgetForm
          onCancel={() => setShowAdd(false)}
          onSubmit={(data) => {
            addBudget(data)
            setShowAdd(false)
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit budget">
        {editing && (
          <BudgetForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(data) => {
              updateBudget(editing.id, data)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete budget"
        message="Remove this budget? Transaction history will not be affected."
        onConfirm={() => {
          if (deleting) deleteBudget(deleting.id)
        }}
      />
    </>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}) {
  return (
    <Card>
      <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
        {label}
      </div>
      <div
        className={`text-[22px] font-semibold tabular-nums tracking-[-0.02em] ${
          tone === 'positive'
            ? 'text-positive'
            : tone === 'negative'
              ? 'text-negative'
              : 'text-text'
        }`}
      >
        {value}
      </div>
    </Card>
  )
}
