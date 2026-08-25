import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { List, NavBar, Empty, FloatingBubble, Popup, Form, Input, Selector, Button, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { createLedger, listLedgers } from '../../api/ledger'
import { OTHER_CURRENCY, currencySelectorOptions } from '../../utils/currency'
import { clearApiKey } from '../../utils/auth'

export default function LedgerList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)
  const [currencyChoice, setCurrencyChoice] = useState('CNY')
  const [customCurrency, setCustomCurrency] = useState('')
  const baseCurrency = currencyChoice === OTHER_CURRENCY ? customCurrency.trim().toUpperCase() : currencyChoice

  const { data, isLoading } = useQuery({
    queryKey: ['ledgers'],
    queryFn: listLedgers,
  })

  const createMutation = useMutation({
    mutationFn: createLedger,
    onSuccess: (resp) => {
      Toast.show({ icon: 'success', content: '账本已创建' })
      setCreateVisible(false)
      setCurrencyChoice('CNY')
      setCustomCurrency('')
      queryClient.invalidateQueries({ queryKey: ['ledgers'] })
      navigate(`/ledger/${resp.ledger.id}`)
    },
  })

  const ledgers = data?.ledgers ?? []

  const handleLogout = () => {
    clearApiKey()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page">
      <NavBar back={null} right={<span onClick={handleLogout}>退出</span>}>
        我的账本
      </NavBar>
      <div className="page-content">
        {!isLoading && ledgers.length === 0 && (
          <Empty description="还没有账本，点击右下角创建一个" style={{ padding: '64px 0' }} />
        )}
        {ledgers.length > 0 && (
          <List>
            {ledgers.map((ledger) => (
              <List.Item
                key={ledger.id}
                description={ledger.description || `${ledger.participants.length} 位成员 · ${ledger.base_currency}`}
                arrow
                onClick={() => navigate(`/ledger/${ledger.id}`)}
              >
                {ledger.name}
              </List.Item>
            ))}
          </List>
        )}
      </div>

      <FloatingBubble
        style={{ '--initial-position-bottom': '24px', '--initial-position-right': '24px' } as React.CSSProperties}
        onClick={() => setCreateVisible(true)}
      >
        <AddOutline fontSize={28} />
      </FloatingBubble>

      <Popup
        visible={createVisible}
        onMaskClick={() => setCreateVisible(false)}
        onClose={() => setCreateVisible(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        <Form
          layout="horizontal"
          footer={
            <Button block color="primary" type="submit" loading={createMutation.isPending} disabled={!baseCurrency}>
              创建账本
            </Button>
          }
          onFinish={(values) => {
            createMutation.mutate({
              name: values.name,
              description: values.description,
              base_currency: baseCurrency,
            })
          }}
        >
          <Form.Header>新建账本</Form.Header>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入账本名称' }]}>
            <Input placeholder="例如：日本七天六夜" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item label="本位币">
            <Selector
              columns={4}
              options={currencySelectorOptions()}
              value={[currencyChoice]}
              onChange={(v) => setCurrencyChoice((v[0] as string) ?? 'CNY')}
            />
          </Form.Item>
          {currencyChoice === OTHER_CURRENCY && (
            <Form.Item label="币种代码">
              <Input
                placeholder="例如：SGD"
                value={customCurrency}
                onChange={(v) => setCustomCurrency(v.toUpperCase())}
              />
            </Form.Item>
          )}
        </Form>
      </Popup>
    </div>
  )
}
