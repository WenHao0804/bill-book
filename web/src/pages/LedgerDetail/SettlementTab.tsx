import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SpinLoading, Empty, List, Tag } from 'antd-mobile'
import { CheckCircleOutline } from 'antd-mobile-icons'
import { getSettlement } from '../../api/settlement'
import { formatMoney, formatSignedMoney } from '../../utils/money'
import type { LedgerOutletContext } from './index'

export default function SettlementTab() {
  const { ledger, ledgerId } = useOutletContext<LedgerOutletContext>()

  const { data, isLoading } = useQuery({
    queryKey: ['settlement', ledgerId],
    queryFn: () => getSettlement(ledgerId),
  })

  const nameOf = (id: string) => ledger.participants.find((p) => p.id === id)?.name ?? '未知'

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <SpinLoading />
      </div>
    )
  }

  if (!data) return null

  const balances = data.balances.slice().sort((a, b) => b.balance - a.balance)

  return (
    <div style={{ padding: '12px 0 32px' }}>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>成员余额</div>
        {balances.map((b) => (
          <div key={b.participant_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
            <span>{nameOf(b.participant_id)}</span>
            <span style={{ color: b.balance >= 0 ? 'var(--positive-color)' : 'var(--negative-color)', fontWeight: 500 }}>
              {formatSignedMoney(b.balance, data.base_currency)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 8px' }}>转账建议</div>
      {data.transfers.length === 0 ? (
        <Empty
          image={<CheckCircleOutline fontSize={48} color="#00b578" />}
          description="所有人已结清，无需转账"
          style={{ padding: '48px 0' }}
        />
      ) : (
        <List className="list-card">
          {data.transfers.map((t, i) => (
            <List.Item key={i} description={`转账 ${formatMoney(t.amount, data.base_currency)}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag color="danger" fill="outline">{nameOf(t.from_participant_id)}</Tag>
                <span>→</span>
                <Tag color="success" fill="outline">{nameOf(t.to_participant_id)}</Tag>
              </span>
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}
