import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearAuth, getStoredSession } from '../api/client'
import { examCompatibility } from '../browserSupport'

interface SessionDto {
  displayName: string
  employeeNo: string
}

export default function ExamShell({ children }: { children: React.ReactNode }) {
  const session = getStoredSession<SessionDto>()
  const [compat, setCompat] = useState(() => examCompatibility())

  useEffect(() => {
    function refresh() {
      setCompat(examCompatibility())
    }
    window.addEventListener('resize', refresh)
    return () => window.removeEventListener('resize', refresh)
  }, [])

  function handleLogout() {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <div className="exam-shell">
      <header className="exam-topbar">
        <Link to="/tasks" className="exam-brand">
          正式考试端
        </Link>
        <div className="exam-topbar-actions">
          {session && (
            <span className="user-label">
              {session.displayName}（{session.employeeNo}）
            </span>
          )}
          <button type="button" className="btn-text" onClick={handleLogout}>
            退出
          </button>
        </div>
      </header>
      {!compat.ok && (
        <div className="compat-banner" role="status">
          {compat.message}
        </div>
      )}
      <div className="exam-shell-body">{children}</div>
    </div>
  )
}
