import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface QuestionBankDto {
  id: string
  name: string
}

interface ImportTask {
  id: string
  questionBankId: string
  status: string
  importableCount: number
  errorCount: number
  totalCount?: number
  createdAt: string
}

interface PagedTasks {
  items: ImportTask[]
  total: number
  page: number
  pageSize: number
}

const STATUS_LABELS: Record<string, string> = {
  preview_ready: '待确认',
  needs_revalidation: '需重新校验',
  completed: '已完成',
  cancelled: '已取消',
  expired: '已过期',
  failed: '失败',
  uploaded: '已上传',
  parsing: '解析中',
  parsed: '已解析',
}

const STATUS_FILTERS = [
  { value: '', label: '全部状态' },
  { value: 'preview_ready', label: '待确认' },
  { value: 'needs_revalidation', label: '需重新校验' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已过期' },
]

export default function ImportTasksPage() {
  const [tasks, setTasks] = useState<ImportTask[]>([])
  const [banks, setBanks] = useState<QuestionBankDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [bankId, setBankId] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState('')
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (bankId) params.set('questionBankId', bankId)
      if (status) params.set('status', status)
      const { data } = await apiFetch<PagedTasks>(`/import/tasks?${params.toString()}`)
      setTasks(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载导入任务失败')
    } finally {
      setLoading(false)
    }
  }, [page, bankId, status])

  useEffect(() => {
    apiFetch<QuestionBankDto[]>('/question-banks')
      .then(({ data }) => setBanks(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCancel(task: ImportTask) {
    if (!window.confirm(`取消导入任务 ${task.id}？取消后不可确认导入。`)) return
    setActingId(task.id)
    setError('')
    try {
      await apiFetch(`/import/tasks/${task.id}/cancel`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败')
    } finally {
      setActingId('')
    }
  }

  async function handleRevalidate(task: ImportTask) {
    setActingId(task.id)
    setError('')
    try {
      await apiFetch(`/import/tasks/${task.id}/revalidate`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新校验失败')
    } finally {
      setActingId('')
    }
  }

  const bankName = (id: string) => banks.find((b) => b.id === id)?.name ?? id
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canCancel = (task: ImportTask) => task.status === 'preview_ready' || task.status === 'needs_revalidation'
  const canContinue = (task: ImportTask) => task.status === 'preview_ready'
  const canRevalidate = (task: ImportTask) =>
    task.status === 'expired' || task.status === 'needs_revalidation' || task.status === 'preview_ready'

  return (
    <div className="page">
      <header className="page-header">
        <h1>导入任务</h1>
        <p className="page-desc">题目导入任务列表（共 {total} 条）。过期任务不可继续导入，可重新校验。</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>任务列表</h2>
          <div className="inline-form" style={{ margin: 0 }}>
            <label>
              题库
              <select
                value={bankId}
                onChange={(e) => {
                  setPage(1)
                  setBankId(e.target.value)
                }}
              >
                <option value="">全部题库</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              状态
              <select
                value={status}
                onChange={(e) => {
                  setPage(1)
                  setStatus(e.target.value)
                }}
              >
                {STATUS_FILTERS.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <Link to="/import" className="btn-primary" style={{ textDecoration: 'none' }}>
              新建导入
            </Link>
          </div>
        </div>

        {loading ? (
          <p>加载中…</p>
        ) : tasks.length === 0 ? (
          <p className="stub-note">暂无导入任务</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>任务 ID</th>
                  <th>题库</th>
                  <th>状态</th>
                  <th>可导入</th>
                  <th>不可导入</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{bankName(task.questionBankId)}</td>
                    <td>{STATUS_LABELS[task.status] ?? task.status}</td>
                    <td>{task.importableCount}</td>
                    <td>{task.errorCount}</td>
                    <td>{task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}</td>
                    <td>
                      {canContinue(task) && (
                        <>
                          <Link to={`/import?taskId=${task.id}`}>继续导入</Link>
                          {' · '}
                        </>
                      )}
                      {task.status === 'needs_revalidation' && (
                        <>
                          <Link to={`/import?taskId=${task.id}`}>查看</Link>
                          {' · '}
                        </>
                      )}
                      {canRevalidate(task) && task.status !== 'preview_ready' && (
                        <>
                          <button
                            type="button"
                            className="btn-text"
                            disabled={actingId === task.id}
                            onClick={() => void handleRevalidate(task)}
                          >
                            {actingId === task.id ? '校验中…' : '重新校验'}
                          </button>
                          {' · '}
                        </>
                      )}
                      {canCancel(task) && (
                        <button
                          type="button"
                          className="btn-text"
                          disabled={actingId === task.id}
                          onClick={() => void handleCancel(task)}
                        >
                          {actingId === task.id ? '处理中…' : '取消'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <p>
                <button type="button" className="btn-text" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  上一页
                </button>
                {' '}第 {page} / {totalPages} 页{' '}
                <button type="button" className="btn-text" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  下一页
                </button>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
