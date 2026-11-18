import { create } from 'zustand'
import type {
  Transaction,
  Budget,
  RecurringExpense,
  AppSettings,
  DatePeriod,
  ChartGranularity,
  ForecastAssumptions,
  Toast,
  TransactionFilters,
} from '@/types'
import { getSeedSnapshot, OPENING_BALANCE } from '@/data/seedData'
import { loadState, saveState, clearState } from '@/services/storage'
import { transactionHash } from '@/services/csvService'
import { generateId } from '@/utils/formatting'
import { getDateRange } from '@/utils/dates'

interface LedgerState {
  transactions: Transaction[]
  budgets: Budget[]
  recurring: RecurringExpense[]
  settings: AppSettings
  openingBalance: number
  importedHashes: string[]

  datePeriod: DatePeriod
  customFrom: string | null
  customTo: string | null
  chartGranularity: ChartGranularity
  forecastAssumptions: ForecastAssumptions

  transactionFilters: TransactionFilters
  selectedTransactionIds: string[]

  toasts: Toast[]
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean

  // Init
  hydrate: () => void
  persist: () => void

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  deleteTransactions: (ids: string[]) => void
  importTransactions: (txs: Transaction[], hashes: string[]) => void
  setTransactionFilters: (filters: Partial<TransactionFilters>) => void
  setSelectedTransactionIds: (ids: string[]) => void
  toggleTransactionSelection: (id: string) => void

  // Budgets
  addBudget: (budget: Omit<Budget, 'id'>) => void
  updateBudget: (id: string, updates: Partial<Budget>) => void
  deleteBudget: (id: string) => void

  // Recurring
  addRecurring: (item: Omit<RecurringExpense, 'id'>) => void
  updateRecurring: (id: string, updates: Partial<RecurringExpense>) => void
  deleteRecurring: (id: string) => void

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetDemoData: () => void

  // UI
  setDatePeriod: (period: DatePeriod, from?: string, to?: string) => void
  setChartGranularity: (g: ChartGranularity) => void
  setForecastAssumptions: (a: Partial<ForecastAssumptions>) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  setSidebarCollapsed: (v: boolean) => void
  setMobileSidebarOpen: (v: boolean) => void

  getDateRange: () => ReturnType<typeof getDateRange>
}

const defaultFilters: TransactionFilters = {
  search: '',
  category: '',
  type: '',
  dateFrom: '',
  dateTo: '',
  paymentMethod: '',
}

