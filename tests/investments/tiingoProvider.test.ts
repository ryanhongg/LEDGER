import { describe, it, expect, vi, afterEach } from 'vitest'
import { TiingoProvider } from '../../server/services/providers/TiingoProvider'

describe('TiingoProvider quote classification', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps IEX session snapshot without live timestamps to end_of_day', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            ticker: 'AAPL',
            timestamp: '2026-11-13T21:00:00+00:00',
            quoteTimestamp: null,
            lastSaleTimestamp: null,
            tngoLast: 356.27,
            prevClose: 354.88,
            open: 357.96,
            high: 360.83,
            low: 355.75,
            volume: 40027467,
          },
        ],
      })),
    )

    const provider = new TiingoProvider('test-key')
    const quote = await provider.getQuote('AAPL')
    expect(quote.price).toBe(356.27)
    expect(quote.freshness).toBe('end_of_day')
    expect(quote.provider).toBe('tiingo')
    expect(quote.priceType).toBe('reference')
  })

  it('rejects unauthorized keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      })),
    )
    const provider = new TiingoProvider('bad')
    await expect(provider.getQuote('AAPL')).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
    })
  })

  it('falls back to EOD when IEX last price is null', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/iex/')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              ticker: 'SPY',
              tngoLast: null,
              last: null,
              timestamp: '2026-11-13T21:00:00+00:00',
            },
          ],
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            date: '2026-11-12T00:00:00.000Z',
            open: 750,
            high: 760,
            low: 745,
            close: 754.37,
            adjClose: 754.37,
            volume: 1,
          },
        ],
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new TiingoProvider('test-key')
    const quote = await provider.getQuote('SPY')
    expect(quote.price).toBe(754.37)
    expect(quote.freshness).toBe('end_of_day')
    expect(quote.priceType).toBe('end_of_day')
  })
})
