import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { NavBar, TabBar, SpinLoading } from 'antd-mobile'
import {
  BillOutline,
  PieOutline,
  PayCircleOutline,
  TeamOutline,
  SetOutline,
} from 'antd-mobile-icons'
import { getLedger } from '../../api/ledger'
import type { Ledger } from '../../types/bill_book'

export interface LedgerOutletContext {
  ledger: Ledger
  ledgerId: string
}

const TABS = [
  { key: 'expenses', title: '明细', icon: <BillOutline /> },
  { key: 'report', title: '统计', icon: <PieOutline /> },
  { key: 'settlement', title: '结算', icon: <PayCircleOutline /> },
  { key: 'members', title: '成员', icon: <TeamOutline /> },
  { key: 'settings', title: '设置', icon: <SetOutline /> },
]

export default function LedgerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', id],
    queryFn: () => getLedger(id!),
    enabled: !!id,
  })

  const activeKey = TABS.find((t) => location.pathname.endsWith(t.key))?.key ?? 'expenses'

  if (isLoading || !data) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading />
      </div>
    )
  }

  const ledger = data.ledger

  return (
    <div className="page">
      <NavBar onBack={() => navigate('/')}>{ledger.name}</NavBar>
      <div className="page-content">
        <Outlet context={{ ledger, ledgerId: id! } satisfies LedgerOutletContext} />
      </div>
      <TabBar
        activeKey={activeKey}
        safeArea
        onChange={(key) => navigate(`/ledger/${id}/${key}`)}
      >
        {TABS.map((tab) => (
          <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
        ))}
      </TabBar>
    </div>
  )
}
