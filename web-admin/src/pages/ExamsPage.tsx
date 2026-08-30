import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface ExamSummary {
  id: string
  title: string
  description: string | null
  lifecycle: string
  runStatus: string
  openStartAt: string | null
  stopAttemptAt: string | null
  publishedVersionId: string | null
  resultLocked: boolean
}

interface PagedExams {
  items: ExamSummary[]
  total: number
  page: number
  pageSize: number
}

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: '草稿',
  openForAttempt: '开放作答',
  cancelled: '已取消',
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState('')

  const loadExams = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<PagedExams>('/admin/exams?page=1&pageSize=50')
      setExams(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载考试列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExams()
  }, [loadExams])

  async function handleCancel(exam: ExamSummary) {
    const employeeVisibleReason = window.prompt('员工可见原因（必填）') ?? ''
    if (!employeeVisibleReason.trim()) return
    const internalReason = window.prompt('内部原因（必填）') ?? ''
    if (!internalReason.trim()) return
    setCancellingId(exam.id)
    setError('')
    try {
      await apiFetch(`/admin/exams/${exam.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ employeeVisibleReason, internalReason }),
      })
      await loadExams()
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败')
    } finally {
      setCancellingId('')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试管理</h1>
        <p className="page-desc">考试列表、创建向导与整场取消</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>考试列表</h2>
          <Link to="/exams/wizard" className="btn-primary" style={{ textDecoration: 'none' }}>
            创建考试
          </Link>
        </div>

        {loading ? (
          <p>加载中…</p>
        ) : exams.length === 0 ? (
          <p className="page-desc">暂无考试，点击「创建考试」开始配置。</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>状态</th>
                <th>运行状态</th>
                <th>开放时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td>{LIFECYCLE_LABELS[exam.lifecycle] ?? exam.lifecycle}</td>
                  <td>{exam.runStatus}</td>
                  <td>
                    {exam.openStartAt
                      ? new Date(exam.openStartAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    {exam.lifecycle === 'draft' && (
                      <>
                        <Link to={`/exams/${exam.id}/wizard`}>继续配置</Link>
                        {' · '}
                      </>
                    )}
                    <Link to={`/monitor`}>监控</Link>
                    {' · '}
                    <Link to={`/scores`}>成绩</Link>
                    {exam.lifecycle !== 'cancelled' && exam.lifecycle !== 'draft' && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          className="btn-text"
                          disabled={cancellingId === exam.id}
                          onClick={() => void handleCancel(exam)}
                        >
                          {cancellingId === exam.id ? '取消中…' : '取消整场'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && total > exams.length && (
          <p className="page-desc">共 {total} 条，当前显示 {exams.length} 条</p>
        )}
      </section>
    </div>
  )
}
