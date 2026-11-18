import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex-1 px-4 lg:px-6 py-5 max-w-[1400px] w-full mx-auto animate-fade-in', className)}>
      {children}
    </div>
  )
}
