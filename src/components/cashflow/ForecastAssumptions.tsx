import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Dropdown'
import { useLedgerStore } from '@/store/useLedgerStore'

export function ForecastAssumptionsPanel() {
  const assumptions = useLedgerStore((s) => s.forecastAssumptions)
  const setAssumptions = useLedgerStore((s) => s.setForecastAssumptions)

  return (
    <Card>
      <CardHeader
        title="Forecast Assumptions"
        subtitle="Adjust growth rates to recalculate projections"
      />
      <div className="space-y-4">
        <div>
          <Label>Revenue growth (% / year)</Label>
          <Input
            type="number"
            step="0.5"
            value={assumptions.revenueGrowthPercent}
            onChange={(e) =>
              setAssumptions({ revenueGrowthPercent: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Expense growth (% / year)</Label>
          <Input
            type="number"
            step="0.5"
            value={assumptions.expenseGrowthPercent}
            onChange={(e) =>
              setAssumptions({ expenseGrowthPercent: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Forecast duration (days)</Label>
          <Input
            type="number"
            min={14}
            max={180}
            step={7}
            value={assumptions.durationDays}
            onChange={(e) =>
              setAssumptions({
                durationDays: Math.min(180, Math.max(14, Number(e.target.value))),
              })
            }
          />
        </div>
        <div className="flex gap-1.5 pt-1">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setAssumptions({ durationDays: d })}
              className={`flex-1 h-8 text-[12px] font-medium rounded-lg border cursor-pointer transition-colors ${
                assumptions.durationDays === d
                  ? 'bg-accent-soft border-accent/30 text-accent'
                  : 'bg-white border-border text-text-secondary hover:text-text'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
