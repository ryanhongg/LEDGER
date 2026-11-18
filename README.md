# LEDGER

Financial operations + investment management platform for Northstar Creative Studio.

## Run

```bash
cp .env.example .env   # optional: add TIINGO_API_KEY
npm install
npm run dev
```

- Web: http://127.0.0.1:5173  
- Market API: http://127.0.0.1:8787  

`npm run dev` starts Vite and the Express market-data proxy together.

## Tiingo API key

1. Create a key at https://www.tiingo.com/
2. Put it in `.env` (never commit; never use `VITE_` prefix):

```
TIINGO_API_KEY=your_key_here
MARKET_DATA_PROVIDER=tiingo
PORT=8787
```

3. Restart `npm run dev`.

Without a key, investment pages use **clearly labeled demo prices**. **With a key, they model real-time market prices.**

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Frontend + market API |
| `npm run dev:web` | Frontend only |
| `npm run server` | Market API only |
| `npm test` | Unit / integration tests |
| `npm run build` | Production build |

## Architecture notes

- Operating ledger: Zustand + `localStorage` (`ledger_app_v1`)
- Investments: Zustand + `localStorage` (`ledger_investments_v1`)
- Market data: Express proxy + SQLite cache (`server/data/market-cache.db`)
- API keys stay server-side only
