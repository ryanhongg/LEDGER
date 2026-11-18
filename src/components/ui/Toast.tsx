import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useLedgerStore } from '@/store/useLedgerStore'
import { cn } from '@/utils/cn'

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const styles = {
  success: 'border-positive/20 bg-white',
  error: 'border-negative/20 bg-white',
  info: 'border-accent/20 bg-white',
}

const iconStyles = {
  success: 'text-positive',
  error: 'text-negative',
  info: 'text-accent',
}

export function ToastContainer() {
  const toasts = useLedgerStore((s) => s.toasts)
  const removeToast = useLedgerStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 no-print">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'animate-toast flex items-center gap-2.5 min-w-[260px] max-w-sm px-3.5 py-3',
              'bg-surface border rounded-[10px] shadow-[var(--shadow-md)]',
              styles[toast.type],
            )}
          >
            <Icon size={16} className={iconStyles[toast.type]} />
            <span className="flex-1 text-[13px] text-text">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 text-text-secondary hover:text-text cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
