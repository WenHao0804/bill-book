import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavBar, List, Input, Selector, Button, Toast, SpinLoading, DatePicker, TextArea, Picker } from 'antd-mobile'
import { LockOutline } from 'antd-mobile-icons'
import { getLedger } from '../../api/ledger'
import { getExpense, createExpense, updateExpense } from '../../api/expense'
import { ExpenseSplitType, ExpenseCategory, CATEGORY_OPTIONS } from '../../types/bill_book'

export default function ExpenseForm() {
  const { id: ledgerId, expenseId } = useParams<{ id: string; expenseId?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!expenseId

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['ledger', ledgerId],
    queryFn: () => getLedger(ledgerId!),
    enabled: !!ledgerId,
  })

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['expense', ledgerId, expenseId],
    queryFn: () => getExpense({ ledger_id: ledgerId!, id: expenseId! }),
    enabled: !!ledgerId && !!expenseId,
  })

  const [payerId, setPayerId] = useState<string>('')
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [splitType, setSplitType] = useState<ExpenseSplitType>(ExpenseSplitType.Equal)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Other)
  const [note, setNote] = useState('')
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [expenseDate, setExpenseDate] = useState(new Date())
  const [initialized, setInitialized] = useState(false)

  const ledger = ledgerData?.ledger

  useEffect(() => {
    if (!ledger || initialized) return
    if (isEdit) {
      if (!expenseData) return
      const e = expenseData.expense
      setPayerId(e.payer_id)
      setParticipantIds(e.participant_ids)
      setSplitType(e.split_type)
      setCustomSplits(Object.fromEntries(e.splits.map((s) => [s.participant_id, String(s.amount)])))
      setAmount(String(e.amount))
      setCurrency(e.currency)
      setCategory(e.category)
      setNote(e.note)
      setExpenseDate(new Date(e.expense_time * 1000))
    } else {
      setPayerId(ledger.participants[0]?.id ?? '')
      setParticipantIds(ledger.participants.map((p) => p.id))
      setCurrency(ledger.base_currency)
    }
    setInitialized(true)
  }, [ledger, expenseData, isEdit, initialized])

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已保存' })
      queryClient.invalidateQueries({ queryKey: ['expenses', ledgerId] })
      queryClient.invalidateQueries({ queryKey: ['report', ledgerId] })
      queryClient.invalidateQueries({ queryKey: ['settlement', ledgerId] })
      navigate(-1)
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已保存' })
      queryClient.invalidateQueries({ queryKey: ['expenses', ledgerId] })
      queryClient.invalidateQueries({ queryKey: ['expense', ledgerId, expenseId] })
      queryClient.invalidateQueries({ queryKey: ['report', ledgerId] })
      queryClient.invalidateQueries({ queryKey: ['settlement', ledgerId] })
      navigate(-1)
    },
  })

  if (ledgerLoading || (isEdit && expenseLoading) || !ledger || !initialized) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading />
      </div>
    )
  }

  const parsedAmount = Number(amount)
  const customSum = participantIds.reduce((sum, pid) => sum + (Number(customSplits[pid]) || 0), 0)

  const handleSubmit = () => {
    if (!payerId) {
      Toast.show({ content: '请选择付款人' })
      return
    }
    if (participantIds.length === 0) {
      Toast.show({ content: '请选择至少一位参与人' })
      return
    }
    if (!amount || !(parsedAmount > 0)) {
      Toast.show({ content: '请输入有效金额' })
      return
    }
    if (!currency.trim()) {
      Toast.show({ content: '请选择币种' })
      return
    }

    let splits: { participant_id: string; amount: number }[] | undefined
    if (splitType === ExpenseSplitType.Custom) {
      if (Math.abs(customSum - parsedAmount) > 0.01) {
        Toast.show({ content: `自定义分摊金额合计（${customSum.toFixed(2)}）需等于总金额（${parsedAmount.toFixed(2)}）` })
        return
      }
      splits = participantIds.map((pid) => ({ participant_id: pid, amount: Number(customSplits[pid]) || 0 }))
    }

    const body = {
      ledger_id: ledgerId!,
      payer_id: payerId,
      participant_ids: participantIds,
      split_type: splitType,
      splits,
      amount: parsedAmount,
      currency: currency.trim().toUpperCase(),
      category,
      note: note.trim(),
      expense_time: Math.floor(expenseDate.getTime() / 1000),
    }

    if (isEdit) {
      updateMutation.mutate({ ...body, id: expenseId! })
    } else {
      createMutation.mutate(body)
    }
  }

  const participantOptions = ledger.participants.map((p) => ({ label: p.name, value: p.id }))
  const currencyOptions = Array.from(new Set([ledger.base_currency, ...ledger.exchange_rates.map((r) => r.currency)]))
  const saving = createMutation.isPending || updateMutation.isPending
  const locked = ledger.locked

  return (
    <div className="page">
      <NavBar className="app-navbar" onBack={() => navigate(-1)}>{isEdit ? '编辑支出' : '新建支出'}</NavBar>
      <div className="page-content">
        {locked && (
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
            账本已锁定，仅可查看
          </div>
        )}
        <List className="list-card" header="金额">
          <List.Item>
            <Input
              placeholder="0.00"
              type="number"
              value={amount}
              onChange={setAmount}
              disabled={locked}
              style={{ fontSize: 22, fontWeight: 600 }}
            />
          </List.Item>
          <List.Item onClick={() => !locked && setCurrencyPickerVisible(true)} extra={currency || '请选择'}>
            币种
          </List.Item>
        </List>

        <List className="list-card" header="付款人">
          <List.Item>
            <Selector
              disabled={locked}
              options={participantOptions}
              value={payerId ? [payerId] : []}
              onChange={(v) => setPayerId(v[0] ?? '')}
            />
          </List.Item>
        </List>

        <List className="list-card" header="参与分摊">
          <List.Item>
            <Selector
              disabled={locked}
              multiple
              options={participantOptions}
              value={participantIds}
              onChange={(v) => setParticipantIds(v)}
            />
          </List.Item>
          <List.Item>
            <Selector
              disabled={locked}
              options={[
                { label: '平均分摊', value: ExpenseSplitType.Equal },
                { label: '自定义分摊', value: ExpenseSplitType.Custom },
              ]}
              value={[splitType]}
              onChange={(v) => setSplitType((v[0] ?? ExpenseSplitType.Equal) as ExpenseSplitType)}
            />
          </List.Item>
          {splitType === ExpenseSplitType.Custom &&
            participantIds.map((pid) => {
              const p = ledger.participants.find((pp) => pp.id === pid)
              return (
                <List.Item
                  key={pid}
                  extra={
                    <Input
                      placeholder="0.00"
                      type="number"
                      value={customSplits[pid] ?? ''}
                      onChange={(v) => setCustomSplits((prev) => ({ ...prev, [pid]: v }))}
                      disabled={locked}
                      style={{ textAlign: 'right', width: 90 }}
                    />
                  }
                >
                  {p?.name}
                </List.Item>
              )
            })}
          {splitType === ExpenseSplitType.Custom && (
            <List.Item>
              <span style={{ color: Math.abs(customSum - parsedAmount) > 0.01 ? 'var(--negative-color)' : 'var(--positive-color)', fontSize: 13 }}>
                合计 {customSum.toFixed(2)} / {isNaN(parsedAmount) ? '0.00' : parsedAmount.toFixed(2)}
              </span>
            </List.Item>
          )}
        </List>

        <List className="list-card" header="分类与备注">
          <List.Item>
            <Selector
              disabled={locked}
              options={CATEGORY_OPTIONS}
              value={[category]}
              onChange={(v) => setCategory((v[0] ?? ExpenseCategory.Other) as ExpenseCategory)}
            />
          </List.Item>
          <List.Item>
            <TextArea placeholder="备注（选填）" value={note} onChange={setNote} disabled={locked} rows={2} />
          </List.Item>
          <List.Item onClick={() => !locked && setDatePickerVisible(true)} extra={expenseDate.toLocaleDateString()}>
            日期
          </List.Item>
        </List>

        <div style={{ padding: '24px 0' }}>
          <Button block color="primary" loading={saving} disabled={locked} onClick={handleSubmit}>
            保存
          </Button>
        </div>
      </div>

      <Picker
        columns={[currencyOptions.map((c) => ({ label: c, value: c }))]}
        visible={currencyPickerVisible}
        value={[currency]}
        onClose={() => setCurrencyPickerVisible(false)}
        onConfirm={(v) => setCurrency((v[0] as string) ?? currency)}
      />

      <DatePicker
        visible={datePickerVisible}
        value={expenseDate}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(v) => setExpenseDate(v)}
      />
    </div>
  )
}
