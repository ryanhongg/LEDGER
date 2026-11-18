import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import { formatPercent } from '@/utils/currency'
import { useMoney } from '@/hooks/useMoney'
import { cn } from '@/utils/cn'
import type { KPIMetric } from '@/types'

interface KPICardProps {
  label: string
  metric: KPIMetric
  invertChange?: boolean
}

export function KPICard({ label, metric, invertChange = false }: KPICardProps) {
  const { format: formatCurrency } = useMoney()
  const isPositive = metric.changePercent > 0
  const isNeutral = Math.abs(metric.changePercent) < 0.05
  const good = invertChange ? !isPositive : isPositive

  const sparkData = metric.sparkline.map((v, i) => ({ i, v }))
  const sparkColor = good || isNeutral ? '#159B70' : '#DC5757'

  return (
    <Card className="relative overflow-hidden">
      <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary mb-2">
        {label}
      </div>
      <div className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-text leading-none mb-3">
        {formatCurrency(metric.value)}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            'inline-flex items-center gap-1 text-[12px] font-medium',
            isNeutral
              ? 'text-neutral'
              : good
                ? 'text-positive'
                : 'text-negative',
          )}
        >
          {isNeutral ? (
            <Minus size={13} />
          ) : isPositive ? (
            <TrendingUp size={13} />
          ) : (
            <TrendingDown size={13} />
          )}
          <span className="tabular-nums">{formatPercent(metric.changePercent)}</span>
          <span className="text-text-secondary font-normal">vs prior</span>
        </div>
        <div className="w-20 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
