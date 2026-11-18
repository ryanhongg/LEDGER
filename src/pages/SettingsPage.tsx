import { useEffect, useMemo, useState } from 'react'
import { Download, RotateCcw, PlugZap } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Label } from '@/components/ui/Dropdown'
import { ConfirmDialog } from '@/components/ui/Modal'
import { MarketDataStatus } from '@/components/investments/MarketDataStatus'
import { useLedgerStore } from '@/store/useLedgerStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { exportAllData } from '@/services/exportService'
import { computeCompanyPosition } from '@/services/accounting/InvestmentAccountingService'
import { valuePortfolio } from '@/services/investments/ValuationService'
import {
  testMarketConnection,
  type ConnectionTestResult,
} from '@/services/marketData/MarketDataService'
import { formatCurrency } from '@/utils/currency'
import type { DatePeriod } from '@/types'

export function SettingsPage() {
  const settings = useLedgerStore((s) => s.settings)
  const transactions = useLedgerStore((s) => s.transactions)
  const budgets = useLedgerStore((s) => s.budgets)
  const recurring = useLedgerStore((s) => s.recurring)
  const openingBalance = useLedgerStore((s) => s.openingBalance)
  const updateSettings = useLedgerStore((s) => s.updateSettings)
  const resetDemoData = useLedgerStore((s) => s.resetDemoData)
  const resetDemoInvestments = useInvestmentStore((s) => s.resetDemoInvestments)
  const marketStatus = useInvestmentStore((s) => s.marketStatus)
  const streamState = useInvestmentStore((s) => s.streamState)
  const refreshMarketStatus = useInvestmentStore((s) => s.refreshMarketStatus)
  const refreshQuotes = useInvestmentStore((s) => s.refreshQuotes)
  const startMarketStream = useInvestmentStore((s) => s.startMarketStream)
  const quotes = useInvestmentStore((s) => s.quotes)
  const portfolios = useInvestmentStore((s) => s.portfolios)
  const invTxns = useInvestmentStore((s) => s.transactions)
  const lots = useInvestmentStore((s) => s.lots)
  const securities = useInvestmentStore((s) => s.securities)
  const realizedByTxn = useInvestmentStore((s) => s.realizedByTxn)
  const capitalTransfers = useInvestmentStore((s) => s.capitalTransfers)

  const [form, setForm] = useState({ ...settings })
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmInvReset, setConfirmInvReset] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)

  const position = useMemo(() => {
    const valuations = portfolios.map((p) =>
      valuePortfolio(p, invTxns, lots, securities, quotes, realizedByTxn),
    )
    return computeCompanyPosition({
      openingBalanceCents: openingBalance,
      operatingTransactions: transactions,
      transfers: capitalTransfers,
      valuations,
    })
  }, [
    portfolios,
    invTxns,
    lots,
    securities,
    quotes,
    realizedByTxn,
    capitalTransfers,
    openingBalance,
    transactions,
  ])

  useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const save = () => {
    updateSettings(form)
    if (form.defaultPeriod !== settings.defaultPeriod) {
      useLedgerStore.getState().setDatePeriod(form.defaultPeriod)
    }
  }

  return (
    <>
      <Topbar title="Settings" breadcrumb="Settings" showDateRange={false} />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Settings</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Manage business profile, preferences, and data.
          </p>
        </div>

        <div className="max-w-2xl space-y-4">
          <Card>
            <CardHeader title="Business profile" subtitle="Workspace identity and fiscal settings" />
            <div className="space-y-3">
              <div>
                <Label>Business name</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                />
              </div>
              <div>
                <Label>Business type</Label>
                <Input
                  value={form.businessType}
                  onChange={(e) => set('businessType', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onChange={(v) => set('currency', v)}
                    options={[
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'EUR', label: 'EUR — Euro' },
                      { value: 'GBP', label: 'GBP — British Pound' },
                      { value: 'CAD', label: 'CAD — Canadian Dollar' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Fiscal year start (month)</Label>
                  <Select
                    value={String(form.fiscalYearStart)}
                    onChange={(v) => set('fiscalYearStart', Number(v))}
                    options={Array.from({ length: 12 }, (_, i) => ({
                      value: String(i + 1),
                      label: new Date(2026, i, 1).toLocaleString('en', { month: 'long' }),
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Your name</Label>
                  <Input
                    value={form.userName}
                    onChange={(e) => set('userName', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={form.userRole}
                    onChange={(e) => set('userRole', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Preferences" subtitle="Default views and formatting" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Default dashboard period</Label>
                  <Select
                    value={form.defaultPeriod}
                    onChange={(v) => set('defaultPeriod', v as DatePeriod)}
                    options={[
                      { value: 'last7', label: 'Last 7 days' },
                      { value: 'last30', label: 'Last 30 days' },
                      { value: 'last90', label: 'Last 90 days' },
                      { value: 'thisYear', label: 'This year' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Number formatting</Label>
                  <Select
                    value={form.numberFormat}
                    onChange={(v) => set('numberFormat', v as 'standard' | 'compact')}
                    options={[
                      { value: 'standard', label: 'Standard ($1,234.56)' },
                      { value: 'compact', label: 'Compact ($1.2K)' },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <Label>Theme preference</Label>
                <Select
                  value={form.theme}
                  onChange={(v) => set('theme', v as 'light' | 'system')}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'system', label: 'System' },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={save}>Save settings</Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Market data connection"
              subtitle="Tiingo API key is read only from the server .env — never sent to the browser"
            />
            <div className="space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase text-text-secondary">Provider</div>
                  <div className="font-semibold">{marketStatus?.provider ?? 'tiingo'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-text-secondary">Mode</div>
                  <div className="font-semibold">
                    {marketStatus?.configured ? 'Live proxy' : 'Demo'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-text-secondary">WebSocket</div>
                  <div className="font-semibold">{streamState}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-text-secondary">Latest quote</div>
                  <div className="font-semibold text-[12px] tabular-nums">
                    {Object.values(quotes)
                      .filter((q) => !q.isDemo)
                      .map((q) => q.timestamp)
                      .sort()
                      .at(-1)
                      ? new Date(
                          Object.values(quotes)
                            .filter((q) => !q.isDemo)
                            .map((q) => q.timestamp)
                            .sort()
                            .at(-1)!,
                        ).toLocaleString()
                      : '—'}
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-text-secondary">{marketStatus?.note}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={testing}
                  onClick={() => {
                    setTesting(true)
                    setTestResult(null)
                    void (async () => {
                      const result = await testMarketConnection()
                      setTestResult(result)
                      await refreshMarketStatus()
                      if (result.ok) {
                        await refreshQuotes()
                        startMarketStream()
                      }
                      setTesting(false)
                    })()
                  }}
                >
                  <PlugZap size={14} />
                  {testing ? 'Testing…' : 'Test connection'}
                </Button>
                <MarketDataStatus />
              </div>
              {testResult && (
                <div
                  className={`rounded-[10px] border px-3 py-2 text-[12px] ${
                    testResult.ok
                      ? 'border-positive/20 bg-positive-soft text-positive'
                      : 'border-negative/20 bg-negative-soft text-negative'
                  }`}
                >
                  {testResult.ok ? (
                    <>
                      {testResult.message}{' '}
                      {testResult.quote && (
                        <span className="tabular-nums">
                          {testResult.quote.symbol} ${testResult.quote.price.toFixed(2)} ·{' '}
                          {testResult.quote.freshness} ·{' '}
                          {new Date(testResult.quote.timestamp).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {testResult.error?.code}: {testResult.error?.message}
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Company financial position"
              subtitle="Operating vs investment capital (simplified internal bookkeeping)"
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase text-text-secondary">Operating cash</div>
                <div className="text-[18px] font-semibold tabular-nums">{formatCurrency(position.operatingCashCents)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-text-secondary">Investment cash</div>
                <div className="text-[18px] font-semibold tabular-nums">{formatCurrency(position.investmentCashCents)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-text-secondary">Securities MV</div>
                <div className="text-[18px] font-semibold tabular-nums">{formatCurrency(position.securitiesMarketValueCents)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-text-secondary">Total liquid assets</div>
                <div className="text-[18px] font-semibold tabular-nums">{formatCurrency(position.totalLiquidAssetsCents)}</div>
              </div>
            </div>
            <ul className="text-[11px] text-text-secondary space-y-1 list-disc pl-4">
              {position.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div className="mt-3">
              <MarketDataStatus />
            </div>
          </Card>

          <Card>
            <CardHeader title="Data management" subtitle="Export, reset, and restore demo data" />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-3 rounded-[10px] border border-border bg-bg/40">
                <div>
                  <div className="text-[13px] font-medium">Export operating data</div>
                  <div className="text-[12px] text-text-secondary">
                    Download a JSON backup of transactions, budgets, recurring items, and settings.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    exportAllData({
                      transactions,
                      budgets,
                      recurring,
                      settings,
                      openingBalance,
                    })
                  }
                >
                  <Download size={14} />
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 rounded-[10px] border border-negative/20 bg-negative-soft/40">
                <div>
                  <div className="text-[13px] font-medium">Reset operating demo data</div>
                  <div className="text-[12px] text-text-secondary">
                    Restore business transactions, budgets, and settings.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
                  <RotateCcw size={14} />
                  Reset ops
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 rounded-[10px] border border-negative/20 bg-negative-soft/40">
                <div>
                  <div className="text-[13px] font-medium">Reset investment demo data</div>
                  <div className="text-[12px] text-text-secondary">
                    Restore Core + Growth portfolios, trades, lots, and watchlists.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => setConfirmInvReset(true)}>
                  <RotateCcw size={14} />
                  Reset investments
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset operating demo data"
        message="This will replace business transactions, budgets, recurring expenses, and settings with the original sample dataset."
        confirmLabel="Reset ops data"
        onConfirm={resetDemoData}
      />
      <ConfirmDialog
        open={confirmInvReset}
        onClose={() => setConfirmInvReset(false)}
        title="Reset investment demo data"
        message="This will replace portfolios, investment trades, lots, and research with the seeded investment dataset."
        confirmLabel="Reset investments"
        onConfirm={resetDemoInvestments}
      />
    </>
  )
}
