import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getToken } from './api/client'
import AdminLayout from './layout/AdminLayout'
import AccountPage from './pages/AccountPage'
import AuditPage from './pages/AuditPage'
import DepartmentsPage from './pages/DepartmentsPage'
import EmployeesPage from './pages/EmployeesPage'
import ExamsPage from './pages/ExamsPage'
import ImportPage from './pages/ImportPage'
import LoginPage from './pages/LoginPage'
import MonitorPage from './pages/MonitorPage'
import QuestionBanksPage from './pages/QuestionBanksPage'
import ScoresPage from './pages/ScoresPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/departments" replace />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id/account" element={<AccountPage />} />
          <Route path="question-banks" element={<QuestionBanksPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="monitor" element={<MonitorPage />} />
          <Route path="scores" element={<ScoresPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
