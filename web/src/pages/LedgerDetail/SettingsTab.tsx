import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Form, Input, Selector, Stepper, Button, Toast, Dialog, SwipeAction, Popup, Switch } from 'antd-mobile'
import { updateLedger, deleteLedger, updateExchangeRates } from '../../api/ledger'
import { OTHER_CURRENCY, currencySelectorOptions } from '../../utils/currency'
import type { LedgerOutletContext } from './index'

export default function SettingsTab() {
  const { ledger, ledgerId } = useOutletContext<LedgerOutletContext>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [addRateVisible, setAddRateVisible] = useState(false)
  const [currencyChoice, setCurrencyChoice] = useState('')
  const [customCurrency, setCustomCurrency] = useState('')
  const [newRate, setNewRate] = useState(1)
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)

  const rates = ledger.exchange_rates.filter((r) => r.currency !== ledger.base_currency)
  const newCurrency = currencyChoice === OTHER_CURRENCY ? customCurrency.trim().toUpperCase() : currencyChoice

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
      setAddRateVisible(false)
      setCurrencyChoice('')
      setCustomCurrency('')
      setNewRate(1)
      invalidate()
    },
  })

  const lockMutation = useMutation({
    mutationFn: updateLedger,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已保存' })
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
        <List.Item onClick={() => setAddRateVisible(true)} arrow>
          添加汇率
        </List.Item>
      </List>

      <List header="账本管理" style={{ marginTop: 12 }}>
        <List.Item
          extra={
            <Switch
              checked={ledger.locked}
              loading={lockMutation.isPending}
              onChange={(checked) => lockMutation.mutate({ id: ledgerId, locked: checked })}
            />
          }
          description="锁定后将无法新增、编辑或删除支出记录"
        >
          锁定账本
        </List.Item>
      </List>

      <div style={{ padding: '24px 16px' }}>
        <Button
          block
          color="danger"
          fill="outline"
          onClick={() => setDeleteConfirmVisible(true)}
        >
          删除账本
        </Button>
      </div>

      <Popup
        visible={addRateVisible}
        onMaskClick={() => setAddRateVisible(false)}
        onClose={() => setAddRateVisible(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        <List header={`添加汇率（→ ${ledger.base_currency}）`}>
          <List.Item>
            <Selector
              columns={4}
              options={currencySelectorOptions([ledger.base_currency, ...rates.map((r) => r.currency)])}
              value={currencyChoice ? [currencyChoice] : []}
              onChange={(v) => setCurrencyChoice((v[0] as string) ?? '')}
            />
          </List.Item>
          {currencyChoice === OTHER_CURRENCY && (
            <List.Item>
              <Input
                placeholder="输入币种代码，如 SGD"
                value={customCurrency}
                onChange={(v) => setCustomCurrency(v.toUpperCase())}
              />
            </List.Item>
          )}
          <List.Item extra={`1 ${newCurrency || '?'} =`}>
            <Stepper value={newRate} min={0.0001} step={0.01} digits={4} onChange={(v) => setNewRate(v)} />
          </List.Item>
        </List>
        <div style={{ padding: '16px' }}>
          <Button
            block
            color="primary"
            loading={ratesMutation.isPending}
            disabled={!newCurrency}
            onClick={() => saveRate(newCurrency, newRate)}
          >
            保存
          </Button>
        </div>
      </Popup>

      <Dialog
        visible={deleteConfirmVisible}
        content="确定删除该账本吗？此操作不可撤销，账本内的所有支出记录都会被删除。"
        closeOnAction
        actions={[
          { key: 'cancel', text: '取消' },
          {
            key: 'confirm',
            text: '删除',
            danger: true,
            onClick: () => deleteMutation.mutate(),
          },
        ]}
        onClose={() => setDeleteConfirmVisible(false)}
        onAction={() => setDeleteConfirmVisible(false)}
      />
    </>
  )
}
