import Papa from 'papaparse'
import type { Transaction, TransactionType, Category, PaymentMethod } from '@/types'
import { parseAmountToCents } from '@/utils/currency'
import { generateId } from '@/utils/formatting'
import { parseISO, isValid, format } from 'date-fns'

export interface CSVColumnMapping {
  description: string
  amount: string
  type: string
  category: string
  date: string
  paymentMethod: string
  notes: string
  merchant: string
}

export interface ParsedCSVRow {
  rowIndex: number
  raw: Record<string, string>
  transaction?: Omit<Transaction, 'id'>
  errors: string[]
  hash: string
}

export interface CSVParseResult {
  headers: string[]
  rows: ParsedCSVRow[]
  validCount: number
  invalidCount: number
}

const SAMPLE_CSV = `description,amount,type,category,date,paymentMethod,merchant,notes
Client payment — Example Co,4500.00,income,Client Payment,2026-10-15,Wire Transfer,Example Co,Invoice #1042
Adobe Creative Cloud,167.94,expense,Software,2026-10-12,Credit Card,Adobe,Monthly subscription
Office supplies,89.50,expense,Operations,2026-10-10,Debit Card,Staples,
Consulting session,2200.00,income,Consulting,2026-10-08,Bank Transfer,Acme Inc,Half-day workshop
`

export function getSampleCSV(): string {
  return SAMPLE_CSV
}

export function downloadSampleCSV(): void {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ledger-sample-transactions.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function parseCSVFile(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        resolve({
          headers: results.meta.fields ?? [],
          data: results.data,
        })
      },
      error: (err) => reject(err),
    })
  })
}

export function suggestMapping(headers: string[]): CSVColumnMapping {
  const lower = headers.map((h) => h.toLowerCase())
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const idx = lower.findIndex((h) => h.includes(c))
      if (idx >= 0) return headers[idx]
    }
    return ''
  }

  return {
    description: find('description', 'desc', 'memo', 'name'),
    amount: find('amount', 'value', 'total', 'sum'),
    type: find('type', 'direction', 'flow'),
    category: find('category', 'cat'),
    date: find('date', 'posted', 'transaction date'),
    paymentMethod: find('payment', 'method', 'account'),
    notes: find('notes', 'note', 'comment'),
    merchant: find('merchant', 'vendor', 'payee', 'client'),
  }
}

function normalizeType(raw: string, amount: number): TransactionType {
  const v = raw.trim().toLowerCase()
  if (['income', 'inflow', 'credit', 'revenue', 'in'].includes(v)) return 'income'
  if (['expense', 'outflow', 'debit', 'out'].includes(v)) return 'expense'
  // Negative amounts often mean expenses in bank exports
  if (!raw && amount < 0) return 'expense'
  if (!raw) return 'expense'
  return 'expense'
}

function parseDate(raw: string): string | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()

  // Try ISO first
  let date = parseISO(trimmed)
  if (isValid(date) && trimmed.length >= 8) return format(date, 'yyyy-MM-dd')

  // Try MM/DD/YYYY
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3]
    date = new Date(Number(year), Number(us[1]) - 1, Number(us[2]))
    if (isValid(date)) return format(date, 'yyyy-MM-dd')
  }

  date = new Date(trimmed)
  if (isValid(date)) return format(date, 'yyyy-MM-dd')
  return null
}

export function mapRows(
  data: Record<string, string>[],
  mapping: CSVColumnMapping,
): CSVParseResult {
  const rows: ParsedCSVRow[] = data.map((raw, rowIndex) => {
    const errors: string[] = []
    const description = (raw[mapping.description] ?? '').trim()
    const amountRaw = raw[mapping.amount] ?? ''
    const typeRaw = mapping.type ? (raw[mapping.type] ?? '') : ''
    const category = (raw[mapping.category] ?? 'Other').trim() || 'Other'
    const dateRaw = raw[mapping.date] ?? ''
    const paymentMethod = ((raw[mapping.paymentMethod] ?? 'Bank Transfer').trim() ||
      'Bank Transfer') as PaymentMethod
    const notes = mapping.notes ? (raw[mapping.notes] ?? '').trim() : undefined
    const merchant = mapping.merchant
      ? (raw[mapping.merchant] ?? '').trim() || undefined
      : undefined

    if (!description) errors.push('Missing description')

    let amountCents = 0
    if (!amountRaw.trim()) {
      errors.push('Missing amount')
    } else {
      amountCents = Math.abs(parseAmountToCents(amountRaw))
      if (amountCents === 0 && parseFloat(amountRaw.replace(/[$,\s]/g, '')) !== 0) {
        errors.push('Invalid amount')
      }
    }

    const date = parseDate(dateRaw)
    if (!date) errors.push('Invalid or missing date')

    const type = normalizeType(typeRaw, parseAmountToCents(amountRaw))

    const hash = [
      description.toLowerCase(),
      amountCents,
      type,
      date ?? '',
      merchant?.toLowerCase() ?? '',
    ].join('|')

    if (errors.length > 0) {
      return { rowIndex, raw, errors, hash }
    }

    return {
      rowIndex,
      raw,
      errors: [],
      hash,
      transaction: {
        description,
        amount: amountCents,
        type,
        category: category as Category,
        date: date!,
        paymentMethod,
        notes: notes || undefined,
        merchant,
      },
    }
  })

  return {
    headers: Object.keys(data[0] ?? {}),
    rows,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    invalidCount: rows.filter((r) => r.errors.length > 0).length,
  }
}

export function rowsToTransactions(
  rows: ParsedCSVRow[],
  existingHashes: Set<string>,
): { transactions: Transaction[]; skippedDuplicates: number } {
  const transactions: Transaction[] = []
  let skippedDuplicates = 0

  for (const row of rows) {
    if (!row.transaction || row.errors.length > 0) continue
    if (existingHashes.has(row.hash)) {
      skippedDuplicates++
      continue
    }
    transactions.push({
      ...row.transaction,
      id: generateId('tx'),
    })
    existingHashes.add(row.hash)
  }

  return { transactions, skippedDuplicates }
}

export function transactionsToCSV(transactions: Transaction[]): string {
  return Papa.unparse(
    transactions.map((t) => ({
      description: t.description,
      amount: (t.amount / 100).toFixed(2),
      type: t.type,
      category: t.category,
      date: t.date,
      paymentMethod: t.paymentMethod,
      merchant: t.merchant ?? '',
      notes: t.notes ?? '',
    })),
  )
}

export function downloadTransactionsCSV(
  transactions: Transaction[],
  filename = 'ledger-transactions.csv',
): void {
  const csv = transactionsToCSV(transactions)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function transactionHash(t: Transaction): string {
  return [
    t.description.toLowerCase(),
    t.amount,
    t.type,
    t.date,
    t.merchant?.toLowerCase() ?? '',
  ].join('|')
}
