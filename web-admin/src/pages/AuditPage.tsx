import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

interface AuditLog {
  id: string
  occurredAt: string
  actorEmployeeId: string | null
  actionType: string
  targetType: string
  targetId: string
  reason: string | null
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

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<PagedAuditLogs>('/admin/audit-logs?page=1&pageSize=50')
      setLogs(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载审计日志失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-header">
        <h1>审计日志</h1>
        <p className="page-desc">AD-16 管理操作审计记录（共 {total} 条）</p>
      </header>

      {error && <p className="form-error">{error}</p>}

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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
