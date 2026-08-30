import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, apiFetch, getToken } from '../api/client'

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

interface PagedEmployees {
  items: EmployeeSummary[]
  total: number
  page: number
  pageSize: number
}

interface CreateEmployeeResponse {
  employee: EmployeeSummary
  temporaryPassword: string
  credentialBatchId: string
}

interface EmployeeImportResponse {
  batchId: string
  importedCount: number
  skippedCount: number
  credentialBatchId: string
}

async function downloadCredentialBatch(batchId: string) {
  const token = getToken()
  const response = await fetch(`${API_BASE}/employees/credential-batches/${batchId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) return
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `credentials-${batchId}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employeeNo, setEmployeeNo] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [departmentPath, setDepartmentPath] = useState('/总公司')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdPassword, setCreatedPassword] = useState('')
  const [credentialBatchId, setCredentialBatchId] = useState('')

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<EmployeeImportResponse | null>(null)
  const [disablingId, setDisablingId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<PagedEmployees>('/employees?page=1&pageSize=50')
      setEmployees(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setCreatedPassword('')
    setCredentialBatchId('')
    try {
      const { data } = await apiFetch<CreateEmployeeResponse>('/employees', {
        method: 'POST',
        body: JSON.stringify({
          employeeNo,
          displayName,
          departmentPath,
          phone: phone || undefined,
        }),
      })
      setCreatedPassword(data.temporaryPassword)
      setCredentialBatchId(data.credentialBatchId)
      setEmployeeNo('')
      setDisplayName('')
      setPhone('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault()
    if (!importFile) return
    setImporting(true)
    setError('')
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const token = getToken()
      const response = await fetch(`${API_BASE}/employees/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `导入失败 (${response.status})`)
      }
      const json = await response.json()
      setImportResult(json.data as EmployeeImportResponse)
      setImportFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  async function handleDisable(emp: EmployeeSummary) {
    if (!window.confirm(`确定停用员工「${emp.displayName}」？`)) return
    setDisablingId(emp.id)
    setError('')
    try {
      await apiFetch(`/employees/${emp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'disabled' }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '停用失败')
    } finally {
      setDisablingId('')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>员工管理</h1>
        <p className="page-desc">员工列表、创建与批量导入</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {createdPassword && (
        <p className="form-success">
          员工已创建，临时密码：{createdPassword}
          {credentialBatchId && (
            <>
              {' · '}
              <button
                type="button"
                className="btn-text"
                onClick={() => downloadCredentialBatch(credentialBatchId)}
              >
                下载凭证批次
              </button>
            </>
          )}
        </p>
      )}
      {importResult && (
        <p className="form-success">
          批量导入完成：成功 {importResult.importedCount} 人，跳过 {importResult.skippedCount} 人
          {importResult.credentialBatchId && (
            <>
              {' · '}
              <button
                type="button"
                className="btn-text"
                onClick={() => downloadCredentialBatch(importResult.credentialBatchId)}
              >
                下载凭证批次
              </button>
            </>
          )}
        </p>
      )}

      <section className="card">
        <h2>批量导入</h2>
        <form className="inline-form" onSubmit={handleImport}>
          <label>
            Excel 文件
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={importing || !importFile}>
            {importing ? '导入中…' : '上传导入'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>新建员工</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <label>
            员工号
            <input
              type="text"
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              required
            />
          </label>
          <label>
            姓名
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
          <label>
            部门路径
            <input
              type="text"
              value={departmentPath}
              onChange={(e) => setDepartmentPath(e.target.value)}
              required
            />
          </label>
          <label>
            手机
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '创建中…' : '创建'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>员工列表（共 {total} 人）</h2>
        {loading ? (
          <p>加载中…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>员工号</th>
                <th>姓名</th>
                <th>部门</th>
                <th>状态</th>
                <th>管理员</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.employeeNo}</td>
                  <td>{emp.displayName}</td>
                  <td>{emp.departmentPath}</td>
                  <td>{emp.status}</td>
                  <td>{emp.isAdmin ? '是' : '否'}</td>
                  <td>
                    <Link to={`/employees/${emp.id}/account`}>账号设置</Link>
                    {emp.status === 'active' && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          className="btn-text"
                          disabled={disablingId === emp.id}
                          onClick={() => handleDisable(emp)}
                        >
                          {disablingId === emp.id ? '停用中…' : '停用'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6}>暂无员工</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
