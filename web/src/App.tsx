import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LedgerList from './pages/LedgerList'
import LedgerDetail from './pages/LedgerDetail'
import ExpensesTab from './pages/LedgerDetail/ExpensesTab'
import ReportTab from './pages/LedgerDetail/ReportTab'
import SettlementTab from './pages/LedgerDetail/SettlementTab'
import MembersTab from './pages/LedgerDetail/MembersTab'
import SettingsTab from './pages/LedgerDetail/SettingsTab'
import ExpenseForm from './pages/ExpenseForm'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<LedgerList />} />
        <Route path="/ledger/:id" element={<LedgerDetail />}>
          <Route index element={<Navigate to="expenses" replace />} />
          <Route path="expenses" element={<ExpensesTab />} />
          <Route path="report" element={<ReportTab />} />
          <Route path="settlement" element={<SettlementTab />} />
          <Route path="members" element={<MembersTab />} />
          <Route path="settings" element={<SettingsTab />} />
        </Route>
        <Route path="/ledger/:id/expense/new" element={<ExpenseForm />} />
        <Route path="/ledger/:id/expense/:expenseId/edit" element={<ExpenseForm />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
