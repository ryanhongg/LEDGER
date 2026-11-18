import { useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode
  children: ReactNode
  className?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[11px] leading-snug text-white bg-[#17191D] rounded-lg shadow-md whitespace-nowrap max-w-[220px] pointer-events-none animate-fade-in">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#17191D]" />
        </span>
      )}
    </span>
  )
}
