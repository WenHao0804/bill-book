import { post } from './client'
import type { GetSettlementResp } from '../types/bill_book'

export function getSettlement(ledgerId: string) {
  return post<GetSettlementResp>('/settlement/get', { ledger_id: ledgerId })
}
