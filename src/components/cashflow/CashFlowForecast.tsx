import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { useLedgerStore } from '@/store/useLedgerStore'
import { generateForecast } from '@/utils/calculations'
import { formatCurrency } from '@/utils/currency'

export function CashFlowForecastMetrics() {
  const transactions = useLedgerStore((s) => s.transactions)
  const recurring = useLedgerStore((s) => s.recurring)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const assumptions = useLedgerStore((s) => s.forecastAssumptions)

  const forecast = useMemo(
    () =>
      generateForecast(
        transactions,
        recurring,
        assumptions,
        openingBalance,
      ),
    [transactions, recurring, assumptions, openingBalance],
  )

  const metrics = [
    { label: 'Projected ending cash', value: forecast.projectedEndingCash },
    { label: 'Expected cash low', value: forecast.expectedLow },
    { label: 'Expected cash high', value: forecast.expectedHigh },
    { label: 'Projected net cash flow', value: forecast.projectedNet, signed: true },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <Card key={m.label}>
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-1.5">
            {m.label}
          </div>
          <div
            className={`text-[22px] font-semibold tabular-nums tracking-[-0.02em] ${
              m.signed
                ? m.value >= 0
                  ? 'text-positive'
                  : 'text-negative'
                : 'text-text'
            }`}
          >
            {formatCurrency(m.value, { showSign: m.signed })}
          </div>
        </Card>
      ))}
    </div>
  )
}
