import { useMemo, useState } from 'react'
import { Plus, Upload, Download } from 'lucide-react'
import Papa from 'papaparse'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Label } from '@/components/ui/Dropdown'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { formatCurrency } from '@/utils/currency'
import { formatDisplayDate } from '@/utils/dates'
import { formatShares, microsToShares, priceMicrosToDollars } from '@/utils/investments/decimal'
import { useLedgerStore } from '@/store/useLedgerStore'

export function InvestmentTransactionsPage() {
  const portfolios = useInvestmentStore((s) => s.portfolios)
  const securities = useInvestmentStore((s) => s.securities)
  const transactions = useInvestmentStore((s) => s.transactions)
  const selected = useInvestmentStore((s) => s.selectedPortfolioId)
  const recordBuy = useInvestmentStore((s) => s.recordBuy)
  const recordSell = useInvestmentStore((s) => s.recordSell)
  const recordDeposit = useInvestmentStore((s) => s.recordDeposit)
  const addToast = useLedgerStore((s) => s.addToast)

  const [typeFilter, setTypeFilter] = useState('')
  const [showTrade, setShowTrade] = useState(false)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '')
  const [securityId, setSecurityId] = useState(securities[0]?.id ?? '')
  const [shares, setShares] = useState('10')
  const [price, setPrice] = useState('100')
  const [fees, setFees] = useState('4.95')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const rows = useMemo(() => {
    let list = [...transactions]
    if (selected !== 'all') list = list.filter((t) => t.portfolioId === selected)
    if (typeFilter) list = list.filter((t) => t.type === typeFilter)
    return list.sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
  }, [transactions, selected, typeFilter])

  const submitTrade = () => {
    try {
      const input = {
        portfolioId,
        securityId,
        tradeDate: date,
        shares: Number(shares),
        priceDollars: Number(price),
        feesDollars: Number(fees) || 0,
      }
      if (side === 'BUY') recordBuy(input)
      else recordSell(input)
      setShowTrade(false)
      addToast(`${side} recorded`, 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Trade failed', 'error')
    }
  }

  const exportCsv = () => {
    const csv = Papa.unparse(
      rows.map((t) => ({
        date: t.tradeDate,
        type: t.type,
        portfolio: portfolios.find((p) => p.id === t.portfolioId)?.name,
        symbol: securities.find((s) => s.id === t.securityId)?.symbol ?? '',
        quantity: microsToShares(t.quantityMicros),
        price: priceMicrosToDollars(t.priceMicros),
        fees: t.feesCents / 100,
        net: t.netAmountCents / 100,
      })),
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'investment-trades.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Topbar
        title="Trade Ledger"
        breadcrumb="Investment Management"
        showDateRange={false}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Download size={14} /> Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const sample = `symbol,type,tradeDate,quantity,price,commission,portfolio\nAAPL,BUY,2025-11-01,5,220.5,4.95,Northstar Core Portfolio\n`
                const blob = new Blob([sample], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'investment-import-template.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Upload size={14} /> Template
            </Button>
            <Button size="sm" onClick={() => setShowTrade(true)}>
              <Plus size={14} /> Record trade
            </Button>
          </>
        }
      />
      <PageContainer>
        <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Trade Ledger</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Investment transactions are separate from operating expenses.
            </p>
          </div>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All types"
            options={['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'].map((t) => ({
              value: t,
              label: t,
            }))}
          />
        </div>

        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] min-w-[800px]">
              <thead className="bg-bg/60 border-b border-border text-text-secondary">
                <tr>
                  {['Date', 'Type', 'Portfolio', 'Symbol', 'Qty', 'Price', 'Fees', 'Net cash'].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-bg/40">
                    <td className="px-3 py-2.5 tabular-nums">{formatDisplayDate(t.tradeDate)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="neutral">{t.type}</Badge>
                    </td>
                    <td className="px-3 py-2.5">{portfolios.find((p) => p.id === t.portfolioId)?.name}</td>
                    <td className="px-3 py-2.5 font-semibold">
                      {securities.find((s) => s.id === t.securityId)?.symbol ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {t.quantityMicros ? formatShares(t.quantityMicros) : '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {t.priceMicros ? `$${priceMicrosToDollars(t.priceMicros).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{formatCurrency(t.feesCents)}</td>
                    <td className={`px-3 py-2.5 tabular-nums font-semibold ${t.netAmountCents >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {formatCurrency(t.netAmountCents, { showSign: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>

      <Modal
        open={showTrade}
        onClose={() => setShowTrade(false)}
        title="Record trade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTrade(false)}>Cancel</Button>
            <Button onClick={submitTrade}>Submit {side}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['BUY', 'SELL'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 h-9 rounded-lg text-[13px] font-medium border cursor-pointer ${
                  side === s ? 'bg-accent-soft border-accent text-accent' : 'border-border'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div>
            <Label>Portfolio</Label>
            <Select
              value={portfolioId}
              onChange={setPortfolioId}
              options={portfolios.map((p) => ({ value: p.id, label: p.name }))}
              className="w-full"
            />
          </div>
          <div>
            <Label>Security</Label>
            <Select
              value={securityId}
              onChange={setSecurityId}
              options={securities.map((s) => ({ value: s.id, label: `${s.symbol} — ${s.name}` }))}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Shares</Label>
              <Input value={shares} onChange={(e) => setShares(e.target.value)} />
            </div>
            <div>
              <Label>Price</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Fees</Label>
              <Input value={fees} onChange={(e) => setFees(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Trade date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                recordDeposit(portfolioId, 1000000, date, 'Manual top-up')
                addToast('Deposit recorded', 'success')
              } catch (e) {
                addToast(e instanceof Error ? e.message : 'Failed', 'error')
              }
            }}
          >
            Quick deposit $10,000 to selected portfolio
          </Button>
        </div>
      </Modal>
    </>
  )
}
