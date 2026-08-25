import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { List, SwipeAction, Empty, FloatingBubble, Toast, Dialog, Tag, ActionSheet } from 'antd-mobile'
import { AddOutline, DownFill } from 'antd-mobile-icons'
import { listExpenses, deleteExpense } from '../../api/expense'
import { CATEGORY_LABELS } from '../../types/bill_book'
import { formatMoney } from '../../utils/money'
import type { LedgerOutletContext } from './index'

type SortKey = 'time_desc' | 'time_asc' | 'amount_desc' | 'amount_asc'

const SORT_OPTIONS: { key: SortKey; text: string }[] = [
  { key: 'time_desc', text: '按时间：最新在前' },
  { key: 'time_asc', text: '按时间：最早在前' },
  { key: 'amount_desc', text: '按金额：从高到低' },
  { key: 'amount_asc', text: '按金额：从低到高' },
]

export default function ExpensesTab() {
  const { ledger, ledgerId } = useOutletContext<LedgerOutletContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>('time_desc')
  const [sortSheetVisible, setSortSheetVisible] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', ledgerId],
    queryFn: () => listExpenses({ ledger_id: ledgerId, page: 1, page_size: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense({ ledger_id: ledgerId, id }),
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已删除' })
      queryClient.invalidateQueries({ queryKey: ['expenses', ledgerId] })
      queryClient.invalidateQueries({ queryKey: ['report', ledgerId] })
      queryClient.invalidateQueries({ queryKey: ['settlement', ledgerId] })
    },
  })

  const nameOf = (id: string) => ledger.participants.find((p) => p.id === id)?.name ?? '未知'

  const expenses = data?.expenses ?? []
  const sorted = [...expenses].sort((a, b) => {
    switch (sortKey) {
      case 'time_asc':
        return a.expense_time - b.expense_time
      case 'amount_desc':
        return b.amount_in_base - a.amount_in_base
      case 'amount_asc':
        return a.amount_in_base - b.amount_in_base
      case 'time_desc':
      default:
        return b.expense_time - a.expense_time
    }
  })

  const showSortSheet = () => setSortSheetVisible(true)

  return (
    <>
      {ledger.locked && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: 13,
            color: 'var(--adm-color-weak)',
            background: 'var(--adm-color-fill-content)',
          }}
        >
          🔒 账本已锁定，无法新增或修改支出
        </div>
      )}
      {sorted.length > 0 && (
        <div
          onClick={showSortSheet}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            padding: '8px 16px',
            fontSize: 13,
            color: 'var(--adm-color-weak)',
          }}
        >
          <span>{SORT_OPTIONS.find((o) => o.key === sortKey)?.text}</span>
          <DownFill fontSize={10} />
        </div>
      )}
      {!isLoading && sorted.length === 0 && (
        <Empty description="还没有支出记录" style={{ padding: '64px 0' }} />
      )}
      {sorted.length > 0 && (
        <List>
          {sorted.map((expense) => (
            <SwipeAction
              key={expense.id}
              rightActions={
                ledger.locked
                  ? []
                  : [
                      {
                        key: 'delete',
                        text: '删除',
                        color: 'danger',
                        onClick: () => setDeleteTargetId(expense.id),
                      },
                    ]
              }
            >
              <List.Item
                onClick={() => navigate(`/ledger/${ledgerId}/expense/${expense.id}/edit`)}
                title={
                  <span>
                    {expense.note || CATEGORY_LABELS[expense.category]}{' '}
                    <Tag color="primary" fill="outline">
                      {CATEGORY_LABELS[expense.category]}
                    </Tag>
                  </span>
                }
                description={`${nameOf(expense.payer_id)} 付款 · ${new Date(expense.expense_time * 1000).toLocaleDateString()}`}
                extra={formatMoney(expense.amount, expense.currency)}
              />
            </SwipeAction>
          ))}
        </List>
      )}

      <Dialog
        visible={deleteTargetId !== null}
        content="确定删除这条支出记录吗？"
        closeOnAction
        actions={[
          { key: 'cancel', text: '取消' },
          {
            key: 'confirm',
            text: '删除',
            danger: true,
            onClick: () => {
              if (deleteTargetId) deleteMutation.mutate(deleteTargetId)
            },
          },
        ]}
        onClose={() => setDeleteTargetId(null)}
        onAction={() => setDeleteTargetId(null)}
      />

      <ActionSheet
        visible={sortSheetVisible}
        actions={SORT_OPTIONS.map((o) => ({ key: o.key, text: o.text, bold: o.key === sortKey }))}
        onAction={(action) => {
          setSortKey(action.key as SortKey)
          setSortSheetVisible(false)
        }}
        onClose={() => setSortSheetVisible(false)}
        closeOnAction
        cancelText="取消"
      />

      <FloatingBubble
        style={
          {
            '--initial-position-bottom': '84px',
            '--initial-position-right': '24px',
            opacity: ledger.locked ? 0.4 : 1,
          } as React.CSSProperties
        }
        onClick={() =>
          ledger.locked
            ? Toast.show({ content: '账本已锁定，无法新增支出' })
            : navigate(`/ledger/${ledgerId}/expense/new`)
        }
      >
        <AddOutline fontSize={28} />
      </FloatingBubble>
    </>
  )
}
