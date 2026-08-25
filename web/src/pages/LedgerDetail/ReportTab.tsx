import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SpinLoading, Empty, CapsuleTabs } from 'antd-mobile'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { getReport } from '../../api/report'
import { listExpenses } from '../../api/expense'
import { CATEGORY_LABELS } from '../../types/bill_book'
import { formatMoney } from '../../utils/money'
import type { LedgerOutletContext } from './index'

const CATEGORY_COLORS = ['#1677ff', '#ff8f1f', '#00b578', '#ff3141', '#a259ff', '#00c2c2', '#f759ab']

export default function ReportTab() {
  const { ledger, ledgerId } = useOutletContext<LedgerOutletContext>()
  const [categoryMetric, setCategoryMetric] = useState<'paid' | 'share'>('paid')
  const [hiddenPieCategories, setHiddenPieCategories] = useState<Set<string>>(new Set())
  const [hiddenBarCategories, setHiddenBarCategories] = useState<Set<string>>(new Set())

  const togglePieCategory = (name: string) => {
    setHiddenPieCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleBarCategory = (name: string) => {
    setHiddenBarCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['report', ledgerId],
    queryFn: () => getReport(ledgerId),
  })

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', ledgerId],
    queryFn: () => listExpenses({ ledger_id: ledgerId, page: 1, page_size: 200 }),
  })

  const nameOf = (id: string) => ledger.participants.find((p) => p.id === id)?.name ?? '未知'

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <SpinLoading />
      </div>
    )
  }

  const report = data
  if (!report || report.expense_count === 0) {
    return <Empty description="暂无支出数据" style={{ padding: '64px 0' }} />
  }

  const byCategory = report.by_category
    .filter((c) => c.total_in_base > 0)
    .sort((a, b) => b.total_in_base - a.total_in_base)
    .map((c, i) => ({
      name: CATEGORY_LABELS[c.category],
      value: c.total_in_base,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))

  const visibleByCategory = byCategory.filter((c) => !hiddenPieCategories.has(c.name))

  const byDate = report.by_date.slice().sort((a, b) => (a.date < b.date ? -1 : 1))

  const byCurrency = report.by_currency.slice().sort((a, b) => b.total_in_base - a.total_in_base)

  const presentCategories = Array.from(new Set(report.by_participant_category.map((c) => c.category))).sort(
    (a, b) => a - b,
  )

  const byParticipantCategoryData = report.by_participant
    .slice()
    .sort((a, b) => b.paid_total - a.paid_total)
    .map((p) => {
      const row: Record<string, string | number> = { name: nameOf(p.participant_id) }
      for (const c of presentCategories) row[CATEGORY_LABELS[c]] = 0
      report.by_participant_category
        .filter((pc) => pc.participant_id === p.participant_id)
        .forEach((pc) => {
          row[CATEGORY_LABELS[pc.category]] = categoryMetric === 'paid' ? pc.paid_in_base : pc.share_in_base
        })
      return row
    })

  const categoryLegendItems = presentCategories.map((c, i) => ({
    name: CATEGORY_LABELS[c],
    value: report.by_participant_category
      .filter((pc) => pc.category === c)
      .reduce((sum, pc) => sum + (categoryMetric === 'paid' ? pc.paid_in_base : pc.share_in_base), 0),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  const topExpenses = (expensesData?.expenses ?? [])
    .slice()
    .sort((a, b) => b.amount_in_base - a.amount_in_base)
    .slice(0, 5)

  return (
    <div style={{ padding: '12px 0 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--adm-color-weak)' }}>总支出（{ledger.base_currency}）</div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>{formatMoney(report.total_in_base, ledger.base_currency)}</div>
        <div style={{ fontSize: 12, color: 'var(--adm-color-weak)' }}>共 {report.expense_count} 笔</div>
      </div>

      <Section title="分类占比">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={visibleByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {visibleByCategory.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v), ledger.base_currency)} />
          </PieChart>
        </ResponsiveContainer>
        <Legend
          items={byCategory}
          formatValue={(v) => formatMoney(v, ledger.base_currency)}
          onItemClick={togglePieCategory}
          hiddenNames={hiddenPieCategories}
        />
      </Section>

      <Section title="成员消费分类">
        <CapsuleTabs
          activeKey={categoryMetric}
          onChange={(key) => setCategoryMetric(key as 'paid' | 'share')}
          style={{ marginBottom: 8, '--adm-color-primary': '#1677ff' } as React.CSSProperties}
        >
          <CapsuleTabs.Tab title="按实付" key="paid" />
          <CapsuleTabs.Tab title="按分摊" key="share" />
        </CapsuleTabs>
        <ResponsiveContainer width="100%" height={Math.max(160, byParticipantCategoryData.length * 44)}>
          <BarChart data={byParticipantCategoryData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={60} />
            <Tooltip
              content={({ active, label, payload }) => (
                <MemberCategoryTooltip
                  active={active}
                  label={label !== undefined ? String(label) : undefined}
                  payload={
                    payload as unknown as { name?: string; value?: number; color?: string }[] | undefined
                  }
                  formatValue={(v: number) => formatMoney(v, ledger.base_currency)}
                />
              )}
            />
            {presentCategories
              .filter((c) => !hiddenBarCategories.has(CATEGORY_LABELS[c]))
              .map((c, i, visible) => (
                <Bar
                  key={c}
                  dataKey={CATEGORY_LABELS[c]}
                  name={CATEGORY_LABELS[c]}
                  stackId="category"
                  fill={CATEGORY_COLORS[presentCategories.indexOf(c) % CATEGORY_COLORS.length]}
                  radius={i === visible.length - 1 ? [0, 4, 4, 0] : undefined}
                />
              ))}
          </BarChart>
        </ResponsiveContainer>
        <Legend
          items={categoryLegendItems}
          formatValue={(v) => formatMoney(v, ledger.base_currency)}
          onItemClick={toggleBarCategory}
          hiddenNames={hiddenBarCategories}
        />
      </Section>

      {byDate.length > 1 && (
        <Section title="按日期趋势">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={byDate} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(Number(v), ledger.base_currency)} />
              <Line type="monotone" dataKey="total_in_base" stroke="#1677ff" strokeWidth={2} dot={false} name="支出" />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      )}

      {byCurrency.length > 1 && (
        <Section title="按币种">
          {byCurrency.map((c) => (
            <div key={c.currency} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>{c.currency}</span>
              <span>
                {formatMoney(c.total_original, c.currency)} ≈ {formatMoney(c.total_in_base, ledger.base_currency)}
              </span>
            </div>
          ))}
        </Section>
      )}

      {topExpenses.length > 0 && (
        <Section title="单笔最大支出">
          {topExpenses.map((e, i) => (
            <div
              key={e.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', gap: 8 }}
            >
              <span style={{ color: 'var(--adm-color-weak)', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.note || CATEGORY_LABELS[e.category]}
              </span>
              <span style={{ color: 'var(--adm-color-weak)', flexShrink: 0 }}>{nameOf(e.payer_id)}</span>
              <span style={{ flexShrink: 0 }}>{formatMoney(e.amount_in_base, ledger.base_currency)}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '12px 12px 4px', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Legend({
  items,
  formatValue,
  onItemClick,
  hiddenNames,
}: {
  items: { name: string; value: number; color: string }[]
  formatValue: (v: number) => string
  onItemClick?: (name: string) => void
  hiddenNames?: Set<string>
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingBottom: 8 }}>
      {items.map((item) => {
        const hidden = hiddenNames?.has(item.name) ?? false
        return (
          <div
            key={item.name}
            onClick={onItemClick ? () => onItemClick(item.name) : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 12,
              gap: 4,
              cursor: onItemClick ? 'pointer' : undefined,
              opacity: hidden ? 0.4 : 1,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: item.color, display: 'inline-block' }} />
            <span style={{ textDecoration: hidden ? 'line-through' : undefined }}>{item.name}</span>
            <span style={{ color: 'var(--adm-color-weak)' }}>{formatValue(item.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

function MemberCategoryTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  formatValue: (v: number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0)
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {label}
        <span style={{ color: 'var(--adm-color-weak)', fontWeight: 400 }}> 合计 {formatValue(total)}</span>
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}：{formatValue(p.value ?? 0)}
        </div>
      ))}
    </div>
  )
}
