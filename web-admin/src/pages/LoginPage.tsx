import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, setAuth } from '../api/client'

interface SessionDto {
  employeeId: string
  employeeNo: string
  displayName: string
  roles: string[]
  isAdmin: boolean
  mustChangePassword: boolean
}

interface LoginResponse {
  session: SessionDto
  token: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [employeeNo, setEmployeeNo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ employeeNo, password, clientType: 'adminWeb' }),
      })
      setAuth(data.token, data.session)
      if (data.session.mustChangePassword) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/departments', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>管理后台</h1>
        <p className="login-subtitle">AD-01 管理员登录</p>
        <p className="login-hint">本地开发：ADMIN001 / Admin@123</p>
        <form onSubmit={handleSubmit}>
          <label>
            员工号
            <input
              type="text"
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              placeholder="请输入员工号"
              required
              autoComplete="username"
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
