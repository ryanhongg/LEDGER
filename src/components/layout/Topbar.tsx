import { Menu, Search, Bell, Download } from 'lucide-react'
import { useLedgerStore } from '@/store/useLedgerStore'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface TopbarProps {
  title: string
  breadcrumb?: string
  showDateRange?: boolean
  onExport?: () => void
  actions?: React.ReactNode
  searchPlaceholder?: string
  onSearchClick?: () => void
}

export function Topbar({
  title,
  breadcrumb,
  showDateRange = true,
  onExport,
  actions,
  onSearchClick,
}: TopbarProps) {
  const setMobileSidebarOpen = useLedgerStore((s) => s.setMobileSidebarOpen)
  const addToast = useLedgerStore((s) => s.addToast)

  return (
    <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-border no-print">
      <div className="flex items-center gap-3 h-14 px-4 lg:px-6">
        <button
          className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:bg-white hover:text-text cursor-pointer"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          {breadcrumb && (
            <div className="text-[11px] text-text-secondary mb-0.5 truncate">
              {breadcrumb}
            </div>
          )}
          <h1 className="text-[15px] font-semibold text-text tracking-[-0.01em] truncate">
            {title}
          </h1>
        </div>

        <div className="flex-1" />

        {showDateRange && (
          <div className="hidden md:block">
            <DateRangePicker />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded-[10px]',
                'text-text-secondary hover:bg-white hover:text-text border border-transparent hover:border-border transition-colors cursor-pointer',
              )}
              title="Search"
            >
              <Search size={16} />
            </button>
          )}

          <button
            onClick={() => addToast('No new notifications', 'info')}
            className={cn(
              'relative h-9 w-9 flex items-center justify-center rounded-[10px]',
              'text-text-secondary hover:bg-white hover:text-text border border-transparent hover:border-border transition-colors cursor-pointer',
            )}
            title="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />
          </button>

          {onExport && (
            <Button variant="secondary" size="sm" onClick={onExport}>
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          {actions}
        </div>
      </div>

      {showDateRange && (
        <div className="md:hidden px-4 pb-3">
          <DateRangePicker />
        </div>
      )}
    </header>
  )
}
