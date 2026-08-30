import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getStoredSession, getToken } from './api/client'
import AdminLayout from './layout/AdminLayout'
import AccountPage from './pages/AccountPage'
import AttemptDetailPage from './pages/AttemptDetailPage'
import AuditPage from './pages/AuditPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DepartmentsPage from './pages/DepartmentsPage'
import EmployeesPage from './pages/EmployeesPage'
import ExamWizardPage from './pages/ExamWizardPage'
import ExamsPage from './pages/ExamsPage'
import ImportPage from './pages/ImportPage'
import ImportTasksPage from './pages/ImportTasksPage'
import LoginPage from './pages/LoginPage'
import MonitorPage from './pages/MonitorPage'
import QuestionBanksPage from './pages/QuestionBanksPage'
import QuestionsPage from './pages/QuestionsPage'
import ScoresPage from './pages/ScoresPage'

interface SessionInfo {
  mustChangePassword?: boolean
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken()
  const location = useLocation()
  const session = getStoredSession<SessionInfo>()

  if (!token) {
    return <Navigate to="/login" replace />
  }
  if (session?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
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
          <Route path="question-banks/:bankId/questions" element={<QuestionsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="import/tasks" element={<ImportTasksPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/wizard" element={<ExamWizardPage />} />
          <Route path="exams/:id/wizard" element={<ExamWizardPage />} />
          <Route path="exams/:examId/attempts/:attemptId" element={<AttemptDetailPage />} />
          <Route path="monitor" element={<MonitorPage />} />
          <Route path="scores" element={<ScoresPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
