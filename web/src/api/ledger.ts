import { post } from './client'
import type { ExchangeRate, Ledger } from '../types/bill_book'

export function createLedger(body: { name: string; description?: string; base_currency: string }) {
  return post<{ ledger: Ledger }>('/ledger/create', body)
}

export function getLedger(id: string) {
  return post<{ ledger: Ledger }>('/ledger/get', { id })
}

export function updateLedger(body: { id: string; name?: string; description?: string }) {
  return post<{ ledger: Ledger }>('/ledger/update', body)
}

export function deleteLedger(id: string) {
  return post<Record<string, never>>('/ledger/delete', { id })
}

export function listLedgers() {
  return post<{ ledgers: Ledger[] }>('/ledger/list', {})
}

export function updateExchangeRates(body: { ledger_id: string; exchange_rates: ExchangeRate[] }) {
  return post<{ ledger: Ledger }>('/exchange_rate/update', body)
}
