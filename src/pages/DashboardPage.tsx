import { useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { KPICard } from '@/components/dashboard/KPICard'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { ExpenseBreakdown } from '@/components/dashboard/ExpenseBreakdown'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { FinancialHealth } from '@/components/dashboard/FinancialHealth'
import { useLedgerStore } from '@/store/useLedgerStore'
import { computeKPI } from '@/utils/calculations'
import { greetingForTime } from '@/utils/dates'
import { exportTransactions } from '@/services/exportService'

export function DashboardPage() {
  const transactions = useLedgerStore((s) => s.transactions)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const settings = useLedgerStore((s) => s.settings)
  const getDateRange = useLedgerStore((s) => s.getDateRange)

  const range = getDateRange()
  const firstName = settings.userName.split(' ')[0]

  const kpis = useMemo(
    () => ({
      revenue: computeKPI(transactions, range, 'revenue', openingBalance),
      expenses: computeKPI(transactions, range, 'expenses', openingBalance),
      profit: computeKPI(transactions, range, 'profit', openingBalance),
      cash: computeKPI(transactions, range, 'cash', openingBalance),
    }),
    [transactions, range, openingBalance],
  )

  return (
    <>
      <Topbar
        title="Dashboard"
        breadcrumb="Overview"
        onExport={() => exportTransactions(transactions)}
      />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-text">
            {greetingForTime()}, {firstName}
          </h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Here's your business financial overview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <KPICard label="Total Revenue" metric={kpis.revenue} />
          <KPICard label="Total Expenses" metric={kpis.expenses} invertChange />
          <KPICard label="Net Profit" metric={kpis.profit} />
          <KPICard label="Cash Balance" metric={kpis.cash} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <div className="xl:col-span-2">
            <CashFlowChart />
          </div>
          <ExpenseBreakdown />
        </div>

        <div className="mb-4">
          <FinancialHealth />
        </div>

        <RecentTransactions />
      </PageContainer>
    </>
  )
}
