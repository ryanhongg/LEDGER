import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  Repeat,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  X,
  LineChart,
  Briefcase,
  Layers,
  BookOpen,
  CandlestickChart,
  FlaskConical,
  PieChart,
} from 'lucide-react'
import { useLedgerStore } from '@/store/useLedgerStore'
import { cn } from '@/utils/cn'
import { Dropdown } from '@/components/ui/Dropdown'

const NAV = [
  {
    section: 'OVERVIEW',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'BUSINESS FINANCES',
    items: [
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/cash-flow', label: 'Cash Flow', icon: TrendingUp },
      { to: '/budgets', label: 'Budgets', icon: Wallet },
      { to: '/recurring', label: 'Recurring Expenses', icon: Repeat },
    ],
  },
  {
    section: 'INVESTMENT MANAGEMENT',
    items: [
      { to: '/investments', label: 'Investment Overview', icon: LineChart },
      { to: '/investments/portfolios', label: 'Portfolios', icon: Briefcase },
      { to: '/investments/holdings', label: 'Holdings', icon: Layers },
      { to: '/investments/transactions', label: 'Trade Ledger', icon: BookOpen },
      { to: '/investments/market-data', label: 'Market Data', icon: CandlestickChart },
      { to: '/investments/analytics', label: 'Quantitative Analytics', icon: FlaskConical },
      { to: '/investments/research', label: 'Research', icon: PieChart },
    ],
  },
  {
    section: 'REPORTING',
    items: [{ to: '/reports', label: 'Reports', icon: BarChart3 }],
  },
  {
    section: 'SETTINGS',
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
]

export function Sidebar() {
  const settings = useLedgerStore((s) => s.settings)
  const collapsed = useLedgerStore((s) => s.sidebarCollapsed)
  const setCollapsed = useLedgerStore((s) => s.setSidebarCollapsed)
  const mobileOpen = useLedgerStore((s) => s.mobileSidebarOpen)
  const setMobileOpen = useLedgerStore((s) => s.setMobileSidebarOpen)
  const navigate = useNavigate()

  const content = (
    <aside
      className={cn(
        'h-full flex flex-col bg-surface border-r border-border transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-[245px]',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0', collapsed && 'justify-center px-2')}>
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="2" rx="0.5" fill="white" />
            <rect x="1" y="6" width="9" height="2" rx="0.5" fill="white" />
            <rect x="1" y="10" width="10.5" height="2" rx="0.5" fill="white" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-text">
            LEDGER
          </span>
        )}
        <button
          className="ml-auto lg:hidden p-1 text-text-secondary cursor-pointer"
          onClick={() => setMobileOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 py-3 border-b border-border">
          <Dropdown
            align="left"
            trigger={
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-bg transition-colors">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <Building2 size={15} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-semibold text-text truncate">
                    {settings.businessName}
                  </div>
                  <div className="text-[11px] text-text-secondary truncate">
                    {settings.businessType}
                  </div>
                </div>
                <ChevronDown size={14} className="text-text-secondary shrink-0" />
              </div>
            }
            items={[
              {
                label: 'Workspace settings',
                onClick: () => navigate('/settings'),
                icon: <Settings size={14} />,
              },
              {
                label: 'Investment overview',
                onClick: () => navigate('/investments'),
                icon: <LineChart size={14} />,
              },
            ]}
          />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-[0.06em] text-neutral">
                {group.section}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/investments'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-text-secondary hover:bg-bg hover:text-text',
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={16}
                        className={isActive ? 'text-accent' : 'text-neutral'}
                        strokeWidth={isActive ? 2.25 : 1.75}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="hidden lg:flex px-2.5 pb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 w-full h-8 px-2.5 rounded-lg text-[12px] text-text-secondary hover:bg-bg hover:text-text transition-colors cursor-pointer',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div className={cn('border-t border-border p-3', collapsed && 'px-2')}>
        <Dropdown
          align="left"
          trigger={
            <div
              className={cn(
                'flex items-center gap-2.5 px-2 py-2 rounded-[10px] hover:bg-bg transition-colors',
                collapsed && 'justify-center px-0',
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-[#6B8AF0] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
                {settings.userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[12px] font-semibold text-text truncate">
                      {settings.userName}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      {settings.userRole}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-text-secondary" />
                </>
              )}
            </div>
          }
          items={[
            { label: 'Account settings', onClick: () => navigate('/settings') },
            {
              label: 'Reset demo data',
              onClick: () => useLedgerStore.getState().resetDemoData(),
              danger: true,
            },
          ]}
        />
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:block h-full shrink-0 sticky top-0">{content}</div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-[#17191D]/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full animate-slide-in">{content}</div>
        </div>
      )}
    </>
  )
}
