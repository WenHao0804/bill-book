import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { List, NavBar, Empty, FloatingBubble, Popup, Form, Input, Button, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { createLedger, listLedgers } from '../../api/ledger'

const COMMON_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'THB', 'KRW']

export default function LedgerList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['ledgers'],
    queryFn: listLedgers,
  })

  const createMutation = useMutation({
    mutationFn: createLedger,
    onSuccess: (resp) => {
      Toast.show({ icon: 'success', content: '账本已创建' })
      setCreateVisible(false)
      queryClient.invalidateQueries({ queryKey: ['ledgers'] })
      navigate(`/ledger/${resp.ledger.id}`)
    },
  })

  const ledgers = data?.ledgers ?? []

  return (
    <div className="page">
      <NavBar back={null}>我的账本</NavBar>
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
            <Button block color="primary" type="submit" loading={createMutation.isPending}>
              创建账本
            </Button>
          }
          onFinish={(values) => {
            createMutation.mutate({
              name: values.name,
              description: values.description,
              base_currency: values.base_currency,
            })
          }}
          initialValues={{ base_currency: 'CNY' }}
        >
          <Form.Header>新建账本</Form.Header>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入账本名称' }]}>
            <Input placeholder="例如：日本七天六夜" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item
            name="base_currency"
            label="本位币"
            rules={[{ required: true, message: '请输入本位币' }]}
            extra={COMMON_CURRENCIES.join(' / ')}
          >
            <Input placeholder="例如：CNY" />
          </Form.Item>
        </Form>
      </Popup>
    </div>
  )
}
