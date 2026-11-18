import { cn } from '@/utils/cn'

type BadgeVariant = 'default' | 'positive' | 'negative' | 'amber' | 'accent' | 'neutral'

const styles: Record<BadgeVariant, string> = {
  default: 'bg-bg text-text-secondary border-border',
  positive: 'bg-positive-soft text-positive border-positive/15',
  negative: 'bg-negative-soft text-negative border-negative/15',
  amber: 'bg-amber-soft text-amber border-amber/20',
  accent: 'bg-accent-soft text-accent border-accent/15',
  neutral: 'bg-[#F0F2F5] text-neutral border-border',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
