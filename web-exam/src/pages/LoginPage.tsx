import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, setAuth } from '../api/client'
import { examCompatibility } from '../browserSupport'

interface SessionDto {
  employeeId: string
  employeeNo: string
  displayName: string
  mustChangePassword: boolean
}

interface LoginResponse {
  session: SessionDto
  token: string
}

interface SmsVerifyResponse {
  verificationToken: string
  expiresAt: string
}

type Mode = 'login' | 'reset'
type ResetStep = 'phone' | 'verify' | 'password'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [resetStep, setResetStep] = useState<ResetStep>('phone')
  const [employeeNo, setEmployeeNo] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)
  const compat = examCompatibility()

  function resetForgotForm() {
    setResetStep('phone')
    setPhone('')
    setSmsCode('')
    setNewPassword('')
    setConfirmPassword('')
    setVerificationToken('')
    setError('')
    setSuccess('')
  }

  function switchToReset() {
    resetForgotForm()
    setMode('reset')
  }

  function switchToLogin() {
    resetForgotForm()
    setMode('login')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ employeeNo, password, clientType: 'examWeb' }),
      })
      setAuth(data.token, data.session)
      if (data.session.mustChangePassword) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/tasks', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendSms() {
    if (!phone.trim()) {
      setError('请输入手机号')
      return
    }
    setError('')
    setSendingSms(true)
    try {
      await apiFetch('/auth/sms/send', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ phone: phone.trim(), purpose: 'resetPassword' }),
      })
      setSuccess('验证码已发送')
      setResetStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSendingSms(false)
    }
  }

  async function handleVerifySms(e: FormEvent) {
    e.preventDefault()
    if (!smsCode.trim()) {
      setError('请输入验证码')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await apiFetch<SmsVerifyResponse>('/auth/sms/verify', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          phone: phone.trim(),
          code: smsCode.trim(),
          purpose: 'resetPassword',
        }),
      })
      setVerificationToken(data.verificationToken)
      setSuccess('')
      setResetStep('password')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!employeeNo.trim()) {
      setError('请输入员工号')
      return
    }
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
      await apiFetch('/auth/password-reset', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          employeeNo: employeeNo.trim(),
          verificationToken,
          newPassword,
        }),
      })
      setSuccess('密码已重置，请使用新密码登录')
      switchToLogin()
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'reset') {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>重置密码</h1>
          <p className="login-subtitle">通过短信验证码重置登录密码</p>
          <p className="login-hint">本地开发验证码固定为 123456</p>

          {resetStep === 'phone' && (
            <>
              <form onSubmit={(e) => { e.preventDefault(); handleSendSms() }}>
                <label>
                  手机号
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入绑定手机号"
                    required
                    autoComplete="tel"
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                {success && <p className="form-success">{success}</p>}
                <button type="submit" className="btn-primary" disabled={sendingSms}>
                  {sendingSms ? '发送中…' : '发送验证码'}
                </button>
              </form>
            </>
          )}

          {resetStep === 'verify' && (
            <form onSubmit={handleVerifySms}>
              <p className="login-hint">验证码已发送至 {phone}</p>
              <label>
                验证码
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="请输入验证码"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '验证中…' : '验证'}
              </button>
              <button
                type="button"
                className="btn-text btn-block"
                onClick={() => setResetStep('phone')}
              >
                更换手机号
              </button>
            </form>
          )}

          {resetStep === 'password' && (
            <form onSubmit={handlePasswordReset}>
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
                新密码
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 8 位"
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
                  placeholder="再次输入新密码"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '提交中…' : '重置密码'}
              </button>
            </form>
          )}

          <button type="button" className="btn-text btn-block" onClick={switchToLogin}>
            返回登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>正式考试端</h1>
        <p className="login-subtitle">EX-01 员工登录</p>
        <p className="login-hint">本地开发：ADMIN001 / Admin@123 · 档案手机 13800000001</p>
        {!compat.ok && <p className="compat-banner">{compat.message}</p>}
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
          {success && <p className="form-success">{success}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
        <button type="button" className="btn-text btn-block" onClick={switchToReset}>
          忘记密码？
        </button>
      </div>
    </div>
  )
}
