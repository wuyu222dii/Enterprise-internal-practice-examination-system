import { useCallback, useEffect, useState } from 'react'
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

export default function AccountPage() {
  const { id } = useParams<{ id: string }>()
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<EmployeeSummary>(`/employees/${id}`)
      setEmployee(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-header">
        <h1>账号与权限</h1>
        <p className="page-desc">AD-04 管理员授权（占位）</p>
      </header>

      <p>
        <Link to="/employees">← 返回员工列表</Link>
      </p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>加载中…</p>}

      {employee && (
        <section className="card">
          <h2>{employee.displayName}</h2>
          <dl className="detail-list">
            <dt>员工号</dt>
            <dd>{employee.employeeNo}</dd>
            <dt>部门</dt>
            <dd>{employee.departmentPath}</dd>
            <dt>手机</dt>
            <dd>{employee.phoneMasked || '—'}</dd>
            <dt>状态</dt>
            <dd>{employee.status}</dd>
            <dt>管理员</dt>
            <dd>{employee.isAdmin ? '是' : '否'}</dd>
            <dt>故障处置权限</dt>
            <dd>{employee.hasOutageDisposition ? '是' : '否'}</dd>
          </dl>
          <p className="stub-note">
            管理员授权、重置密码等操作将在后续迭代中通过 PATCH /employees/{id}/admin-grants
            等接口实现。
          </p>
        </section>
      )}
    </div>
  )
}
