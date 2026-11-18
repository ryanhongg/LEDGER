import type {
  Transaction,
  DateRange,
  ChartGranularity,
  CashFlowPoint,
  CategoryBreakdown,
  FinancialHealth,
  KPIMetric,
  Budget,
  RecurringExpense,
  ForecastAssumptions,
  ForecastResult,
} from '@/types'
import {
  isDateInRange,
  getPreviousPeriodRange,
  getBucketKey,
  getBucketKeys,
  daysBetween,
  toISODate,
  addDays,
  parseISO,
} from './dates'
import { addCents } from './currency'

const CATEGORY_COLORS: Record<string, string> = {
  Payroll: '#315CE8',
  Marketing: '#7C5CFC',
  Software: '#0EA5E9',
  Operations: '#F59E0B',
  Rent: '#EC4899',
  Equipment: '#14B8A6',
  Insurance: '#6366F1',
  Utilities: '#84CC16',
  Travel: '#F97316',
  Other: '#8993A3',
}

export function filterByDateRange(
  transactions: Transaction[],
  range: DateRange,
): Transaction[] {
  return transactions.filter((t) => isDateInRange(t.date, range))
}

export function sumByType(
  transactions: Transaction[],
  type: 'income' | 'expense',
): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => addCents(sum, t.amount), 0)
}

export function getTotalRevenue(transactions: Transaction[]): number {
  return sumByType(transactions, 'income')
}

export function getTotalExpenses(transactions: Transaction[]): number {
  return sumByType(transactions, 'expense')
}

export function getNetProfit(transactions: Transaction[]): number {
  return getTotalRevenue(transactions) - getTotalExpenses(transactions)
}

export function getCashBalance(
  transactions: Transaction[],
  openingBalance = 0,
): number {
  return transactions.reduce((balance, t) => {
    return t.type === 'income' ? balance + t.amount : balance - t.amount
  }, openingBalance)
}

export function changePercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

function sparklineFromTransactions(
  transactions: Transaction[],
  range: DateRange,
  type: 'income' | 'expense' | 'net' | 'balance',
  buckets = 12,
): number[] {
  const days = daysBetween(range.from, range.to)
  const bucketSize = Math.max(1, Math.floor(days / buckets))
  const values: number[] = []
  let runningBalance = 0

  for (let i = 0; i < buckets; i++) {
    const bucketStart = addDays(range.from, i * bucketSize)
    const bucketEnd =
      i === buckets - 1
        ? range.to
        : addDays(range.from, (i + 1) * bucketSize - 1)

    const inBucket = transactions.filter((t) => {
      const d = parseISO(t.date)
      return d >= bucketStart && d <= bucketEnd
    })

    const revenue = getTotalRevenue(inBucket)
    const expenses = getTotalExpenses(inBucket)

    if (type === 'income') values.push(revenue)
    else if (type === 'expense') values.push(expenses)
    else if (type === 'net') values.push(revenue - expenses)
    else {
      runningBalance += revenue - expenses
      values.push(runningBalance)
    }
  }

  return values
}

export function computeKPI(
  transactions: Transaction[],
  range: DateRange,
  metric: 'revenue' | 'expenses' | 'profit' | 'cash',
  openingBalance = 4500000,
): KPIMetric {
  const current = filterByDateRange(transactions, range)
  const prevRange = getPreviousPeriodRange(range)
  const previous = filterByDateRange(transactions, prevRange)

  let value: number
  let previousValue: number
  let sparkType: 'income' | 'expense' | 'net' | 'balance'

  switch (metric) {
    case 'revenue':
      value = getTotalRevenue(current)
      previousValue = getTotalRevenue(previous)
      sparkType = 'income'
      break
    case 'expenses':
      value = getTotalExpenses(current)
      previousValue = getTotalExpenses(previous)
      sparkType = 'expense'
      break
    case 'profit':
      value = getNetProfit(current)
      previousValue = getNetProfit(previous)
      sparkType = 'net'
      break
    case 'cash': {
      const beforeCurrent = transactions.filter(
        (t) => parseISO(t.date) < range.from,
      )
      const beforePrev = transactions.filter(
        (t) => parseISO(t.date) < prevRange.from,
      )
      value = getCashBalance(beforeCurrent, openingBalance) + getNetProfit(current)
      previousValue =
        getCashBalance(beforePrev, openingBalance) + getNetProfit(previous)
      sparkType = 'balance'
      break
    }
  }

  return {
    value,
    previousValue,
    changePercent: changePercent(value, previousValue),
    sparkline: sparklineFromTransactions(current, range, sparkType),
  }
}

export function buildCashFlowSeries(
  transactions: Transaction[],
  range: DateRange,
  granularity: ChartGranularity,
  openingBalance = 4500000,
): CashFlowPoint[] {
  const keys = getBucketKeys(range, granularity)
  const before = transactions.filter((t) => parseISO(t.date) < range.from)
  let balance = getCashBalance(before, openingBalance)

  return keys.map((key) => {
    const inBucket = filterByDateRange(transactions, range).filter(
      (t) => getBucketKey(t.date, granularity) === key,
    )
    const revenue = getTotalRevenue(inBucket)
    const expenses = getTotalExpenses(inBucket)
    const net = revenue - expenses
    balance += net
    return { date: key, revenue, expenses, net, balance, isForecast: false }
  })
}

