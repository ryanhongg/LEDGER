import { Card } from '@/components/ui/Card'
import { formatCurrency, formatPercent } from '@/utils/currency'
import { cn } from '@/utils/cn'

export function InvestmentKPICard({
  label,
  valueCents,
  changePercent,
  subtitle,
  tone = 'neutral',
}: {
  label: string
  valueCents: number
  changePercent?: number
  subtitle?: string
  tone?: 'neutral' | 'positive' | 'negative'
}) {
  const color =
    tone === 'positive'
      ? 'text-positive'
      : tone === 'negative'
        ? 'text-negative'
        : valueCents < 0
          ? 'text-negative'
          : 'text-text'

  return (
    <Card className="!p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-text-secondary mb-1.5">
        {label}
      </div>
      <div className={cn('text-[22px] font-semibold tabular-nums tracking-[-0.02em]', color)}>
        {formatCurrency(valueCents, { showSign: tone !== 'neutral' && label.toLowerCase().includes('p&l') })}
      </div>
      {(changePercent != null || subtitle) && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-text-secondary">
          {changePercent != null && (
            <span
              className={cn(
                'font-medium tabular-nums',
                changePercent >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {formatPercent(changePercent)}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </Card>
  )
}
