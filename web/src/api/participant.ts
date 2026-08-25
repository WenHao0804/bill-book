import { post } from './client'
import type { Participant } from '../types/bill_book'

export function createParticipant(body: { ledger_id: string; name: string; color?: string }) {
  return post<{ participant: Participant }>('/participant/create', body)
}

export function updateParticipant(body: {
  ledger_id: string
  id: string
  name?: string
  color?: string
}) {
  return post<{ participant: Participant }>('/participant/update', body)
}

export function deleteParticipant(body: { ledger_id: string; id: string }) {
  return post<Record<string, never>>('/participant/delete', body)
}
