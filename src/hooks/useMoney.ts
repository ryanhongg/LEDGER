import { useLedgerStore } from '@/store/useLedgerStore'
import { formatCurrency as formatCurrencyBase } from '@/utils/currency'

/** Format cents using the workspace currency + number format preferences. */
export function useMoney() {
  const currency = useLedgerStore((s) => s.settings.currency)
  const numberFormat = useLedgerStore((s) => s.settings.numberFormat)

  return {
    format: (
      cents: number,
      options: { showSign?: boolean; compact?: boolean } = {},
    ) =>
      formatCurrencyBase(cents, {
        currency,
        compact: options.compact ?? numberFormat === 'compact',
        showSign: options.showSign,
      }),
  }
}
