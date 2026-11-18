export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type RecurringStatus = 'active' | 'paused'

export interface RecurringExpense {
  id: string
  name: string
  /** Amount in cents */
  amount: number
  category: string
  frequency: RecurringFrequency
  nextPaymentDate: string
  status: RecurringStatus
}
