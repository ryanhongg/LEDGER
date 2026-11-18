import type { Transaction, Budget, RecurringExpense, AppSettings } from '@/types'
import { downloadTransactionsCSV } from './csvService'
import { downloadJSON } from './storage'
import { format } from 'date-fns'

export function exportTransactions(transactions: Transaction[]): void {
  const stamp = format(new Date(), 'yyyy-MM-dd')
  downloadTransactionsCSV(transactions, `ledger-transactions-${stamp}.csv`)
}

export function exportAllData(data: {
  transactions: Transaction[]
  budgets: Budget[]
  recurring: RecurringExpense[]
  settings: AppSettings
  openingBalance: number
}): void {
  const stamp = format(new Date(), 'yyyy-MM-dd')
  downloadJSON(data, `ledger-backup-${stamp}.json`)
}

export function printReport(): void {
  window.print()
}
