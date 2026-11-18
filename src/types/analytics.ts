export type DatePeriod =
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisYear'
  | 'custom'

export type ChartGranularity = 'daily' | 'weekly' | 'monthly'

export interface DateRange {
  from: Date
  to: Date
  period: DatePeriod
}

export interface KPIMetric {
  value: number
  previousValue: number
  changePercent: number
  sparkline: number[]
}

export interface CashFlowPoint {
  date: string
  revenue: number
  expenses: number
  net: number
  balance?: number
  isForecast?: boolean
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percent: number
  color: string
}

export interface FinancialHealth {
  profitMargin: number
  expenseToRevenue: number
  revenueGrowth: number
  cashRunwayDays: number | null
  isCashGrowing: boolean
}

export interface ForecastAssumptions {
  revenueGrowthPercent: number
  expenseGrowthPercent: number
  durationDays: number
}

export interface ForecastResult {
  points: CashFlowPoint[]
  projectedEndingCash: number
  expectedLow: number
  expectedHigh: number
  projectedNet: number
}

export interface AppSettings {
  businessName: string
  businessType: string
  currency: string
  fiscalYearStart: number
  defaultPeriod: DatePeriod
  numberFormat: 'standard' | 'compact'
  theme: 'light' | 'system'
  userName: string
  userRole: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
