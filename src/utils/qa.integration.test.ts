import { describe, it, expect, beforeEach } from 'vitest'
import { useLedgerStore } from '@/store/useLedgerStore'
import {
  computeKPI,
  getBudgetSpent,
  getTotalMonthlyRecurring,
  generateForecast,
  getTotalRevenue,
  getTotalExpenses,
  getNetProfit,
} from '@/utils/calculations'
import { getDateRange } from '@/utils/dates'
import {
  mapRows,
  rowsToTransactions,
  transactionsToCSV,
  parseCSVFile,
  suggestMapping,
  transactionHash,
} from '@/services/csvService'
import { dollarsToCents } from '@/utils/currency'
import { getSeedSnapshot } from '@/data/seedData'
import { saveState, loadState, clearState } from '@/services/storage'

describe('QA integration', () => {
  beforeEach(() => {
    clearState()
    localStorage.clear()
    const seed = getSeedSnapshot()
    useLedgerStore.setState({
      transactions: seed.transactions,
      budgets: seed.budgets,
      recurring: seed.recurring,
      settings: seed.settings,
      openingBalance: seed.openingBalance,
      importedHashes: seed.transactions.map(transactionHash),
      transactionFilters: {
        search: '',
        category: '',
        type: '',
        dateFrom: '',
        dateTo: '',
        paymentMethod: '',
      },
      selectedTransactionIds: [],
      datePeriod: 'last30',
      customFrom: null,
      customTo: null,
    })
  })

  it('seed produces plausible dashboard KPIs', () => {
    const { transactions, openingBalance } = useLedgerStore.getState()
    const range = getDateRange('last30')
    const revenue = computeKPI(transactions, range, 'revenue', openingBalance)
    const expenses = computeKPI(transactions, range, 'expenses', openingBalance)
    const profit = computeKPI(transactions, range, 'profit', openingBalance)
    expect(revenue.value).toBeGreaterThan(0)
    expect(expenses.value).toBeGreaterThan(0)
    expect(profit.value).toBe(revenue.value - expenses.value)
  })

  it('CRUD updates metrics and budgets', () => {
    const store = useLedgerStore.getState()
    const before = getTotalRevenue(store.transactions)
    const marketingBudget = store.budgets.find((b) => b.category === 'Marketing')!
    const spentBefore = getBudgetSpent(store.transactions, marketingBudget)

    store.addTransaction({
      description: 'QA marketing spend',
      amount: dollarsToCents(500),
      type: 'expense',
      category: 'Marketing',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Credit Card',
    })

    const after = useLedgerStore.getState()
    expect(getTotalExpenses(after.transactions)).toBe(
      getTotalExpenses(store.transactions) + dollarsToCents(500),
    )
    expect(getTotalRevenue(after.transactions)).toBe(before)
    expect(getBudgetSpent(after.transactions, marketingBudget)).toBe(
      spentBefore + dollarsToCents(500),
    )

    const added = after.transactions.find((t) => t.description === 'QA marketing spend')!
    after.updateTransaction(added.id, { amount: dollarsToCents(250) })
    expect(
      getBudgetSpent(useLedgerStore.getState().transactions, marketingBudget),
    ).toBe(spentBefore + dollarsToCents(250))

    useLedgerStore.getState().deleteTransaction(added.id)
    expect(
      getBudgetSpent(useLedgerStore.getState().transactions, marketingBudget),
    ).toBe(spentBefore)
  })

  it('persists to localStorage and rehydrates', () => {
    const store = useLedgerStore.getState()
    store.addTransaction({
      description: 'Persist me',
      amount: dollarsToCents(99),
      type: 'income',
      category: 'Other Income',
      date: '2026-11-01',
      paymentMethod: 'Cash',
    })
    store.persist()

    const saved = loadState()
    expect(saved).not.toBeNull()
    expect(
      (saved!.transactions as { description: string }[]).some(
        (t) => t.description === 'Persist me',
      ),
    ).toBe(true)

    // Simulate fresh load
    useLedgerStore.setState({ transactions: [] })
    useLedgerStore.getState().hydrate()
    expect(
      useLedgerStore.getState().transactions.some((t) => t.description === 'Persist me'),
    ).toBe(true)
  })

  it('CSV import/export round-trip with validation', async () => {
    const csv = transactionsToCSV([
      {
        id: '1',
        description: 'Round trip client',
        amount: dollarsToCents(1234.56),
        type: 'income',
        category: 'Client Payment',
        date: '2026-10-01',
        paymentMethod: 'ACH',
        merchant: 'Acme',
      },
      {
        id: '2',
        description: 'Broken row',
        amount: dollarsToCents(10),
        type: 'expense',
        category: 'Other',
        date: '2026-10-02',
        paymentMethod: 'Cash',
      },
    ])
    const file = new File([csv], 't.csv', { type: 'text/csv' })
    const { headers, data } = await parseCSVFile(file)

    const mapping = suggestMapping(headers)
    // Force an invalid row by clearing required fields
    data[1].description = ''
    data[1].date = 'not-a-date'
    data[1].amount = ''
    const parsed = mapRows(data, mapping)
    expect(parsed.validCount).toBe(1)
    expect(parsed.invalidCount).toBe(1)

    const { transactions, skippedDuplicates } = rowsToTransactions(
      parsed.rows,
      new Set(),
    )
    expect(transactions).toHaveLength(1)
    expect(transactions[0].amount).toBe(dollarsToCents(1234.56))
    expect(skippedDuplicates).toBe(0)

    const again = rowsToTransactions(
      parsed.rows,
      new Set([transactionHash(transactions[0])]),
    )
    expect(again.transactions).toHaveLength(0)
    expect(again.skippedDuplicates).toBe(1)
  })

  it('recurring monthly equivalent + forecast respond to assumptions', () => {
    const { transactions, recurring, openingBalance } = useLedgerStore.getState()
    const monthly = getTotalMonthlyRecurring(recurring)
    expect(monthly).toBeGreaterThan(0)
    // paused items excluded
    const activeOnly = recurring.filter((r) => r.status === 'active')
    expect(getTotalMonthlyRecurring(activeOnly)).toBe(monthly)

    const base = generateForecast(
      transactions,
      recurring,
      { revenueGrowthPercent: 0, expenseGrowthPercent: 0, durationDays: 90 },
      openingBalance,
    )
    const grown = generateForecast(
      transactions,
      recurring,
      { revenueGrowthPercent: 50, expenseGrowthPercent: 0, durationDays: 90 },
      openingBalance,
    )
    expect(grown.projectedEndingCash).toBeGreaterThan(base.projectedEndingCash)
    expect(base.points.length).toBeGreaterThan(0)
    expect(base.expectedHigh).toBeGreaterThanOrEqual(base.expectedLow)
  })

  it('net profit identity holds across seed', () => {
    const txs = useLedgerStore.getState().transactions
    expect(getNetProfit(txs)).toBe(getTotalRevenue(txs) - getTotalExpenses(txs))
  })

  it('reset restores seed', () => {
    useLedgerStore.getState().addTransaction({
      description: 'temp',
      amount: 100,
      type: 'expense',
      category: 'Other',
      date: '2026-11-01',
      paymentMethod: 'Cash',
    })
    useLedgerStore.getState().resetDemoData()
    const seed = getSeedSnapshot()
    expect(useLedgerStore.getState().transactions).toHaveLength(seed.transactions.length)
  })

  void saveState
})
