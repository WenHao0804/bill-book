import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { List, SwipeAction, FloatingBubble, Popup, Form, Input, Button, Toast, Dialog } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { createParticipant, updateParticipant, deleteParticipant } from '../../api/participant'
import { colorForName } from '../../utils/money'
import type { Participant } from '../../types/bill_book'
import type { LedgerOutletContext } from './index'

export default function MembersTab() {
  const { ledger, ledgerId } = useOutletContext<LedgerOutletContext>()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Participant | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ledger', ledgerId] })
    queryClient.invalidateQueries({ queryKey: ['report', ledgerId] })
    queryClient.invalidateQueries({ queryKey: ['settlement', ledgerId] })
  }

  const createMutation = useMutation({
    mutationFn: createParticipant,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已添加' })
      setCreating(false)
      invalidate()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateParticipant,
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已保存' })
      setEditing(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteParticipant({ ledger_id: ledgerId, id }),
    onSuccess: () => {
      Toast.show({ icon: 'success', content: '已删除' })
      invalidate()
    },
  })

  return (
    <>
      <List header={`成员（${ledger.participants.length}）`}>
        {ledger.participants.map((p) => (
          <SwipeAction
            key={p.id}
            rightActions={[
              {
                key: 'delete',
                text: '删除',
                color: 'danger',
                onClick: () => setDeleteTarget(p),
              },
            ]}
          >
            <List.Item
              prefix={
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: colorForName(p.name),
                    color: '#fff',
                    fontSize: 14,
                  }}
                >
                  {p.name.slice(0, 1)}
                </span>
              }
              onClick={() => setEditing(p)}
              arrow
            >
              {p.name}
            </List.Item>
          </SwipeAction>
        ))}
      </List>

      <FloatingBubble
        style={{ '--initial-position-bottom': '84px', '--initial-position-right': '24px' } as React.CSSProperties}
        onClick={() => setCreating(true)}
      >
        <AddOutline fontSize={28} />
      </FloatingBubble>

      <Popup
        visible={creating}
        onMaskClick={() => setCreating(false)}
        onClose={() => setCreating(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        <Form
          footer={
            <Button block color="primary" type="submit" loading={createMutation.isPending}>
              添加
            </Button>
          }
          onFinish={(values) => createMutation.mutate({ ledger_id: ledgerId, name: values.name })}
        >
          <Form.Header>添加成员</Form.Header>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="例如：小明" />
          </Form.Item>
        </Form>
      </Popup>

      <Popup
        visible={!!editing}
        onMaskClick={() => setEditing(null)}
        onClose={() => setEditing(null)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        {editing && (
          <Form
            key={editing.id}
            initialValues={{ name: editing.name }}
            footer={
              <Button block color="primary" type="submit" loading={updateMutation.isPending}>
                保存
              </Button>
            }
            onFinish={(values) => updateMutation.mutate({ ledger_id: ledgerId, id: editing.id, name: values.name })}
          >
            <Form.Header>编辑成员</Form.Header>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="姓名" />
            </Form.Item>
          </Form>
        )}
      </Popup>

      <Dialog
        visible={deleteTarget !== null}
        content={`确定删除成员「${deleteTarget?.name}」吗？`}
        closeOnAction
        actions={[
          { key: 'cancel', text: '取消' },
          {
            key: 'confirm',
            text: '删除',
            danger: true,
            onClick: () => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
            },
          },
        ]}
        onClose={() => setDeleteTarget(null)}
        onAction={() => setDeleteTarget(null)}
      />
    </>
  )
}
