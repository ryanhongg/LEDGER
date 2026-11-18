import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[12px] shadow-[var(--shadow-sm)]',
        padded && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h3 className="text-[15px] font-semibold text-text tracking-[-0.01em]">{title}</h3>
        {subtitle && (
          <p className="text-[12px] text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
