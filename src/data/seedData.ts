import type {
  Transaction,
  Budget,
  RecurringExpense,
  AppSettings,
  PaymentMethod,
  Category,
} from '@/types'
import { dollarsToCents } from '@/utils/currency'
import { toISODate, subDays } from '@/utils/dates'

const REF = new Date() // Nov 12, 2026 in user context

function d(daysAgo: number): string {
  return toISODate(subDays(REF, daysAgo))
}

function tx(
  id: string,
  description: string,
  dollars: number,
  type: 'income' | 'expense',
  category: Category,
  daysAgo: number,
  paymentMethod: PaymentMethod,
  merchant?: string,
  notes?: string,
): Transaction {
  return {
    id,
    description,
    amount: dollarsToCents(dollars),
    type,
    category,
    date: d(daysAgo),
    paymentMethod,
    merchant,
    notes,
  }
}

export const OPENING_BALANCE = dollarsToCents(45000)

export const seedSettings: AppSettings = {
  businessName: 'Northstar Creative Studio',
  businessType: 'Creative services agency',
  currency: 'USD',
  fiscalYearStart: 1,
  defaultPeriod: 'last30',
  numberFormat: 'standard',
  theme: 'light',
  userName: 'Alex Rivera',
  userRole: 'Owner',
}

export const seedBudgets: Budget[] = [
  { id: 'bud_1', name: 'Marketing', category: 'Marketing', limit: dollarsToCents(4500), period: 'monthly' },
  { id: 'bud_2', name: 'Payroll', category: 'Payroll', limit: dollarsToCents(28000), period: 'monthly' },
  { id: 'bud_3', name: 'Operations', category: 'Operations', limit: dollarsToCents(3500), period: 'monthly' },
  { id: 'bud_4', name: 'Software', category: 'Software', limit: dollarsToCents(1200), period: 'monthly' },
  { id: 'bud_5', name: 'Equipment', category: 'Equipment', limit: dollarsToCents(5000), period: 'yearly' },
  { id: 'bud_6', name: 'Rent', category: 'Rent', limit: dollarsToCents(4200), period: 'monthly' },
]

export const seedRecurring: RecurringExpense[] = [
  { id: 'rec_1', name: 'Office Rent', amount: dollarsToCents(4200), category: 'Rent', frequency: 'monthly', nextPaymentDate: d(-25), status: 'active' },
  { id: 'rec_2', name: 'Adobe Creative Cloud', amount: dollarsToCents(167.94), category: 'Software', frequency: 'monthly', nextPaymentDate: d(-22), status: 'active' },
  { id: 'rec_3', name: 'Figma Organization', amount: dollarsToCents(75), category: 'Software', frequency: 'monthly', nextPaymentDate: d(-18), status: 'active' },
  { id: 'rec_4', name: 'Team Payroll', amount: dollarsToCents(24000), category: 'Payroll', frequency: 'monthly', nextPaymentDate: d(-3), status: 'active' },
  { id: 'rec_5', name: 'Business Insurance', amount: dollarsToCents(480), category: 'Insurance', frequency: 'monthly', nextPaymentDate: d(-20), status: 'active' },
  { id: 'rec_6', name: 'Internet & Phone', amount: dollarsToCents(189), category: 'Utilities', frequency: 'monthly', nextPaymentDate: d(-16), status: 'active' },
  { id: 'rec_7', name: 'AWS Hosting', amount: dollarsToCents(214.5), category: 'Software', frequency: 'monthly', nextPaymentDate: d(-27), status: 'active' },
  { id: 'rec_8', name: 'Equipment Lease — Mac Studio', amount: dollarsToCents(890), category: 'Equipment', frequency: 'quarterly', nextPaymentDate: d(-45), status: 'active' },
  { id: 'rec_9', name: 'Slack Business+', amount: dollarsToCents(87.5), category: 'Software', frequency: 'monthly', nextPaymentDate: d(-14), status: 'paused' },
]

