import { describe, it, expect } from 'vitest'
import {
  getTotalRevenue,
  getTotalExpenses,
  getNetProfit,
  getCashBalance,
  getExpenseBreakdown,
  getBudgetSpent,
  monthlyEquivalent,
  getTotalMonthlyRecurring,
  generateForecast,
  changePercent,
  filterByDateRange,
} from './calculations'
import { dollarsToCents } from './currency'
import type { Transaction, Budget, RecurringExpense } from '@/types'
import { getDateRange } from './dates'

const txs: Transaction[] = [
  {
    id: '1',
    description: 'Client A',
    amount: dollarsToCents(1000),
    type: 'income',
    category: 'Client Payment',
    date: '2026-10-01',
    paymentMethod: 'ACH',
  },
  {
    id: '2',
    description: 'Client B',
    amount: dollarsToCents(500),
    type: 'income',
    category: 'Consulting',
    date: '2026-10-15',
    paymentMethod: 'Wire Transfer',
  },
  {
    id: '3',
    description: 'Rent',
    amount: dollarsToCents(400),
    type: 'expense',
    category: 'Rent',
    date: '2026-10-05',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: '4',
    description: 'Ads',
    amount: dollarsToCents(200),
    type: 'expense',
    category: 'Marketing',
    date: '2026-10-20',
    paymentMethod: 'Credit Card',
  },
  {
    id: '5',
    description: 'Software',
    amount: dollarsToCents(100),
    type: 'expense',
    category: 'Software',
    date: '2026-09-10',
    paymentMethod: 'Credit Card',
  },
]

describe('financial calculations', () => {
  it('computes total revenue in cents', () => {
    expect(getTotalRevenue(txs)).toBe(dollarsToCents(1500))
  })

  it('computes total expenses in cents', () => {
    expect(getTotalExpenses(txs)).toBe(dollarsToCents(700))
  })

  it('computes net profit', () => {
    expect(getNetProfit(txs)).toBe(dollarsToCents(800))
  })

  it('computes cash balance from opening', () => {
    expect(getCashBalance(txs, dollarsToCents(1000))).toBe(dollarsToCents(1800))
  })

  it('builds category expense totals', () => {
    const breakdown = getExpenseBreakdown(txs)
    expect(breakdown.find((b) => b.category === 'Rent')?.amount).toBe(
      dollarsToCents(400),
    )
    const totalPct = breakdown.reduce((s, b) => s + b.percent, 0)
    expect(totalPct).toBeCloseTo(100, 0)
  })

  it('filters by date range', () => {
    const range = {
      from: new Date('2026-10-01'),
      to: new Date('2026-10-31T23:59:59'),
      period: 'custom' as const,
    }
    const filtered = filterByDateRange(txs, range)
    expect(filtered).toHaveLength(4)
    expect(filtered.every((t) => t.date.startsWith('2026-10'))).toBe(true)
  })

  it('computes budget usage from transactions', () => {
    const budget: Budget = {
      id: 'b1',
      name: 'Marketing',
      category: 'Marketing',
      limit: dollarsToCents(500),
      period: 'monthly',
    }
    const spent = getBudgetSpent(txs, budget, new Date('2026-10-15'))
    expect(spent).toBe(dollarsToCents(200))
  })

  it('normalizes recurring frequencies to monthly', () => {
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100)
    expect(monthlyEquivalent(100, 'monthly')).toBe(100)
    expect(monthlyEquivalent(300, 'quarterly')).toBe(100)
    expect(monthlyEquivalent(100, 'weekly')).toBe(Math.round((100 * 52) / 12))
  })

  it('sums active recurring monthly equivalents', () => {
    const items: RecurringExpense[] = [
      {
        id: '1',
        name: 'Rent',
        amount: dollarsToCents(1000),
        category: 'Rent',
        frequency: 'monthly',
        nextPaymentDate: '2026-11-01',
        status: 'active',
      },
      {
        id: '2',
        name: 'Paused sub',
        amount: dollarsToCents(50),
        category: 'Software',
        frequency: 'monthly',
        nextPaymentDate: '2026-11-01',
        status: 'paused',
      },
    ]
    expect(getTotalMonthlyRecurring(items)).toBe(dollarsToCents(1000))
  })

  it('generates forecast with projected metrics', () => {
    const result = generateForecast(
      txs,
      [
        {
          id: '1',
          name: 'Rent',
          amount: dollarsToCents(400),
          category: 'Rent',
          frequency: 'monthly',
          nextPaymentDate: '2026-11-01',
          status: 'active',
        },
      ],
      { revenueGrowthPercent: 5, expenseGrowthPercent: 2, durationDays: 30 },
      dollarsToCents(5000),
      new Date('2026-10-31'),
    )
    expect(result.points.length).toBeGreaterThan(0)
    expect(typeof result.projectedEndingCash).toBe('number')
    expect(result.expectedHigh).toBeGreaterThanOrEqual(result.expectedLow)
  })

  it('computes change percent safely', () => {
    expect(changePercent(110, 100)).toBeCloseTo(10)
    expect(changePercent(50, 0)).toBe(100)
    expect(changePercent(0, 0)).toBe(0)
  })

  it('getDateRange returns last30 span', () => {
    const range = getDateRange('last30', undefined, undefined, new Date(2026, 10, 12))
    expect(range.from.getFullYear()).toBe(2026)
    expect(range.from.getMonth()).toBe(9) // October (29 days before Nov 12)
    expect(range.from.getDate()).toBe(14)
    expect(range.to.getMonth()).toBe(10)
    expect(range.to.getDate()).toBe(12)
  })
})
