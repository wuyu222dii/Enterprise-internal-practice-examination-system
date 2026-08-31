import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface EmployeeSummary {
  id: string
  employeeNo: string
  displayName: string
  departmentPath: string
  phoneMasked: string
  status: string
  isAdmin: boolean
  hasOutageDisposition: boolean
}

interface ResetPasswordResponse {
  temporaryPassword: string
}

export default function AccountPage() {
  const { id } = useParams<{ id: string }>()
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasOutageDisposition, setHasOutageDisposition] = useState(false)
  const [reason, setReason] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tempPassword, setTempPassword] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<EmployeeSummary>(`/employees/${id}`)
      setEmployee(data)
      setIsAdmin(data.isAdmin)
      setHasOutageDisposition(data.hasOutageDisposition)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleGrants(e: FormEvent) {
    e.preventDefault()
    if (!id || !reason.trim()) {
      setError('请填写授权原因')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/employees/${id}/admin-grants`, {
        method: 'PATCH',
        body: JSON.stringify({ isAdmin, hasOutageDisposition, reason: reason.trim() }),
      })
      setSuccess('权限已更新')
      setReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault()
    if (!id || !phone.trim()) {
      setError('请填写手机号')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ phone: phone.trim() }),
      })
      setSuccess('档案手机号已更新，可用于短信绑定与找回')
      setPhone('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword() {
    if (!id) return
    if (!window.confirm('确定重置该员工密码？将生成新的临时密码。')) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    setTempPassword('')
    try {
      const { data } = await apiFetch<ResetPasswordResponse>(`/employees/${id}/reset-password`, {
        method: 'POST',
      })
      setTempPassword(data.temporaryPassword)
      setSuccess('密码已重置')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>账号与权限</h1>
        <p className="page-desc">AD-04 管理员授权与密码重置</p>
      </header>

      <p>
        <Link to="/employees">← 返回员工列表</Link>
      </p>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      {tempPassword && (
        <p className="form-success">临时密码（仅显示一次）：{tempPassword}</p>
      )}
      {loading && <p>加载中…</p>}

      {employee && (
        <>
          <section className="card">
            <h2>{employee.displayName}</h2>
            <dl className="detail-list">
              <dt>员工号</dt>
              <dd>{employee.employeeNo}</dd>
              <dt>部门</dt>
              <dd>{employee.departmentPath}</dd>
              <dt>手机</dt>
              <dd>{employee.phoneMasked || '未登记'}</dd>
              <dt>状态</dt>
              <dd>{employee.status}</dd>
            </dl>
            <form className="inline-form" onSubmit={handleSavePhone}>
              <label>
                档案手机号
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="用于绑定小程序和找回密码"
                  required
                />
              </label>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '保存中…' : '保存手机号'}
              </button>
            </form>
            <p className="page-desc">
              演示种子在未登记时为 ADMIN001=13800000001、EXAM001=13800000002。绑定、解绑和短信找回必须与档案号码一致。
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetPassword}
              disabled={submitting}
            >
              重置密码
            </button>
          </section>

          <section className="card">
            <h2>管理员授权</h2>
            <p className="page-desc">
              授权变更将记录至
              {' '}
              <Link to="/audit">审计日志</Link>
              ，请填写原因以便追溯。
            </p>
            <form onSubmit={handleGrants}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
                管理员权限
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={hasOutageDisposition}
                  onChange={(e) => setHasOutageDisposition(e.target.checked)}
                />
                故障处置权限
              </label>
              <label>
                授权原因
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="必填，用于审计"
                  required
                />
              </label>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '保存中…' : '保存授权'}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  )
}
