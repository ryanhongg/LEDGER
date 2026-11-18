import { useMemo, useState } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { RecurringForm } from '@/components/recurring/RecurringForm'
import { useLedgerStore } from '@/store/useLedgerStore'
import { getTotalMonthlyRecurring, monthlyEquivalent } from '@/utils/calculations'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate } from '@/utils/dates'
import type { RecurringExpense } from '@/types'

export function RecurringPage() {
  const recurring = useLedgerStore((s) => s.recurring)
  const addRecurring = useLedgerStore((s) => s.addRecurring)
  const updateRecurring = useLedgerStore((s) => s.updateRecurring)
  const deleteRecurring = useLedgerStore((s) => s.deleteRecurring)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)
  const [deleting, setDeleting] = useState<RecurringExpense | null>(null)

  const monthlyTotal = getTotalMonthlyRecurring(recurring)
  const activeCount = recurring.filter((r) => r.status === 'active').length

  const upcoming = useMemo(
    () =>
      [...recurring]
        .filter((r) => r.status === 'active')
        .sort((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate))
        .slice(0, 6),
    [recurring],
  )

  return (
    <>
      <Topbar
        title="Recurring Expenses"
        breadcrumb="Finances"
        showDateRange={false}
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} />
            Add recurring
          </Button>
        }
      />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">
            Recurring Expenses
          </h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Track subscriptions, rent, payroll, and other commitments. Used in forecasts — not auto-duplicated as transactions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Card>
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Monthly equivalent
            </div>
            <div className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">
              {formatCurrency(monthlyTotal)}
            </div>
          </Card>
          <Card>
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Active commitments
            </div>
            <div className="text-[24px] font-semibold tabular-nums">{activeCount}</div>
          </Card>
          <Card>
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
              Annualized
            </div>
            <div className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">
              {formatCurrency(monthlyTotal * 12)}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <Card padded={false}>
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-[15px] font-semibold">All recurring</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-bg/50">
                      {['Name', 'Category', 'Amount', 'Frequency', 'Next payment', 'Status', ''].map(
                        (h) => (
                          <th
                            key={h || 'actions'}
                            className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {recurring.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-[13px] text-text-secondary">
                          No recurring expenses yet
                        </td>
                      </tr>
                    ) : (
                      recurring.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-border/60 last:border-0 hover:bg-bg/50"
                        >
                          <td className="px-4 py-3 text-[13px] font-medium">{r.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="neutral">{r.category}</Badge>
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold tabular-nums">
                            {formatCurrency(r.amount)}
                            <div className="text-[11px] font-normal text-text-secondary">
                              {formatCurrency(monthlyEquivalent(r.amount, r.frequency))}/mo
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-text-secondary capitalize">
                            {r.frequency}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                            {formatDisplayDate(r.nextPaymentDate)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={r.status === 'active' ? 'positive' : 'amber'}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Dropdown
                              trigger={
                                <button className="p-1.5 rounded-lg text-text-secondary hover:bg-bg cursor-pointer">
                                  <MoreHorizontal size={15} />
                                </button>
                              }
                              items={[
                                {
                                  label: 'Edit',
                                  onClick: () => setEditing(r),
                                  icon: <Pencil size={13} />,
                                },
                                {
                                  label: r.status === 'active' ? 'Pause' : 'Activate',
                                  onClick: () =>
                                    updateRecurring(r.id, {
                                      status: r.status === 'active' ? 'paused' : 'active',
                                    }),
                                  icon:
                                    r.status === 'active' ? (
                                      <Pause size={13} />
                                    ) : (
                                      <Play size={13} />
                                    ),
                                },
                                {
                                  label: 'Delete',
                                  onClick: () => setDeleting(r),
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
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Upcoming payments"
              subtitle="Next scheduled commitments"
            />
            <div className="space-y-0">
              {upcoming.length === 0 ? (
                <p className="text-[13px] text-text-secondary py-4">No upcoming payments</p>
              ) : (
                upcoming.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex gap-3 py-3 border-b border-border/60 last:border-0"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                      {i < upcoming.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="text-[13px] font-medium">{r.name}</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {formatDisplayDate(r.nextPaymentDate)} · {r.category}
                      </div>
                    </div>
                    <div className="text-[13px] font-semibold tabular-nums">
                      {formatCurrency(r.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </PageContainer>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add recurring expense">
        <RecurringForm
          onCancel={() => setShowAdd(false)}
          onSubmit={(data) => {
            addRecurring(data)
            setShowAdd(false)
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit recurring expense">
        {editing && (
          <RecurringForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(data) => {
              updateRecurring(editing.id, data)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete recurring expense"
        message="Remove this recurring commitment? Past transactions will not be affected."
        onConfirm={() => {
          if (deleting) deleteRecurring(deleting.id)
        }}
      />
    </>
  )
}
