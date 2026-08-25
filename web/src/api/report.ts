import { post } from './client'
import type { GetReportResp } from '../types/bill_book'

export function getReport(ledgerId: string) {
  return post<GetReportResp>('/report/get', { ledger_id: ledgerId })
}
