import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Label, TextArea } from '@/components/ui/Dropdown'
import { MarketDataStatus } from '@/components/investments/MarketDataStatus'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { formatCurrency } from '@/utils/currency'
import { parseAmountToCents } from '@/utils/currency'

export function ResearchPage() {
  const securities = useInvestmentStore((s) => s.securities)
  const quotes = useInvestmentStore((s) => s.quotes)
  const watchlists = useInvestmentStore((s) => s.watchlists)
  const notes = useInvestmentStore((s) => s.researchNotes)
  const addWatchlist = useInvestmentStore((s) => s.addWatchlist)
  const removeWatchlist = useInvestmentStore((s) => s.removeWatchlist)
  const removeFromWatchlist = useInvestmentStore((s) => s.removeFromWatchlist)
  const addResearchNote = useInvestmentStore((s) => s.addResearchNote)
  const deleteResearchNote = useInvestmentStore((s) => s.deleteResearchNote)

  const [wlName, setWlName] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [securityId, setSecurityId] = useState(securities[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [rationale, setRationale] = useState('')
  const [bull, setBull] = useState('')
  const [bear, setBear] = useState('')
  const [risks, setRisks] = useState('')
  const [target, setTarget] = useState('')

  return (
    <>
      <Topbar
        title="Research"
        breadcrumb="Investment Management"
        showDateRange={false}
        actions={
          <Button size="sm" onClick={() => setNoteOpen(true)}>
            <Plus size={14} /> Thesis note
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Research Workspace</h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Watchlists and investment theses — no invented fundamentals.
            </p>
          </div>
          <MarketDataStatus />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          {watchlists.map((wl) => (
            <Card key={wl.id}>
              <CardHeader
                title={wl.name}
                action={
                  <button
                    className="text-text-secondary hover:text-negative cursor-pointer"
                    onClick={() => removeWatchlist(wl.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                }
              />
              <div className="space-y-2">
                {wl.securityIds.length === 0 && (
                  <p className="text-[12px] text-text-secondary">Empty — add from Market Data search</p>
                )}
                {wl.securityIds.map((id) => {
                  const sec = securities.find((s) => s.id === id)
                  if (!sec) return null
                  const q = quotes[sec.symbol]
                  return (
                    <div key={id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold">{sec.symbol}</div>
                        <div className="text-[11px] text-text-secondary">{sec.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold tabular-nums">
                          {q ? formatCurrency(q.priceCents) : '—'}
                        </div>
                        {q && (
                          <Badge variant={q.isDemo ? 'amber' : 'accent'} className="mt-0.5">
                            {q.isDemo ? 'Demo' : q.freshness}
                          </Badge>
                        )}
                      </div>
                      <button
                        className="text-text-secondary hover:text-negative cursor-pointer"
                        onClick={() => removeFromWatchlist(wl.id, id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>

        <Card className="mb-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>New watchlist</Label>
              <Input value={wlName} onChange={(e) => setWlName(e.target.value)} placeholder="Name" />
            </div>
            <Button
              onClick={() => {
                if (!wlName.trim()) return
                addWatchlist(wlName.trim())
                setWlName('')
              }}
            >
              Create
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Investment thesis notes" />
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-[13px] text-text-secondary">No notes yet</p>
            )}
            {notes.map((n) => {
              const sec = securities.find((s) => s.id === n.securityId)
              return (
                <div key={n.id} className="border border-border rounded-[10px] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-semibold">{n.title}</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {sec?.symbol} · Updated {n.updatedAt.slice(0, 10)}
                      </div>
                    </div>
                    <button
                      className="text-text-secondary hover:text-negative cursor-pointer"
                      onClick={() => deleteResearchNote(n.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-[12px] mt-2">{n.rationale}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-[11px]">
                    <div className="bg-positive-soft/50 rounded-lg p-2">
                      <div className="font-semibold text-positive mb-0.5">Bull</div>
                      {n.bullCase}
                    </div>
                    <div className="bg-negative-soft/50 rounded-lg p-2">
                      <div className="font-semibold text-negative mb-0.5">Bear</div>
                      {n.bearCase}
                    </div>
                    <div className="bg-bg rounded-lg p-2">
                      <div className="font-semibold mb-0.5">Risks</div>
                      {n.risks}
                    </div>
                  </div>
                  {n.targetPriceCents != null && (
                    <div className="text-[12px] mt-2">
                      Target: <strong>{formatCurrency(n.targetPriceCents)}</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </PageContainer>

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="New thesis note"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!title.trim() || !securityId) return
                addResearchNote({
                  securityId,
                  title: title.trim(),
                  rationale,
                  bullCase: bull,
                  bearCase: bear,
                  risks,
                  targetPriceCents: target ? parseAmountToCents(target) : undefined,
                })
                setNoteOpen(false)
                setTitle('')
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Security</Label>
            <Select
              value={securityId}
              onChange={setSecurityId}
              options={securities.map((s) => ({ value: s.id, label: s.symbol }))}
              className="w-full"
            />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Rationale</Label>
            <TextArea rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
          </div>
          <div>
            <Label>Bull case</Label>
            <TextArea rows={2} value={bull} onChange={(e) => setBull(e.target.value)} />
          </div>
          <div>
            <Label>Bear case</Label>
            <TextArea rows={2} value={bear} onChange={(e) => setBear(e.target.value)} />
          </div>
          <div>
            <Label>Risks</Label>
            <TextArea rows={2} value={risks} onChange={(e) => setRisks(e.target.value)} />
          </div>
          <div>
            <Label>Target price</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </Modal>
    </>
  )
}
