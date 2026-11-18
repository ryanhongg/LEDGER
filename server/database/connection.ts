import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')
fs.mkdirSync(dataDir, { recursive: true })

const dbPath = path.join(dataDir, 'market-cache.db')

export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS cache_entries (
    cache_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`)

export function getCache(
  key: string,
  opts?: { allowExpired?: boolean },
): { payload: unknown; fetchedAt: string; expired: boolean } | null {
  const row = db
    .prepare(
      `SELECT payload, fetched_at as fetchedAt, expires_at as expiresAt FROM cache_entries WHERE cache_key = ?`,
    )
    .get(key) as { payload: string; fetchedAt: string; expiresAt: string } | undefined
  if (!row) return null
  const expired = new Date(row.expiresAt).getTime() < Date.now()
  if (expired && !opts?.allowExpired) return null
  return { payload: JSON.parse(row.payload), fetchedAt: row.fetchedAt, expired }
}

export function setCache(key: string, payload: unknown, ttlSeconds: number): void {
  const now = new Date()
  const expires = new Date(now.getTime() + ttlSeconds * 1000)
  db.prepare(
    `INSERT INTO cache_entries (cache_key, payload, fetched_at, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       payload = excluded.payload,
       fetched_at = excluded.fetched_at,
       expires_at = excluded.expires_at`,
  ).run(key, JSON.stringify(payload), now.toISOString(), expires.toISOString())
}

export function logRequest(endpoint: string): void {
  db.prepare(`INSERT INTO request_log (endpoint, created_at) VALUES (?, ?)`).run(
    endpoint,
    new Date().toISOString(),
  )
}
