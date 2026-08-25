import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { List, SwipeAction, Empty, FloatingBubble, Toast, Dialog, Tag } from 'antd-mobile'
import { AddOutline, LockOutline } from 'antd-mobile-icons'
import { listExpenses, deleteExpense } from '../../api/expense'
import { CATEGORY_LABELS, ExpenseSplitType } from '../../types/bill_book'
import { formatMoney } from '../../utils/money'
import { downloadCsv } from '../../utils/csv'
import type { LedgerOutletContext } from './index'

type SortKey = 'time_desc' | 'time_asc' | 'amount_desc' | 'amount_asc'

const SORT_OPTIONS: { key: SortKey; text: string }[] = [
  { key: 'time_desc', text: '按时间：最新在前' },
  { key: 'time_asc', text: '按时间：最早在前' },
  { key: 'amount_desc', text: '按金额：从高到低' },
  { key: 'amount_asc', text: '按金额：从低到高' },
]

export default function ExpensesTab() {
  const { ledger, ledgerId, setMoreActions } = useOutletContext<LedgerOutletContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>('time_desc')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

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

  const handleExport = async () => {
    if (exporting) return
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      Dialog.alert({
        content: '微信内置浏览器不支持直接下载文件，请点击右上角"···"选择"在浏览器打开"后重试导出',
        confirmText: '知道了',
      })
      return
    }
    setExporting(true)
    Toast.show({ icon: 'loading', content: '导出中...', duration: 0 })
    try {
      const pageSize = 200
      let page = 1
      let all: typeof expenses = []
      while (true) {
        const resp = await listExpenses({ ledger_id: ledgerId, page, page_size: pageSize })
        all = all.concat(resp.expenses)
        if (resp.expenses.length === 0 || all.length >= resp.total_count) break
        page += 1
      }
      if (all.length === 0) {
        Toast.show({ content: '没有可导出的支出记录' })
        return
      }
      const headers = ['日期', '分类', '备注', '付款人', '金额', '币种', `折算(${ledger.base_currency})`, '参与人', '分摊明细']
      const rows = [...all]
        .sort((a, b) => a.expense_time - b.expense_time)
        .map((e) => [
          new Date(e.expense_time * 1000).toLocaleDateString(),
          CATEGORY_LABELS[e.category],
          e.note,
          nameOf(e.payer_id),
          e.amount.toFixed(2),
          e.currency,
          e.amount_in_base.toFixed(2),
          e.participant_ids.map(nameOf).join('、'),
          e.split_type === ExpenseSplitType.Custom
            ? e.splits.map((s) => `${nameOf(s.participant_id)}:${s.amount.toFixed(2)}`).join('; ')
            : '平均分摊',
        ])
      downloadCsv(`${ledger.name}-支出明细-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
      Toast.show({ icon: 'success', content: `已导出 ${all.length} 条记录` })
    } catch {
      Toast.show({ icon: 'fail', content: '导出失败，请重试' })
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    setMoreActions([
      { key: 'export', text: '导出 CSV', onClick: handleExport },
      ...SORT_OPTIONS.map((o) => ({ key: o.key, text: o.text, bold: o.key === sortKey, onClick: () => setSortKey(o.key) })),
    ])
    return () => setMoreActions([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, ledgerId])

  return (
    <>
      {ledger.locked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--adm-color-weak)',
            background: 'var(--adm-color-fill-content)',
            borderRadius: 10,
          }}
        >
          <LockOutline />
          账本已锁定，无法新增或修改支出
        </div>
      )}
      {!isLoading && sorted.length === 0 && (
        <Empty description="还没有支出记录" style={{ padding: '64px 0' }} />
      )}
      {sorted.length > 0 && (
        <List className="list-card" style={{ marginTop: ledger.locked ? 12 : 8 }}>
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
