import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Label, TextArea } from '@/components/ui/Dropdown'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { usePortfolioValuation } from '@/hooks/usePortfolioValuation'
import { formatCurrency } from '@/utils/currency'
import { dollarsToCents, parseAmountToCents } from '@/utils/currency'
import { valuePortfolio } from '@/services/investments/ValuationService'

export function PortfoliosPage() {
  const portfolios = useInvestmentStore((s) => s.portfolios)
  const transactions = useInvestmentStore((s) => s.transactions)
  const lots = useInvestmentStore((s) => s.lots)
  const securities = useInvestmentStore((s) => s.securities)
  const quotes = useInvestmentStore((s) => s.quotes)
  const realizedByTxn = useInvestmentStore((s) => s.realizedByTxn)
  const addPortfolio = useInvestmentStore((s) => s.addPortfolio)
  const setSelected = useInvestmentStore((s) => s.setSelectedPortfolio)
  const { aggregate } = usePortfolioValuation('all')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cash, setCash] = useState('50000')
  const [benchmark, setBenchmark] = useState('SPY')
  const [strategy, setStrategy] = useState('Core equity')

  return (
    <>
      <Topbar
        title="Portfolios"
        breadcrumb="Investment Management"
        showDateRange={false}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} />
            New portfolio
          </Button>
        }
      />
      <PageContainer>
        <div className="mb-5">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Portfolios</h2>
          <p className="text-[13px] text-text-secondary mt-1">
            Consolidated value {formatCurrency(aggregate.totalValueCents)} across {portfolios.length} portfolios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map((p) => {
            const v = valuePortfolio(p, transactions, lots, securities, quotes, realizedByTxn)
            const ret =
              v.investedCapitalCents === 0
                ? 0
                : ((v.totalValueCents - v.investedCapitalCents) / v.investedCapitalCents) * 100
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">{p.name}</h3>
                    <p className="text-[12px] text-text-secondary mt-0.5">{p.description}</p>
                  </div>
                  <Badge variant="neutral">{p.benchmarkSymbol}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-[10px] uppercase text-text-secondary">Total value</div>
                    <div className="text-[20px] font-semibold tabular-nums">{formatCurrency(v.totalValueCents)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-text-secondary">Return</div>
                    <div className={`text-[20px] font-semibold tabular-nums ${ret >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {ret.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-text-secondary">Cash</div>
                    <div className="text-[13px] font-medium tabular-nums">{formatCurrency(v.cashCents)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-text-secondary">Positions</div>
                    <div className="text-[13px] font-medium">{v.holdings.length}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/investments"
                    onClick={() => setSelected(p.id)}
                    className="inline-flex h-8 items-center px-3 text-[12px] font-medium rounded-lg border border-border bg-white hover:bg-bg"
                  >
                    Open overview
                  </Link>
                  <Link
                    to="/investments/holdings"
                    onClick={() => setSelected(p.id)}
                    className="inline-flex h-8 items-center px-3 text-[12px] font-medium rounded-lg text-text-secondary hover:bg-bg hover:text-text"
                  >
                    Holdings
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      </PageContainer>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create portfolio"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!name.trim()) return
                addPortfolio({
                  name: name.trim(),
                  description,
                  baseCurrency: 'USD',
                  benchmarkSymbol: benchmark,
                  initialCash: parseAmountToCents(cash) || dollarsToCents(0),
                  strategy,
                })
                setOpen(false)
                setName('')
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Initial cash</Label>
              <Input value={cash} onChange={(e) => setCash(e.target.value)} />
            </div>
            <div>
              <Label>Benchmark</Label>
              <Select
                value={benchmark}
                onChange={setBenchmark}
                options={[
                  { value: 'SPY', label: 'SPY' },
                  { value: 'QQQ', label: 'QQQ' },
                  { value: 'IWM', label: 'IWM' },
                ]}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <Label>Strategy</Label>
            <Input value={strategy} onChange={(e) => setStrategy(e.target.value)} />
          </div>
        </div>
      </Modal>
    </>
  )
}