export const seedTransactions: Transaction[] = [
  // —— Recent (last 30 days) ——
  tx('tx_001', 'Brand identity package — Horizon Labs', 12500, 'income', 'Client Payment', 2, 'Wire Transfer', 'Horizon Labs'),
  tx('tx_002', 'Monthly retainer — BrightPath', 6500, 'income', 'Retainer', 3, 'ACH', 'BrightPath Co'),
  tx('tx_003', 'Team payroll — November cycle 1', 12000, 'expense', 'Payroll', 4, 'ACH', 'Gusto'),
  tx('tx_004', 'Office rent — November', 4200, 'expense', 'Rent', 5, 'Bank Transfer', 'Pacific Properties'),
  tx('tx_005', 'Google Ads campaign', 1850, 'expense', 'Marketing', 6, 'Credit Card', 'Google Ads'),
  tx('tx_006', 'Website redesign — Meridian Health', 9800, 'income', 'Client Payment', 7, 'Wire Transfer', 'Meridian Health'),
  tx('tx_007', 'Adobe Creative Cloud', 167.94, 'expense', 'Software', 8, 'Credit Card', 'Adobe'),
  tx('tx_008', 'Consulting — UX audit for Cobalt', 4200, 'income', 'Consulting', 9, 'Bank Transfer', 'Cobalt Systems'),
  tx('tx_009', 'Office supplies & snacks', 312.4, 'expense', 'Operations', 10, 'Debit Card', 'Costco'),
  tx('tx_010', 'LinkedIn Ads — Q4 push', 940, 'expense', 'Marketing', 11, 'Credit Card', 'LinkedIn'),
  tx('tx_011', 'Figma Organization plan', 75, 'expense', 'Software', 12, 'Credit Card', 'Figma'),
  tx('tx_012', 'Product photography — Northwind', 2800, 'income', 'Client Payment', 13, 'PayPal', 'Northwind Goods'),
  tx('tx_013', 'Business insurance premium', 480, 'expense', 'Insurance', 14, 'ACH', 'Hartford'),
  tx('tx_014', 'Team payroll — October cycle 2', 12000, 'expense', 'Payroll', 15, 'ACH', 'Gusto'),
  tx('tx_015', 'AWS infrastructure', 214.5, 'expense', 'Software', 16, 'Credit Card', 'Amazon Web Services'),
  tx('tx_016', 'Motion graphics package — Pulse FM', 7500, 'income', 'Client Payment', 17, 'Wire Transfer', 'Pulse FM'),
  tx('tx_017', 'Client lunch — pitch meeting', 186.75, 'expense', 'Operations', 18, 'Credit Card', 'The Marlowe'),
  tx('tx_018', 'Internet & phone', 189, 'expense', 'Utilities', 19, 'ACH', 'Comcast Business'),
  tx('tx_019', 'Retainer — Apex Ventures', 5000, 'income', 'Retainer', 20, 'ACH', 'Apex Ventures'),
  tx('tx_020', 'Meta Ads — brand awareness', 1200, 'expense', 'Marketing', 21, 'Credit Card', 'Meta'),
  tx('tx_021', 'New monitor — design station', 649, 'expense', 'Equipment', 22, 'Credit Card', 'Apple'),
  tx('tx_022', 'Logo refresh — Cedar & Co', 4500, 'income', 'Client Payment', 23, 'Bank Transfer', 'Cedar & Co'),
  tx('tx_023', 'Electricity bill', 245.3, 'expense', 'Utilities', 24, 'ACH', 'PG&E'),
  tx('tx_024', 'Slack Business+', 87.5, 'expense', 'Software', 25, 'Credit Card', 'Slack'),
  tx('tx_025', 'Strategy workshop — Summit Group', 6800, 'income', 'Consulting', 26, 'Wire Transfer', 'Summit Group'),
  tx('tx_026', 'Courier & shipping', 94.2, 'expense', 'Operations', 27, 'Debit Card', 'FedEx'),
  tx('tx_027', 'Notion Team plan', 48, 'expense', 'Software', 28, 'Credit Card', 'Notion'),
  tx('tx_028', 'Landing page — Orbit Finance', 5200, 'income', 'Client Payment', 29, 'ACH', 'Orbit Finance'),

  // —— 30–60 days ago ——
  tx('tx_029', 'Team payroll — October cycle 1', 12000, 'expense', 'Payroll', 32, 'ACH', 'Gusto'),
  tx('tx_030', 'Office rent — October', 4200, 'expense', 'Rent', 35, 'Bank Transfer', 'Pacific Properties'),
  tx('tx_031', 'Brand system — Lark Hotels', 15000, 'income', 'Client Payment', 36, 'Wire Transfer', 'Lark Hotels'),
  tx('tx_032', 'Google Ads campaign', 1620, 'expense', 'Marketing', 37, 'Credit Card', 'Google Ads'),
  tx('tx_033', 'Adobe Creative Cloud', 167.94, 'expense', 'Software', 38, 'Credit Card', 'Adobe'),
  tx('tx_034', 'Monthly retainer — BrightPath', 6500, 'income', 'Retainer', 39, 'ACH', 'BrightPath Co'),
  tx('tx_035', 'Figma Organization plan', 75, 'expense', 'Software', 40, 'Credit Card', 'Figma'),
  tx('tx_036', 'Team offsite catering', 875, 'expense', 'Operations', 41, 'Credit Card', 'Local Kitchen'),
  tx('tx_037', 'Consulting — product naming', 3500, 'income', 'Consulting', 42, 'Bank Transfer', 'Nova Biotech'),
  tx('tx_038', 'Business insurance premium', 480, 'expense', 'Insurance', 43, 'ACH', 'Hartford'),
  tx('tx_039', 'Team payroll — September cycle 2', 11800, 'expense', 'Payroll', 45, 'ACH', 'Gusto'),
  tx('tx_040', 'AWS infrastructure', 198.75, 'expense', 'Software', 46, 'Credit Card', 'Amazon Web Services'),
  tx('tx_041', 'Website & CMS — Harbor Dental', 11200, 'income', 'Client Payment', 47, 'Wire Transfer', 'Harbor Dental'),
  tx('tx_042', 'LinkedIn Ads', 780, 'expense', 'Marketing', 48, 'Credit Card', 'LinkedIn'),
  tx('tx_043', 'Internet & phone', 189, 'expense', 'Utilities', 49, 'ACH', 'Comcast Business'),
  tx('tx_044', 'Retainer — Apex Ventures', 5000, 'income', 'Retainer', 50, 'ACH', 'Apex Ventures'),
  tx('tx_045', 'Flight — client kickoff NYC', 542, 'expense', 'Travel', 51, 'Credit Card', 'United Airlines'),
  tx('tx_046', 'Hotel — NYC trip', 687.4, 'expense', 'Travel', 52, 'Credit Card', 'Ace Hotel'),
  tx('tx_047', 'Pitch deck design — Clearwater', 3900, 'income', 'Client Payment', 53, 'PayPal', 'Clearwater Capital'),
  tx('tx_048', 'Meta Ads', 950, 'expense', 'Marketing', 54, 'Credit Card', 'Meta'),
  tx('tx_049', 'Electricity bill', 231.8, 'expense', 'Utilities', 55, 'ACH', 'PG&E'),
  tx('tx_050', 'Slack Business+', 87.5, 'expense', 'Software', 56, 'Credit Card', 'Slack'),
  tx('tx_051', 'Social content pack — Verde', 2400, 'income', 'Client Payment', 57, 'Bank Transfer', 'Verde Organics'),
  tx('tx_052', 'Office cleaning service', 350, 'expense', 'Operations', 58, 'ACH', 'Sparkle Pros'),
  tx('tx_053', 'Notion Team plan', 48, 'expense', 'Software', 59, 'Credit Card', 'Notion'),

  // —— 60–90 days ago ——
  tx('tx_054', 'Team payroll — September cycle 1', 11800, 'expense', 'Payroll', 62, 'ACH', 'Gusto'),
  tx('tx_055', 'Office rent — September', 4200, 'expense', 'Rent', 65, 'Bank Transfer', 'Pacific Properties'),
  tx('tx_056', 'Rebrand — Atlas Robotics', 18500, 'income', 'Client Payment', 66, 'Wire Transfer', 'Atlas Robotics'),
  tx('tx_057', 'Google Ads campaign', 1450, 'expense', 'Marketing', 67, 'Credit Card', 'Google Ads'),
  tx('tx_058', 'Adobe Creative Cloud', 167.94, 'expense', 'Software', 68, 'Credit Card', 'Adobe'),
  tx('tx_059', 'Monthly retainer — BrightPath', 6500, 'income', 'Retainer', 69, 'ACH', 'BrightPath Co'),
  tx('tx_060', 'Standing desk — designer', 799, 'expense', 'Equipment', 70, 'Credit Card', 'Fully'),
  tx('tx_061', 'Figma Organization plan', 75, 'expense', 'Software', 71, 'Credit Card', 'Figma'),
  tx('tx_062', 'UX research sprint — Cobalt', 5600, 'income', 'Consulting', 72, 'Bank Transfer', 'Cobalt Systems'),
  tx('tx_063', 'Business insurance premium', 480, 'expense', 'Insurance', 73, 'ACH', 'Hartford'),
  tx('tx_064', 'Team payroll — August cycle 2', 11500, 'expense', 'Payroll', 75, 'ACH', 'Gusto'),
  tx('tx_065', 'AWS infrastructure', 187.2, 'expense', 'Software', 76, 'Credit Card', 'Amazon Web Services'),
  tx('tx_066', 'Packaging design — Northwind', 7200, 'income', 'Client Payment', 77, 'Wire Transfer', 'Northwind Goods'),
  tx('tx_067', 'LinkedIn Ads', 620, 'expense', 'Marketing', 78, 'Credit Card', 'LinkedIn'),
  tx('tx_068', 'Internet & phone', 189, 'expense', 'Utilities', 79, 'ACH', 'Comcast Business'),
  tx('tx_069', 'Retainer — Apex Ventures', 5000, 'income', 'Retainer', 80, 'ACH', 'Apex Ventures'),
  tx('tx_070', 'Conference tickets — Design Week', 890, 'expense', 'Travel', 81, 'Credit Card', 'Design Week SF'),
  tx('tx_071', 'Illustration set — Pulse FM', 3100, 'income', 'Client Payment', 82, 'PayPal', 'Pulse FM'),
  tx('tx_072', 'Meta Ads', 880, 'expense', 'Marketing', 83, 'Credit Card', 'Meta'),
  tx('tx_073', 'Electricity bill', 218.5, 'expense', 'Utilities', 84, 'ACH', 'PG&E'),
  tx('tx_074', 'Office supplies', 156.3, 'expense', 'Operations', 85, 'Debit Card', 'Staples'),
  tx('tx_075', 'Equipment lease — Mac Studio', 890, 'expense', 'Equipment', 86, 'ACH', 'Apple Financial'),

  // —— 90–120 days ago ——
  tx('tx_076', 'Team payroll — August cycle 1', 11500, 'expense', 'Payroll', 92, 'ACH', 'Gusto'),
  tx('tx_077', 'Office rent — August', 4200, 'expense', 'Rent', 95, 'Bank Transfer', 'Pacific Properties'),
  tx('tx_078', 'Brand launch — Meridian Health', 14000, 'income', 'Client Payment', 96, 'Wire Transfer', 'Meridian Health'),
  tx('tx_079', 'Google Ads campaign', 1380, 'expense', 'Marketing', 97, 'Credit Card', 'Google Ads'),
  tx('tx_080', 'Adobe Creative Cloud', 167.94, 'expense', 'Software', 98, 'Credit Card', 'Adobe'),
  tx('tx_081', 'Monthly retainer — BrightPath', 6000, 'income', 'Retainer', 99, 'ACH', 'BrightPath Co'),
  tx('tx_082', 'Figma Organization plan', 75, 'expense', 'Software', 100, 'Credit Card', 'Figma'),
  tx('tx_083', 'Strategy workshop — Lark Hotels', 7500, 'income', 'Consulting', 101, 'Bank Transfer', 'Lark Hotels'),
  tx('tx_084', 'Business insurance premium', 480, 'expense', 'Insurance', 102, 'ACH', 'Hartford'),
  tx('tx_085', 'Team payroll — July cycle 2', 11200, 'expense', 'Payroll', 105, 'ACH', 'Gusto'),
  tx('tx_086', 'AWS infrastructure', 175.4, 'expense', 'Software', 106, 'Credit Card', 'Amazon Web Services'),
  tx('tx_087', 'Website redesign — Orbit Finance', 9800, 'income', 'Client Payment', 107, 'Wire Transfer', 'Orbit Finance'),
  tx('tx_088', 'LinkedIn Ads', 540, 'expense', 'Marketing', 108, 'Credit Card', 'LinkedIn'),
  tx('tx_089', 'Internet & phone', 189, 'expense', 'Utilities', 109, 'ACH', 'Comcast Business'),
  tx('tx_090', 'Retainer — Apex Ventures', 4500, 'income', 'Retainer', 110, 'ACH', 'Apex Ventures'),
  tx('tx_091', 'Meta Ads', 720, 'expense', 'Marketing', 112, 'Credit Card', 'Meta'),
  tx('tx_092', 'Electricity bill', 205.6, 'expense', 'Utilities', 114, 'ACH', 'PG&E'),
  tx('tx_093', 'Camera lens rental', 275, 'expense', 'Equipment', 116, 'Credit Card', 'BorrowLenses'),
  tx('tx_094', 'Social kit — Verde Organics', 2800, 'income', 'Client Payment', 118, 'Bank Transfer', 'Verde Organics'),

  // —— 120–180 days ago ——
  tx('tx_095', 'Team payroll — July cycle 1', 11200, 'expense', 'Payroll', 122, 'ACH', 'Gusto'),
  tx('tx_096', 'Office rent — July', 4000, 'expense', 'Rent', 125, 'Bank Transfer', 'Pacific Properties'),
  tx('tx_097', 'Identity system — Horizon Labs', 16000, 'income', 'Client Payment', 128, 'Wire Transfer', 'Horizon Labs'),
  tx('tx_098', 'Google Ads campaign', 1100, 'expense', 'Marketing', 130, 'Credit Card', 'Google Ads'),
  tx('tx_099', 'Adobe Creative Cloud', 167.94, 'expense', 'Software', 132, 'Credit Card', 'Adobe'),
  tx('tx_100', 'Monthly retainer — BrightPath', 6000, 'income', 'Retainer', 135, 'ACH', 'BrightPath Co'),
  tx('tx_101', 'Team payroll — June cycle 2', 11000, 'expense', 'Payroll', 140, 'ACH', 'Gusto'),
  tx('tx_102', 'Figma Organization plan', 75, 'expense', 'Software', 142, 'Credit Card', 'Figma'),
  tx('tx_103', 'Consulting — brand audit', 4800, 'income', 'Consulting', 145, 'Bank Transfer', 'Summit Group'),
  tx('tx_104', 'Business insurance premium', 480, 'expense', 'Insurance', 148, 'ACH', 'Hartford'),
  tx('tx_105', 'Office rent — June', 4000, 'expense', 'Rent', 155, 'Bank Transfer', 'Pacific Properties'),
  tx('tx_106', 'Team payroll — June cycle 1', 11000, 'expense', 'Payroll', 158, 'ACH', 'Gusto'),
  tx('tx_107', 'Website — Clearwater Capital', 8500, 'income', 'Client Payment', 160, 'Wire Transfer', 'Clearwater Capital'),
  tx('tx_108', 'AWS infrastructure', 162.1, 'expense', 'Software', 162, 'Credit Card', 'Amazon Web Services'),
  tx('tx_109', 'Internet & phone', 189, 'expense', 'Utilities', 165, 'ACH', 'Comcast Business'),
  tx('tx_110', 'Retainer — Apex Ventures', 4500, 'income', 'Retainer', 168, 'ACH', 'Apex Ventures'),
  tx('tx_111', 'Meta Ads', 650, 'expense', 'Marketing', 170, 'Credit Card', 'Meta'),
  tx('tx_112', 'Electricity bill', 198.4, 'expense', 'Utilities', 172, 'ACH', 'PG&E'),
  tx('tx_113', 'Office furniture refresh', 1240, 'expense', 'Equipment', 175, 'Credit Card', 'Herman Miller'),
  tx('tx_114', 'Pitch materials — Nova Biotech', 3600, 'income', 'Client Payment', 178, 'PayPal', 'Nova Biotech'),
  tx('tx_115', 'Team payroll — May cycle 2', 10800, 'expense', 'Payroll', 180, 'ACH', 'Gusto'),
]

export function getSeedSnapshot() {
  return {
    transactions: structuredClone(seedTransactions),
    budgets: structuredClone(seedBudgets),
    recurring: structuredClone(seedRecurring),
    settings: structuredClone(seedSettings),
    openingBalance: OPENING_BALANCE,
  }
}
