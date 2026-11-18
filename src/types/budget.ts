export type BudgetPeriod = 'monthly' | 'yearly'

export interface Budget {
  id: string
  name: string
  category: string
  /** Limit in cents */
  limit: number
  period: BudgetPeriod
}
