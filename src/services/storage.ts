const STORAGE_KEY = 'ledger_app_v1'

export interface PersistedState {
  transactions: unknown[]
  budgets: unknown[]
  recurring: unknown[]
  settings: unknown
  openingBalance: number
  importedHashes: string[]
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to persist LEDGER state', e)
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
