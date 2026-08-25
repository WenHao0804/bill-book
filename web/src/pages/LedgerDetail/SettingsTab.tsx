import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Form, Input, Button, Toast, Dialog, SwipeAction, Stepper } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { updateLedger, deleteLedger, updateExchangeRates } from '../../api/ledger'
import type { LedgerOutletContext } from './index'

export default function SettingsTab() {
  const { ledger, ledgerId } = useOutletContext<LedgerOutletContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newCurrency, setNewCurrency] = useState('')
  const [newRate, setNewRate] = useState(1)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ledger', ledgerId] })
    queryClient.invalidateQueries({ queryKey: ['report', ledgerId] })
    queryClient.invalidateQueries({ queryKey: ['settlement', ledgerId] })
  }

  const updateInfoMutation = useMutation({
    mutationFn: updateLedger,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已保存' })
      invalidate()
    },
  })

  const ratesMutation = useMutation({
    mutationFn: updateExchangeRates,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已保存' })
      setNewCurrency('')
      setNewRate(1)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteLedger(ledgerId),
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已删除' })
      queryClient.invalidateQueries({ queryKey: ['ledgers'] })
      navigate('/')
    },
  })

  const rates = ledger.exchange_rates.filter((r) => r.currency !== ledger.base_currency)

  const saveRate = (currency: string, rate_to_base: number) => {
    const next = rates.filter((r) => r.currency !== currency)
    if (rate_to_base > 0) next.push({ currency, rate_to_base })
    ratesMutation.mutate({ ledger_id: ledgerId, exchange_rates: next })
  }

  return (
    <>
      <Form
        layout="horizontal"
        initialValues={{ name: ledger.name, description: ledger.description }}
        onFinish={(values) => updateInfoMutation.mutate({ id: ledgerId, name: values.name, description: values.description })}
        footer={
          <Button block color="primary" type="submit" loading={updateInfoMutation.isPending}>
            保存基本信息
          </Button>
        }
      >
        <Form.Header>账本信息</Form.Header>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="账本名称" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input placeholder="选填" />
        </Form.Item>
        <Form.Item label="本位币">
          <Input value={ledger.base_currency} disabled />
        </Form.Item>
      </Form>

      <List header={`汇率表（其他币种 → ${ledger.base_currency}）`} style={{ marginTop: 12 }}>
        {rates.map((r) => (
          <SwipeAction
            key={r.currency}
            rightActions={[
              {
                key: 'delete',
                text: '删除',
                color: 'danger',
                onClick: () => saveRate(r.currency, 0),
              },
            ]}
          >
            <List.Item extra={`1 ${r.currency} = ${r.rate_to_base} ${ledger.base_currency}`}>{r.currency}</List.Item>
          </SwipeAction>
        ))}
        <List.Item
          extra={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input
                placeholder="币种，如 USD"
                value={newCurrency}
                onChange={(v) => setNewCurrency(v.toUpperCase())}
                style={{ width: 70, textAlign: 'right' }}
              />
              <Stepper value={newRate} min={0.0001} step={0.01} digits={4} onChange={(v) => setNewRate(v)} style={{ '--input-width': '70px' }} />
              <Button
                size="small"
                color="primary"
                fill="outline"
                disabled={!newCurrency || ratesMutation.isPending}
                onClick={() => saveRate(newCurrency, newRate)}
              >
                <AddOutline />
              </Button>
            </span>
          }
        >
          添加汇率
        </List.Item>
      </List>

      <div style={{ padding: '24px 16px' }}>
        <Button
          block
          color="danger"
          fill="outline"
          onClick={() => {
            Dialog.confirm({
              content: '确定删除该账本吗？此操作不可撤销，账本内的所有支出记录都会被删除。',
              onConfirm: () => deleteMutation.mutate(),
            })
          }}
        >
          删除账本
        </Button>
      </div>
    </>
  )
}