export function getExpenseBreakdown(
  transactions: Transaction[],
): CategoryBreakdown[] {
  const expenses = transactions.filter((t) => t.type === 'expense')
  const total = getTotalExpenses(expenses)
  const byCategory = new Map<string, number>()

  for (const t of expenses) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
  }

  return Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total === 0 ? 0 : (amount / total) * 100,
      color: CATEGORY_COLORS[category] ?? '#8993A3',
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function getFinancialHealth(
  transactions: Transaction[],
  range: DateRange,
  openingBalance = 4500000,
): FinancialHealth {
  const current = filterByDateRange(transactions, range)
  const prevRange = getPreviousPeriodRange(range)
  const previous = filterByDateRange(transactions, prevRange)

  const revenue = getTotalRevenue(current)
  const expenses = getTotalExpenses(current)
  const profit = revenue - expenses
  const prevRevenue = getTotalRevenue(previous)

  const beforeCurrent = transactions.filter((t) => parseISO(t.date) < range.from)
  const cash = getCashBalance(beforeCurrent, openingBalance) + profit

  const days = daysBetween(range.from, range.to)
  const dailyBurn = days > 0 ? (expenses - revenue) / days : 0

  const isCashGrowing = dailyBurn <= 0
  const cashRunwayDays =
    !isCashGrowing && dailyBurn > 0 ? Math.floor(cash / dailyBurn) : null

  return {
    profitMargin: revenue === 0 ? 0 : (profit / revenue) * 100,
    expenseToRevenue: revenue === 0 ? 0 : (expenses / revenue) * 100,
    revenueGrowth: changePercent(revenue, prevRevenue),
    cashRunwayDays,
    isCashGrowing,
  }
}

export function getBudgetSpent(
  transactions: Transaction[],
  budget: Budget,
  referenceDate: Date = new Date(),
): number {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  return transactions
    .filter((t) => {
      if (t.type !== 'expense' || t.category !== budget.category) return false
      const d = parseISO(t.date)
      if (budget.period === 'yearly') return d.getFullYear() === year
      return d.getFullYear() === year && d.getMonth() === month
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

export function monthlyEquivalent(
  amount: number,
  frequency: RecurringExpense['frequency'],
): number {
  switch (frequency) {
    case 'weekly':
      return Math.round((amount * 52) / 12)
    case 'monthly':
      return amount
    case 'quarterly':
      return Math.round(amount / 3)
    case 'yearly':
      return Math.round(amount / 12)
  }
}

export function getTotalMonthlyRecurring(items: RecurringExpense[]): number {
  return items
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.frequency), 0)
}

export function generateForecast(
  transactions: Transaction[],
  recurring: RecurringExpense[],
  assumptions: ForecastAssumptions,
  openingBalance = 4500000,
  referenceDate: Date = new Date(),
): ForecastResult {
  const lookbackDays = 90
  const lookbackFrom = addDays(referenceDate, -lookbackDays)
  const historical = transactions.filter((t) => {
    const d = parseISO(t.date)
    return d >= lookbackFrom && d <= referenceDate
  })

  const totalRevenue = getTotalRevenue(historical)
  const totalExpenses = getTotalExpenses(historical)
  const avgDailyRevenue = totalRevenue / lookbackDays
  const avgDailyExpenses = totalExpenses / lookbackDays

  const monthlyRecurring = getTotalMonthlyRecurring(recurring)
  const dailyRecurring = monthlyRecurring / 30

  // Non-recurring portion of historical expenses
  const nonRecurringDaily = Math.max(0, avgDailyExpenses - dailyRecurring)

  const before = transactions.filter((t) => parseISO(t.date) <= referenceDate)
  let balance = getCashBalance(before, openingBalance)

  const points: CashFlowPoint[] = []
  let low = balance
  let high = balance
  const startBalance = balance

  const revGrowthDaily = assumptions.revenueGrowthPercent / 100 / 365
  const expGrowthDaily = assumptions.expenseGrowthPercent / 100 / 365

  let bucketRevenue = 0
  let bucketExpenses = 0

  for (let i = 1; i <= assumptions.durationDays; i++) {
    const date = addDays(referenceDate, i)
    const growthFactorRev = 1 + revGrowthDaily * i
    const growthFactorExp = 1 + expGrowthDaily * i

    const revenue = Math.round(avgDailyRevenue * growthFactorRev)
    const expenses = Math.round(
      nonRecurringDaily * growthFactorExp + dailyRecurring,
    )
    const net = revenue - expenses
    balance += net
    bucketRevenue += revenue
    bucketExpenses += expenses

    low = Math.min(low, balance)
    high = Math.max(high, balance)

    // Aggregate weekly for readability when duration > 30
    const shouldPush =
      assumptions.durationDays <= 30 ||
      i % 7 === 0 ||
      i === assumptions.durationDays

    if (shouldPush) {
      points.push({
        date: toISODate(date),
        revenue: bucketRevenue,
        expenses: bucketExpenses,
        net: bucketRevenue - bucketExpenses,
        balance,
        isForecast: true,
      })
      bucketRevenue = 0
      bucketExpenses = 0
    }
  }

  return {
    points,
    projectedEndingCash: balance,
    expectedLow: low,
    expectedHigh: high,
    projectedNet: balance - startBalance,
  }
}

export { CATEGORY_COLORS }
