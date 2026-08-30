import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiFetch } from '../api/client'

interface AuditLog {
  id: string
  occurredAt: string
  actorEmployeeId: string | null
  actionType: string
  targetType: string
  targetId: string
  reason: string | null
  requestId?: string
  before?: unknown
  after?: unknown
}

interface PagedAuditLogs {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionType, setActionType] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [detailId, setDetailId] = useState('')

  const load = useCallback(async (filters: { actionType: string; targetType: string; targetId: string }) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' })
      if (filters.actionType.trim()) params.set('actionType', filters.actionType.trim())
      if (filters.targetType.trim()) params.set('targetType', filters.targetType.trim())
      if (filters.targetId.trim()) params.set('targetId', filters.targetId.trim())
      const { data } = await apiFetch<PagedAuditLogs>(`/admin/audit-logs?${params.toString()}`)
      setLogs(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载审计日志失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load({ actionType: '', targetType: '', targetId: '' })
  }, [load])

  function handleFilter(e: FormEvent) {
    e.preventDefault()
    void load({ actionType, targetType, targetId })
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>审计日志</h1>
        <p className="page-desc">AD-16 管理操作审计记录（共 {total} 条）</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <form className="inline-form" onSubmit={handleFilter}>
          <label>
            动作
            <input
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              placeholder="exam.publish"
            />
          </label>
          <label>
            目标类型
            <input
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              placeholder="Exam"
            />
          </label>
          <label>
            目标 ID
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="exam_xxx"
            />
          </label>
          <button type="submit" className="btn-primary">
            筛选
          </button>
        </form>
      </section>

      <section className="card">
        {loading ? (
          <p className="stub-note">加载中…</p>
        ) : logs.length === 0 ? (
          <p className="stub-note">暂无审计记录</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作者</th>
                <th>动作</th>
                <th>目标类型</th>
                <th>目标 ID</th>
                <th>原因</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.occurredAt).toLocaleString()}</td>
                  <td>{log.actorEmployeeId ?? '—'}</td>
                  <td>{log.actionType}</td>
                  <td>{log.targetType}</td>
                  <td>{log.targetId}</td>
                  <td>{log.reason ?? '—'}</td>
                  <td>
                    <button type="button" className="btn-text" onClick={() => setDetailId(log.id)}>
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {detailId && (
          <pre className="paper-item" style={{ marginTop: 16 }}>
            {JSON.stringify(
              logs.find((log) => log.id === detailId) ?? {},
              null,
              2,
            )}
          </pre>
        )}
      </section>
    </div>
  )
}
