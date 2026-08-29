import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getToken } from './api/client'
import ExamBriefPage from './pages/ExamBriefPage'
import ExamWorkbenchPage from './pages/ExamWorkbenchPage'
import LoginPage from './pages/LoginPage'
import ResultPage from './pages/ResultPage'
import TaskListPage from './pages/TaskListPage'

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
