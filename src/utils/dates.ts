import {
  startOfDay,
  endOfDay,
  subDays,
  startOfYear,
  format,
  parseISO,
  isWithinInterval,
  differenceInCalendarDays,
  addDays,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import type { DatePeriod, DateRange, ChartGranularity } from '@/types'

export function getDateRange(
  period: DatePeriod,
  customFrom?: Date,
  customTo?: Date,
  referenceDate: Date = new Date(),
): DateRange {
  const to = endOfDay(referenceDate)

  switch (period) {
    case 'last7':
      return { from: startOfDay(subDays(referenceDate, 6)), to, period }
    case 'last30':
      return { from: startOfDay(subDays(referenceDate, 29)), to, period }
    case 'last90':
      return { from: startOfDay(subDays(referenceDate, 89)), to, period }
    case 'thisYear':
      return { from: startOfYear(referenceDate), to, period }
    case 'custom':
      return {
        from: startOfDay(customFrom ?? subDays(referenceDate, 29)),
        to: endOfDay(customTo ?? referenceDate),
        period,
      }
  }
}

export function getPreviousPeriodRange(range: DateRange): DateRange {
  const days = differenceInCalendarDays(range.to, range.from) + 1
  const prevTo = endOfDay(subDays(range.from, 1))
  const prevFrom = startOfDay(subDays(prevTo, days - 1))
  return { from: prevFrom, to: prevTo, period: 'custom' }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  const date = parseISO(dateStr)
  return isWithinInterval(date, { start: range.from, end: range.to })
}

export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function formatChartDate(dateStr: string, granularity: ChartGranularity): string {
  const date = parseISO(dateStr)
  switch (granularity) {
    case 'daily':
      return format(date, 'MMM d')
    case 'weekly':
      return format(date, 'MMM d')
    case 'monthly':
      return format(date, 'MMM yyyy')
  }
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function greetingForTime(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getBucketKey(dateStr: string, granularity: ChartGranularity): string {
  const date = parseISO(dateStr)
  switch (granularity) {
    case 'daily':
      return toISODate(date)
    case 'weekly':
      return toISODate(startOfWeek(date, { weekStartsOn: 1 }))
    case 'monthly':
      return toISODate(startOfMonth(date))
  }
}

export function getBucketKeys(range: DateRange, granularity: ChartGranularity): string[] {
  switch (granularity) {
    case 'daily':
      return eachDayOfInterval({ start: range.from, end: range.to }).map(toISODate)
    case 'weekly':
      return eachWeekOfInterval(
        { start: range.from, end: range.to },
        { weekStartsOn: 1 },
      ).map(toISODate)
    case 'monthly':
      return eachMonthOfInterval({ start: range.from, end: range.to }).map(toISODate)
  }
}

export function daysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1
}

export { addDays, subDays, parseISO, format }
