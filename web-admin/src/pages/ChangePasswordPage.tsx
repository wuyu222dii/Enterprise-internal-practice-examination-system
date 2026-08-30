import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getStoredSession, getToken, setAuth } from '../api/client'

interface SessionDto {
  employeeId: string
  employeeNo: string
  displayName: string
  mustChangePassword: boolean
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('新密码长度至少 8 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const { data } = await apiFetch<{ session: SessionDto }>('/auth/session')
      setAuth(getToken() ?? '', data.session)
      navigate('/departments', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败')
    } finally {
      setLoading(false)
    }
  }

  const session = getStoredSession<SessionDto>()

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>修改密码</h1>
        <p className="login-subtitle">
          {session?.displayName ? `${session.displayName}，请设置新密码后继续` : '首登须修改密码'}
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            当前密码
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            确认新密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '提交中…' : '确认修改'}
          </button>
        </form>
      </div>
    </div>
  )
}
