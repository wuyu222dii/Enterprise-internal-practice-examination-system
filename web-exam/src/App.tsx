import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getStoredSession, getToken } from './api/client'
import ExamShell from './layout/ExamShell'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ExamBriefPage from './pages/ExamBriefPage'
import ExamWorkbenchPage from './pages/ExamWorkbenchPage'
import LoginPage from './pages/LoginPage'
import ResultPage from './pages/ResultPage'
import TaskListPage from './pages/TaskListPage'

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
  return <ExamShell>{children}</ExamShell>
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
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/:examId"
          element={
            <ProtectedRoute>
              <ExamBriefPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attempts/:attemptId"
          element={
            <ProtectedRoute>
              <ExamWorkbenchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attempts/:attemptId/result"
          element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
