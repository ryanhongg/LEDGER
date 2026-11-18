import { useMemo, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { TransactionFiltersBar } from '@/components/transactions/TransactionFilters'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransactionDetails } from '@/components/transactions/TransactionDetails'
import { CSVImporter } from '@/components/transactions/CSVImporter'
import { useLedgerStore } from '@/store/useLedgerStore'
import { formatCurrency } from '@/utils/currency'
import { exportTransactions } from '@/services/exportService'
import type { Transaction } from '@/types'

export function TransactionsPage() {
  const transactions = useLedgerStore((s) => s.transactions)
  const filters = useLedgerStore((s) => s.transactionFilters)
  const selected = useLedgerStore((s) => s.selectedTransactionIds)
  const addTransaction = useLedgerStore((s) => s.addTransaction)
  const updateTransaction = useLedgerStore((s) => s.updateTransaction)
  const deleteTransaction = useLedgerStore((s) => s.deleteTransaction)
  const deleteTransactions = useLedgerStore((s) => s.deleteTransactions)
  const setSelected = useLedgerStore((s) => s.setSelectedTransactionIds)

  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [viewing, setViewing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [bulkDelete, setBulkDelete] = useState(false)

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.merchant?.toLowerCase().includes(q),
      )
    }
    if (filters.category) list = list.filter((t) => t.category === filters.category)
    if (filters.type) list = list.filter((t) => t.type === filters.type)
    if (filters.dateFrom) list = list.filter((t) => t.date >= filters.dateFrom)
    if (filters.dateTo) list = list.filter((t) => t.date <= filters.dateTo)
    return list
  }, [transactions, filters])

  const income = filtered
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const expenses = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <Topbar
        title="Transactions"
        breadcrumb="Finances"
        showDateRange={false}
        onExport={() => exportTransactions(filtered)}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
              <Upload size={14} />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} />
              Add transaction
            </Button>
          </>
        }
      />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Transactions</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Manage and review your business activity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SummaryCard label="Total income" value={income} tone="positive" />
          <SummaryCard label="Total expenses" value={expenses} tone="negative" />
          <SummaryCard label="Net activity" value={income - expenses} tone="neutral" />
        </div>

        <Card className="mb-4">
          <TransactionFiltersBar />
        </Card>

        <TransactionTable
          onView={setViewing}
          onEdit={(t) => {
            setViewing(null)
            setEditing(t)
          }}
          onDelete={setDeleting}
          onBulkDelete={() => setBulkDelete(true)}
        />
      </PageContainer>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add transaction"
        subtitle="Record a new income or expense"
      >
        <TransactionForm
          onCancel={() => setShowAdd(false)}
          onSubmit={(data) => {
            addTransaction(data)
            setShowAdd(false)
          }}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit transaction"
      >
        {editing && (
          <TransactionForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(data) => {
              updateTransaction(editing.id, data)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      <TransactionDetails
        transaction={viewing}
        onClose={() => setViewing(null)}
        onEdit={(t) => {
          setViewing(null)
          setEditing(t)
        }}
        onDelete={(t) => {
          setViewing(null)
          setDeleting(t)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete transaction"
        message="This will permanently remove this transaction. Related budgets and charts will update automatically."
        onConfirm={() => {
          if (deleting) deleteTransaction(deleting.id)
        }}
      />

      <ConfirmDialog
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        title="Delete selected transactions"
        message={`Permanently delete ${selected.length} transaction${selected.length === 1 ? '' : 's'}? This cannot be undone.`}
        onConfirm={() => {
          deleteTransactions(selected)
          setSelected([])
        }}
      />

      <CSVImporter open={showImport} onClose={() => setShowImport(false)} />
    </>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'positive' | 'negative' | 'neutral'
}) {
  const color =
    tone === 'positive'
      ? 'text-positive'
      : tone === 'negative'
        ? 'text-negative'
        : value >= 0
          ? 'text-positive'
          : 'text-negative'

  return (
    <Card>
      <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
        {label}
      </div>
      <div className={`text-[24px] font-semibold tabular-nums tracking-[-0.02em] ${color}`}>
        {formatCurrency(value, { showSign: tone === 'neutral' })}
      </div>
    </Card>
  )
}
