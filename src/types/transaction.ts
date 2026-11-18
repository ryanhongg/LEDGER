export type TransactionType = 'income' | 'expense'

export type PaymentMethod =
  | 'Bank Transfer'
  | 'Credit Card'
  | 'Debit Card'
  | 'Cash'
  | 'Check'
  | 'PayPal'
  | 'Wire Transfer'
  | 'ACH'

export type ExpenseCategory =
  | 'Payroll'
  | 'Marketing'
  | 'Software'
  | 'Operations'
  | 'Rent'
  | 'Equipment'
  | 'Insurance'
  | 'Utilities'
  | 'Travel'
  | 'Other'

export type IncomeCategory =
  | 'Client Payment'
  | 'Consulting'
  | 'Retainer'
  | 'Product Sales'
  | 'Other Income'

export type Category = ExpenseCategory | IncomeCategory

export interface Transaction {
  id: string
  description: string
  /** Amount in cents */
  amount: number
  type: TransactionType
  category: Category
  date: string
  paymentMethod: PaymentMethod
  notes?: string
  merchant?: string
}

export interface TransactionFilters {
  search: string
  category: string
  type: '' | TransactionType
  dateFrom: string
  dateTo: string
  paymentMethod: string
}
