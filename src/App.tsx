import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { CashFlowPage } from '@/pages/CashFlowPage'
import { BudgetsPage } from '@/pages/BudgetsPage'
import { RecurringPage } from '@/pages/RecurringPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { InvestmentOverviewPage } from '@/pages/investments/InvestmentOverviewPage'
import { PortfoliosPage } from '@/pages/investments/PortfoliosPage'
import { HoldingsPage } from '@/pages/investments/HoldingsPage'
import { InvestmentTransactionsPage } from '@/pages/investments/InvestmentTransactionsPage'
import { MarketDataPage } from '@/pages/investments/MarketDataPage'
import { QuantitativeAnalyticsPage } from '@/pages/investments/QuantitativeAnalyticsPage'
import { ResearchPage } from '@/pages/investments/ResearchPage'
import { useLedgerStore } from '@/store/useLedgerStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'

export default function App() {
  const hydrate = useLedgerStore((s) => s.hydrate)
  const hydrateInvestments = useInvestmentStore((s) => s.hydrate)
  const theme = useLedgerStore((s) => s.settings.theme)

  useEffect(() => {
    hydrate()
    hydrateInvestments()
  }, [hydrate, hydrateInvestments])

  useEffect(() => {
    const root = document.documentElement
    const apply = (dark: boolean) => {
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
    }
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)
      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    apply(false)
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/cash-flow" element={<CashFlowPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/investments" element={<InvestmentOverviewPage />} />
          <Route path="/investments/portfolios" element={<PortfoliosPage />} />
          <Route path="/investments/holdings" element={<HoldingsPage />} />
          <Route path="/investments/transactions" element={<InvestmentTransactionsPage />} />
          <Route path="/investments/market-data" element={<MarketDataPage />} />
          <Route path="/investments/analytics" element={<QuantitativeAnalyticsPage />} />
          <Route path="/investments/research" element={<ResearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
