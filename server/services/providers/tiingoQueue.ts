/** Serializes Tiingo REST calls to reduce 429s on free/starter plans. */

let chain: Promise<unknown> = Promise.resolve()
let lastAt = 0
const MIN_GAP_MS = 600

export function enqueueTiingo<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastAt))
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastAt = Date.now()
    return fn()
  }
  const next = chain.then(run, run)
  chain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}
