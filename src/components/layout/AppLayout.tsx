import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'
import { useLedgerStore } from '@/store/useLedgerStore'
import { cn } from '@/utils/cn'

export function AppLayout() {
  const collapsed = useLedgerStore((s) => s.sidebarCollapsed)

  return (
    <div className="flex h-full min-h-screen bg-bg">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 min-h-screen transition-[margin] duration-200',
        )}
        style={{ marginLeft: 0 }}
        data-collapsed={collapsed}
      >
        <Outlet />
      </div>
      <ToastContainer />
    </div>
  )
}
