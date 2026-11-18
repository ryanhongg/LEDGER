export type AssetType = 'stock' | 'etf' | 'index' | 'other'

export type InvestmentTxnType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'COMMISSION'
  | 'CORPORATE_ACTION'
  | 'INTEREST'

export type PriceFreshness =
  | 'live_reference'
  | 'delayed'
  | 'end_of_day'
  | 'historical'
  | 'stale'
  | 'unavailable'
  | 'demo'

export type CostBasisMethod = 'FIFO'

export interface Security {
  id: string
  symbol: string
  name: string
  exchange: string
  assetType: AssetType
  currency: string
  providerSymbol: string
  sector?: string
  industry?: string
  createdAt: string
}

export interface Portfolio {
  id: string
  name: string
  description: string
  baseCurrency: string
  benchmarkSymbol: string
  /** Initial cash in cents */
  initialCash: number
  strategy: string
  createdAt: string
}

export interface InvestmentTransaction {
  id: string
  portfolioId: string
  securityId?: string
  type: InvestmentTxnType
  tradeDate: string
  settlementDate: string
  /** Shares × 1e6 for fractional precision (micro-shares) */
  quantityMicros: number
  /** Price in micro-cents per share (cents × 1e4) for precision; prefer helpers */
  priceMicros: number
  /** Gross amount in cents */
  grossAmountCents: number
  /** Fees in cents */
  feesCents: number
  /** Net cash impact in cents (negative = cash out) */
  netAmountCents: number
  currency: string
  notes?: string
  createdAt: string
}

export interface PositionLot {
  id: string
  portfolioId: string
  securityId: string
  sourceTransactionId: string
  acquisitionDate: string
  originalQuantityMicros: number
  remainingQuantityMicros: number
  /** Unit cost in micro-cents per share */
  unitCostMicros: number
  /** Remaining cost basis in cents */
  remainingCostBasisCents: number
}

export interface MarketQuote {
  symbol: string
  priceCents: number
  previousCloseCents?: number
  openCents?: number
  highCents?: number
  lowCents?: number
  volume?: number
  timestamp: string
  provider: string
  priceType: 'end_of_day' | 'reference' | 'demo'
  freshness: PriceFreshness
  isDemo: boolean
}

export interface HistoricalBar {
  date: string
  openCents: number
  highCents: number
  lowCents: number
  closeCents: number
  adjustedCloseCents: number
  volume: number
}

export interface DividendRecord {
  id: string
  portfolioId: string
  securityId: string
  paymentDate: string
  amountPerShareMicros: number
  sharesEligibleMicros: number
  grossAmountCents: number
  withholdingTaxCents: number
  netAmountCents: number
  sourceTransactionId: string
}

export interface Watchlist {
  id: string
  name: string
  securityIds: string[]
  createdAt: string
}

export interface ResearchNote {
  id: string
  securityId: string
  title: string
  rationale: string
  bullCase: string
  bearCase: string
  risks: string
  targetPriceCents?: number
  createdAt: string
  updatedAt: string
}

export interface HoldingView {
  securityId: string
  portfolioId: string
  symbol: string
  name: string
  sector?: string
  assetType: AssetType
  quantityMicros: number
  avgCostMicros: number
  costBasisCents: number
  /** Latest mark; 0 when markAvailable is false */
  priceCents: number
  marketValueCents: number
  unrealizedPnLCents: number
  /** Unrealized / cost basis; null when mark unavailable or cost is 0 */
  unrealizedReturnPercent: number | null
  dailyChangeCents: number
  dailyChangePercent: number
  weight: number
  priceFreshness: PriceFreshness
  isDemoPrice: boolean
  /** False when there is no usable market mark (do not treat zeros as gains/losses) */
  markAvailable: boolean
}

export interface PortfolioValuation {
  portfolioId: string
  asOf: string
  cashCents: number
  securitiesMarketValueCents: number
  totalValueCents: number
  costBasisCents: number
  unrealizedPnLCents: number
  realizedPnLCents: number
  dividendIncomeCents: number
  feesCents: number
  investedCapitalCents: number
  holdings: HoldingView[]
}

export interface CapitalTransfer {
  id: string
  direction: 'ops_to_investment' | 'investment_to_ops'
  amountCents: number
  date: string
  portfolioId: string
  notes?: string
  /** Linked investment DEPOSIT/WITHDRAWAL id */
  investmentTxnId: string
  /** Linked ops ledger memo transaction id (non-P&L transfer) */
  opsTransactionId?: string
}
