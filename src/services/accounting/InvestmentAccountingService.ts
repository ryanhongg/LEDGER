/**
 * Accounting bridge between operating ledger and investment division.
 *
 * ASSUMPTIONS / LIMITATIONS:
 * - Operating P&L never includes security purchases, unrealized gains, or deposits.
 * - Capital transfers move cash between "operating cash" and "investment cash"
 *   without creating revenue or expense.
 * - Realized gains/losses and dividends are investment activity, not operating income
 *   in the business dashboard (tracked separately in investment analytics).
 * - This is simplified internal bookkeeping, not GAAP/IFRS financial statements.
 */
import type { CapitalTransfer, PortfolioValuation } from '@/types/investment'
import type { Transaction } from '@/types/transaction'

export interface CompanyFinancialPosition {
  operatingCashCents: number
  investmentCashCents: number
  securitiesMarketValueCents: number
  totalInvestmentAssetsCents: number
  totalLiquidAssetsCents: number
  transfersOutToInvestmentsCents: number
  transfersInFromInvestmentsCents: number
  notes: string[]
}

/** Sum of capital moved ops → investments. */
export function totalTransferredToInvestments(transfers: CapitalTransfer[]): number {
  return transfers
    .filter((t) => t.direction === 'ops_to_investment')
    .reduce((s, t) => s + t.amountCents, 0)
}

export function totalReturnedToOperations(transfers: CapitalTransfer[]): number {
  return transfers
    .filter((t) => t.direction === 'investment_to_ops')
    .reduce((s, t) => s + t.amountCents, 0)
}

/**
 * Operating cash ≈ opening balance + ops net cash flow − net capital sent to investments.
 * Ops transactions remain untouched; transfers adjust the company position view only.
 */
export function computeCompanyPosition(input: {
  openingBalanceCents: number
  operatingTransactions: Transaction[]
  transfers: CapitalTransfer[]
  valuations: PortfolioValuation[]
}): CompanyFinancialPosition {
  const opsNet = input.operatingTransactions.reduce(
    (bal, t) => (t.type === 'income' ? bal + t.amount : bal - t.amount),
    0,
  )
  const toInv = totalTransferredToInvestments(input.transfers)
  const fromInv = totalReturnedToOperations(input.transfers)

  const investmentCash = input.valuations.reduce((s, v) => s + v.cashCents, 0)
  const securities = input.valuations.reduce(
    (s, v) => s + v.securitiesMarketValueCents,
    0,
  )

  const operatingCash =
    input.openingBalanceCents + opsNet - toInv + fromInv

  return {
    operatingCashCents: operatingCash,
    investmentCashCents: investmentCash,
    securitiesMarketValueCents: securities,
    totalInvestmentAssetsCents: investmentCash + securities,
    totalLiquidAssetsCents: operatingCash + investmentCash + securities,
    transfersOutToInvestmentsCents: toInv,
    transfersInFromInvestmentsCents: fromInv,
    notes: [
      'Security purchases are asset reallocations within investment cash — not operating expenses.',
      'Unrealized gains are not recognized as operating revenue.',
      'Deposits/withdrawals between ops and portfolios are capital transfers, not P&L.',
    ],
  }
}
