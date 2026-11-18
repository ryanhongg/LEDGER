import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary">
          {icon}
        </div>
      )}
      <h4 className="text-[14px] font-semibold text-text">{title}</h4>
      {description && (
        <p className="text-[12px] text-text-secondary mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
