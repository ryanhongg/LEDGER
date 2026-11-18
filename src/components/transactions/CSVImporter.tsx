import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select, Label } from '@/components/ui/Dropdown'
import { useLedgerStore } from '@/store/useLedgerStore'
import {
  parseCSVFile,
  suggestMapping,
  mapRows,
  rowsToTransactions,
  downloadSampleCSV,
  type CSVColumnMapping,
  type CSVParseResult,
} from '@/services/csvService'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'upload' | 'map' | 'preview' | 'done'

export function CSVImporter({ open, onClose }: Props) {
  const importTransactions = useLedgerStore((s) => s.importTransactions)
  const importedHashes = useLedgerStore((s) => s.importedHashes)
  const addToast = useLedgerStore((s) => s.addToast)

  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<CSVColumnMapping | null>(null)
  const [parsed, setParsed] = useState<CSVParseResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [summary, setSummary] = useState({ imported: 0, skipped: 0, invalid: 0 })

  const reset = () => {
    setStep('upload')
    setHeaders([])
    setRawData([])
    setMapping(null)
    setParsed(null)
    setSummary({ imported: 0, skipped: 0, invalid: 0 })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      addToast('Please upload a CSV file', 'error')
      return
    }
    try {
      const { headers: h, data } = await parseCSVFile(file)
      if (data.length === 0) {
        addToast('CSV file is empty', 'error')
        return
      }
      const suggested = suggestMapping(h)
      setHeaders(h)
      setRawData(data)
      setMapping(suggested)
      setStep('map')
    } catch {
      addToast('Failed to parse CSV file', 'error')
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) void processFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const runMapping = () => {
    if (!mapping) return
    const result = mapRows(rawData, mapping)
    setParsed(result)
    setStep('preview')
  }

  const confirmImport = () => {
    if (!parsed) return
    const hashSet = new Set(importedHashes)
    const { transactions, skippedDuplicates } = rowsToTransactions(
      parsed.rows,
      hashSet,
    )
    const newHashes = transactions.map(
      (t) =>
        [
          t.description.toLowerCase(),
          t.amount,
          t.type,
          t.date,
          t.merchant?.toLowerCase() ?? '',
        ].join('|'),
    )
    importTransactions(transactions, newHashes)
    setSummary({
      imported: transactions.length,
      skipped: skippedDuplicates,
      invalid: parsed.invalidCount,
    })
    setStep('done')
    addToast(`Imported ${transactions.length} transactions`, 'success')
  }

  const headerOptions = [
    { value: '', label: '— Skip —' },
    ...headers.map((h) => ({ value: h, label: h })),
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import CSV"
      subtitle="Upload transactions from a spreadsheet"
      size="xl"
      footer={
        step === 'map' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={runMapping} disabled={!mapping?.description || !mapping?.amount || !mapping?.date}>
              Preview import
            </Button>
          </>
        ) : step === 'preview' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('map')}>
              Back
            </Button>
            <Button
              onClick={confirmImport}
              disabled={!parsed || parsed.validCount === 0}
            >
              Import {parsed?.validCount ?? 0} rows
            </Button>
          </>
        ) : step === 'done' ? (
          <Button onClick={handleClose}>Done</Button>
        ) : null
      }
    >
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-3 py-12 px-6 rounded-[12px] border-2 border-dashed transition-colors',
              dragOver
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-bg/50',
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-white border border-border flex items-center justify-center text-accent">
              <Upload size={20} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-text">
                Drag & drop your CSV here
              </p>
              <p className="text-[12px] text-text-secondary mt-1">
                or click to browse files
              </p>
            </div>
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void processFile(f)
                }}
              />
              <span className="inline-flex h-9 px-3.5 items-center text-[13px] font-medium rounded-[10px] bg-accent text-white cursor-pointer hover:bg-[#284ED4]">
                Select file
              </span>
            </label>
          </div>
          <button
            onClick={downloadSampleCSV}
            className="inline-flex items-center gap-2 text-[12px] text-accent hover:underline cursor-pointer"
          >
            <Download size={13} />
            Download sample CSV template
          </button>
        </div>
      )}

      {step === 'map' && mapping && (
        <div className="space-y-4">
          <p className="text-[13px] text-text-secondary">
            Map your CSV columns to LEDGER transaction fields. Found{' '}
            <strong className="text-text">{rawData.length}</strong> rows.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ['description', 'Description *'],
                ['amount', 'Amount *'],
                ['date', 'Date *'],
                ['type', 'Type'],
                ['category', 'Category'],
                ['paymentMethod', 'Payment method'],
                ['merchant', 'Merchant'],
                ['notes', 'Notes'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Select
                  value={mapping[key]}
                  onChange={(v) => setMapping({ ...mapping, [key]: v })}
                  options={headerOptions}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'preview' && parsed && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Stat
              icon={<CheckCircle2 size={14} className="text-positive" />}
              label="Valid"
              value={parsed.validCount}
            />
            <Stat
              icon={<AlertCircle size={14} className="text-negative" />}
              label="Invalid"
              value={parsed.invalidCount}
            />
          </div>
          <div className="overflow-x-auto border border-border rounded-[10px] max-h-[360px]">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-bg">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-text-secondary font-medium">#</th>
                  <th className="px-3 py-2 text-text-secondary font-medium">Description</th>
                  <th className="px-3 py-2 text-text-secondary font-medium">Amount</th>
                  <th className="px-3 py-2 text-text-secondary font-medium">Type</th>
                  <th className="px-3 py-2 text-text-secondary font-medium">Date</th>
                  <th className="px-3 py-2 text-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 50).map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={cn(
                      'border-b border-border/60',
                      row.errors.length > 0 && 'bg-negative-soft/40',
                    )}
                  >
                    <td className="px-3 py-2 text-text-secondary">{row.rowIndex + 1}</td>
                    <td className="px-3 py-2">
                      {row.transaction?.description ?? row.raw[mapping?.description ?? ''] ?? '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.transaction
                        ? formatCurrency(row.transaction.amount)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {row.transaction?.type ?? '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.transaction?.date ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length === 0 ? (
                        <span className="text-positive">OK</span>
                      ) : (
                        <span className="text-negative">{row.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 50 && (
            <p className="text-[11px] text-text-secondary">
              Showing first 50 of {parsed.rows.length} rows
            </p>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center text-center py-8 gap-3">
          <div className="w-12 h-12 rounded-xl bg-positive-soft text-positive flex items-center justify-center">
            <FileSpreadsheet size={22} />
          </div>
          <h3 className="text-[16px] font-semibold">Import complete</h3>
          <div className="text-[13px] text-text-secondary space-y-1">
            <p>
              <strong className="text-text">{summary.imported}</strong> transactions imported
            </p>
            {summary.skipped > 0 && (
              <p>{summary.skipped} duplicates skipped</p>
            )}
            {summary.invalid > 0 && (
              <p>{summary.invalid} invalid rows excluded</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg">
      {icon}
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}
