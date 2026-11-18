import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1.5 min-w-[180px] py-1 bg-surface border border-border rounded-[10px] shadow-[var(--shadow-md)] animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                item.onClick()
                setOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors cursor-pointer',
                item.danger
                  ? 'text-negative hover:bg-negative-soft'
                  : 'text-text hover:bg-bg',
                item.disabled && 'opacity-40 pointer-events-none',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
  placeholder?: string
}

export function Select({ value, onChange, options, className, placeholder }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-9 px-3 text-[13px] bg-white border border-border rounded-[10px] text-text',
        'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50',
        'cursor-pointer appearance-none',
        className,
      )}
    >
      {placeholder && (
        <option value="">{placeholder}</option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full px-3 text-[13px] bg-white border border-border rounded-[10px] text-text',
        'placeholder:text-text-secondary/70',
        'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50',
        className,
      )}
      {...props}
    />
  )
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 text-[13px] bg-white border border-border rounded-[10px] text-text',
        'placeholder:text-text-secondary/70 resize-none',
        'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50',
        className,
      )}
      {...props}
    />
  )
}

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-[12px] font-medium text-text mb-1.5', className)}
    >
      {children}
    </label>
  )
}
