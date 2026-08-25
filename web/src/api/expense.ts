import { post } from './client'
import type { Expense, ExpenseCategory, ExpenseSplit, ExpenseSplitType } from '../types/bill_book'

export interface CreateExpenseBody {
  ledger_id: string
  payer_id: string
  participant_ids: string[]
  split_type?: ExpenseSplitType
  splits?: ExpenseSplit[]
  amount: number
  currency: string
  category?: ExpenseCategory
  note?: string
  expense_time: number
}

export function createExpense(body: CreateExpenseBody) {
  return post<{ expense: Expense }>('/expense/create', body)
}

export function getExpense(body: { ledger_id: string; id: string }) {
  return post<{ expense: Expense }>('/expense/get', body)
}

export interface UpdateExpenseBody {
  ledger_id: string
  id: string
  payer_id?: string
  participant_ids?: string[]
  split_type?: ExpenseSplitType
  splits?: ExpenseSplit[]
  amount?: number
  currency?: string
  category?: ExpenseCategory
  note?: string
  expense_time?: number
}

export function updateExpense(body: UpdateExpenseBody) {
  return post<{ expense: Expense }>('/expense/update', body)
}

export function deleteExpense(body: { ledger_id: string; id: string }) {
  return post<Record<string, never>>('/expense/delete', body)
}

export interface ListExpensesBody {
  ledger_id: string
  category?: ExpenseCategory
  participant_id?: string
  start_time?: number
  end_time?: number
  page?: number
  page_size?: number
}

export function listExpenses(body: ListExpensesBody) {
  return post<{ expenses: Expense[]; total_count: number }>('/expense/list', body)
}