function persistSlice(get: () => LedgerState) {
  const s = get()
  saveState({
    transactions: s.transactions,
    budgets: s.budgets,
    recurring: s.recurring,
    settings: s.settings,
    openingBalance: s.openingBalance,
    importedHashes: s.importedHashes,
  })
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  transactions: [],
  budgets: [],
  recurring: [],
  settings: getSeedSnapshot().settings,
  openingBalance: OPENING_BALANCE,
  importedHashes: [],

  datePeriod: 'last30',
  customFrom: null,
  customTo: null,
  chartGranularity: 'weekly',
  forecastAssumptions: {
    revenueGrowthPercent: 5,
    expenseGrowthPercent: 2,
    durationDays: 90,
  },

  transactionFilters: { ...defaultFilters },
  selectedTransactionIds: [],

  toasts: [],
  sidebarCollapsed: false,
  mobileSidebarOpen: false,

  hydrate: () => {
    const saved = loadState()
    if (saved) {
      set({
        transactions: saved.transactions as Transaction[],
        budgets: saved.budgets as Budget[],
        recurring: saved.recurring as RecurringExpense[],
        settings: saved.settings as AppSettings,
        openingBalance: saved.openingBalance ?? OPENING_BALANCE,
        importedHashes: saved.importedHashes ?? [],
        datePeriod: (saved.settings as AppSettings)?.defaultPeriod ?? 'last30',
      })
    } else {
      const seed = getSeedSnapshot()
      set({
        transactions: seed.transactions,
        budgets: seed.budgets,
        recurring: seed.recurring,
        settings: seed.settings,
        openingBalance: seed.openingBalance,
        importedHashes: seed.transactions.map(transactionHash),
        datePeriod: seed.settings.defaultPeriod,
      })
      persistSlice(get)
    }
  },

  persist: () => persistSlice(get),

  addTransaction: (tx) => {
    const transaction: Transaction = { ...tx, id: generateId('tx') }
    set((s) => ({
      transactions: [transaction, ...s.transactions],
      importedHashes: [...s.importedHashes, transactionHash(transaction)],
    }))
    persistSlice(get)
    get().addToast('Transaction added', 'success')
  },

  updateTransaction: (id, updates) => {
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    }))
    persistSlice(get)
    get().addToast('Transaction updated', 'success')
  },

  deleteTransaction: (id) => {
    set((s) => ({
      transactions: s.transactions.filter((t) => t.id !== id),
      selectedTransactionIds: s.selectedTransactionIds.filter((x) => x !== id),
    }))
    persistSlice(get)
    get().addToast('Transaction deleted', 'success')
  },

  deleteTransactions: (ids) => {
    const idSet = new Set(ids)
    set((s) => ({
      transactions: s.transactions.filter((t) => !idSet.has(t.id)),
      selectedTransactionIds: [],
    }))
    persistSlice(get)
    get().addToast(`${ids.length} transaction${ids.length === 1 ? '' : 's'} deleted`, 'success')
  },

  importTransactions: (txs, hashes) => {
    set((s) => ({
      transactions: [...txs, ...s.transactions],
      importedHashes: [...s.importedHashes, ...hashes],
    }))
    persistSlice(get)
  },

  setTransactionFilters: (filters) => {
    set((s) => ({
      transactionFilters: { ...s.transactionFilters, ...filters },
    }))
  },

  setSelectedTransactionIds: (ids) => set({ selectedTransactionIds: ids }),

  toggleTransactionSelection: (id) => {
    set((s) => ({
      selectedTransactionIds: s.selectedTransactionIds.includes(id)
        ? s.selectedTransactionIds.filter((x) => x !== id)
        : [...s.selectedTransactionIds, id],
    }))
  },

  addBudget: (budget) => {
    set((s) => ({
      budgets: [...s.budgets, { ...budget, id: generateId('bud') }],
    }))
    persistSlice(get)
    get().addToast('Budget created', 'success')
  },

  updateBudget: (id, updates) => {
    set((s) => ({
      budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }))
    persistSlice(get)
    get().addToast('Budget updated', 'success')
  },

  deleteBudget: (id) => {
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }))
    persistSlice(get)
    get().addToast('Budget deleted', 'success')
  },

  addRecurring: (item) => {
    set((s) => ({
      recurring: [...s.recurring, { ...item, id: generateId('rec') }],
    }))
    persistSlice(get)
    get().addToast('Recurring expense added', 'success')
  },

  updateRecurring: (id, updates) => {
    set((s) => ({
      recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }))
    persistSlice(get)
    get().addToast('Recurring expense updated', 'success')
  },

  deleteRecurring: (id) => {
    set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) }))
    persistSlice(get)
    get().addToast('Recurring expense deleted', 'success')
  },

  updateSettings: (updates) => {
    set((s) => ({ settings: { ...s.settings, ...updates } }))
    persistSlice(get)
    get().addToast('Settings saved', 'success')
  },

  resetDemoData: () => {
    clearState()
    const seed = getSeedSnapshot()
    set({
      transactions: seed.transactions,
      budgets: seed.budgets,
      recurring: seed.recurring,
      settings: seed.settings,
      openingBalance: seed.openingBalance,
      importedHashes: seed.transactions.map(transactionHash),
      transactionFilters: { ...defaultFilters },
      selectedTransactionIds: [],
      datePeriod: seed.settings.defaultPeriod,
      forecastAssumptions: {
        revenueGrowthPercent: 5,
        expenseGrowthPercent: 2,
        durationDays: 90,
      },
    })
    persistSlice(get)
    get().addToast('Demo data restored', 'success')
  },

  setDatePeriod: (period, from, to) => {
    set({
      datePeriod: period,
      customFrom: from ?? null,
      customTo: to ?? null,
    })
  },

  setChartGranularity: (g) => set({ chartGranularity: g }),

  setForecastAssumptions: (a) => {
    set((s) => ({
      forecastAssumptions: { ...s.forecastAssumptions, ...a },
    }))
  },

  addToast: (message, type = 'info') => {
    const id = generateId('toast')
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3200)
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

  getDateRange: () => {
    const { datePeriod, customFrom, customTo } = get()
    // Parse YYYY-MM-DD as local dates to avoid UTC day-shift bugs
    const parseLocal = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    return getDateRange(
      datePeriod,
      customFrom ? parseLocal(customFrom) : undefined,
      customTo ? parseLocal(customTo) : undefined,
    )
  },
}))
