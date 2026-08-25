export const ExpenseSplitType = {
  Equal: 0,
  Custom: 1,
} as const
export type ExpenseSplitType = (typeof ExpenseSplitType)[keyof typeof ExpenseSplitType]

export const ExpenseCategory = {
  Other: 0,
  Food: 1,
  Transport: 2,
  Lodging: 3,
  Ticket: 4,
  Shopping: 5,
  Entertainment: 6,
} as const
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory]

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.Other]: '其他',
  [ExpenseCategory.Food]: '餐饮',
  [ExpenseCategory.Transport]: '交通',
  [ExpenseCategory.Lodging]: '住宿',
  [ExpenseCategory.Ticket]: '门票',
  [ExpenseCategory.Shopping]: '购物',
  [ExpenseCategory.Entertainment]: '娱乐',
}

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  label,
  value: Number(value) as ExpenseCategory,
}))

export interface Participant {
  id: string
  name: string
  color: string
  create_time: number
}

export interface ExchangeRate {
  currency: string
  rate_to_base: number
}

export interface Ledger {
  id: string
  name: string
  description: string
  base_currency: string
  participants: Participant[]
  exchange_rates: ExchangeRate[]
  create_time: number
  update_time: number
  locked: boolean
}

export interface ExpenseSplit {
  participant_id: string
  amount: number
}

export interface Expense {
  id: string
  ledger_id: string
  payer_id: string
  participant_ids: string[]
  split_type: ExpenseSplitType
  splits: ExpenseSplit[]
  amount: number
  currency: string
  amount_in_base: number
  category: ExpenseCategory
  note: string
  expense_time: number
  create_time: number
  update_time: number
}

export interface Balance {
  participant_id: string
  balance: number
}

export interface SettlementTransfer {
  from_participant_id: string
  to_participant_id: string
  amount: number
}

export interface ReportByParticipant {
  participant_id: string
  paid_total: number
  share_total: number
  balance: number
}

export interface ReportByCategory {
  category: ExpenseCategory
  total_in_base: number
}

export interface ReportByDate {
  date: string
  total_in_base: number
}

export interface ReportByCurrency {
  currency: string
  total_original: number
  total_in_base: number
}

export interface ReportByParticipantCategory {
  participant_id: string
  category: ExpenseCategory
  paid_in_base: number
  share_in_base: number
}

export interface GetSettlementResp {
  balances: Balance[]
  transfers: SettlementTransfer[]
  base_currency: string
}

export interface GetReportResp {
  by_participant: ReportByParticipant[]
  by_category: ReportByCategory[]
  by_date: ReportByDate[]
  by_currency: ReportByCurrency[]
  total_in_base: number
  expense_count: number
  by_participant_category: ReportByParticipantCategory[]
}
