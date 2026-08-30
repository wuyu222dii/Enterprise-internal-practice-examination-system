import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface ExamSummary {
  id: string
  title: string
  lifecycle: string
}

interface PagedExams {
  items: ExamSummary[]
}

interface ScoreSummary {
  examId: string
  assignedCount: number
  completedCount: number
}

interface ScoreRow {
  attemptId: string
  employeeId: string
  attemptNumber: number
  attemptStatus: string
  voided: boolean
  totalScore?: number
  maxScore?: number
}

interface AttemptRow {
  attemptId: string
  employeeId: string
  attemptNumber: number
  attemptStatus: string
  voided: boolean
}

interface PagedRows<T> {
  items: T[]
  total: number
}

interface ExportJob {
  jobId: string
  status: string
  downloadUrl?: string
}

export default function ScoresPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [examId, setExamId] = useState('')
  const [summary, setSummary] = useState<ScoreSummary | null>(null)
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [voidAttemptId, setVoidAttemptId] = useState('')
  const [employeeReason, setEmployeeReason] = useState('')
  const [internalReason, setInternalReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const loadExams = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<PagedExams>('/admin/exams?page=1&pageSize=50')
      setExams(data.items)
      if (data.items.length > 0) {
        setExamId((current) => current || data.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载考试列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadScores = useCallback(async (selectedExamId: string) => {
    if (!selectedExamId) return
    setError('')
    try {
      const [summaryRes, scoresRes, attemptsRes] = await Promise.all([
        apiFetch<ScoreSummary>(`/admin/exams/${selectedExamId}/scores/summary`),
        apiFetch<PagedRows<ScoreRow>>(`/admin/exams/${selectedExamId}/scores/employees?page=1&pageSize=50`),
        apiFetch<PagedRows<AttemptRow>>(`/admin/exams/${selectedExamId}/attempts?page=1&pageSize=50`),
      ])
      setSummary(summaryRes.data)
      setScores(scoresRes.data.items)
      setAttempts(attemptsRes.data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载成绩数据失败')
    }
  }, [])

  useEffect(() => {
    loadExams()
  }, [loadExams])

  useEffect(() => {
    if (examId) {
      loadScores(examId)
    }
  }, [examId, loadScores])

  async function handleExport() {
    if (!examId) return
    setExportStatus('正在创建导出任务…')
    setError('')
    try {
      const { data } = await apiFetch<ExportJob>(`/admin/exams/${examId}/exports`, {
        method: 'POST',
        body: JSON.stringify({ format: 'xlsx' }),
      })
      setExportStatus(`任务 ${data.jobId} 状态：${data.status}`)
      if (data.status === 'pending') {
        await pollExportJob(data.jobId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败')
      setExportStatus('')
    }
  }

  async function pollExportJob(jobId: string) {
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const { data } = await apiFetch<ExportJob>(`/admin/exports/${jobId}`)
      setExportStatus(`任务 ${data.jobId} 状态：${data.status}`)
      if (data.status === 'completed') {
        setSuccess(data.downloadUrl ? `导出完成：${data.downloadUrl}` : '导出完成')
        return
      }
      if (data.status === 'failed') {
        setError('导出任务失败')
        return
      }
    }
  }

  async function handleVoid(e: FormEvent) {
    e.preventDefault()
    if (!examId || !voidAttemptId || !employeeReason || !internalReason) return
    setVoiding(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/admin/exams/${examId}/attempts/${voidAttemptId}/void`, {
        method: 'POST',
        body: JSON.stringify({
          employeeVisibleReason: employeeReason,
          internalReason,
        }),
      })
      setSuccess('尝试已作废')
      setEmployeeReason('')
      setInternalReason('')
      setVoidAttemptId('')
      await loadScores(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作废失败')
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>成绩与报表</h1>
        <p className="page-desc">AD-14 / AD-15 成绩汇总、导出与作废</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <section className="card">
        <h2>选择考试</h2>
        <div className="inline-form">
          <label>
            考试
            <select value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loading}>
              <option value="">请选择考试</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" onClick={handleExport} disabled={!examId}>
            导出 Excel
          </button>
        </div>
        {exportStatus && <p className="stub-note">{exportStatus}</p>}
      </section>

      {summary && (
        <section className="card">
          <h2>成绩汇总</h2>
          <dl className="detail-list">
            <dt>应考人数</dt>
            <dd>{summary.assignedCount}</dd>
            <dt>已完成</dt>
            <dd>{summary.completedCount}</dd>
          </dl>
        </section>
      )}

      <section className="card">
        <h2>员工成绩</h2>
        {scores.length === 0 ? (
          <p className="stub-note">暂无成绩数据</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>员工</th>
                <th>次数</th>
                <th>状态</th>
                <th>得分</th>
                <th>满分</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((row) => (
                <tr key={row.attemptId}>
                  <td>{row.employeeId}</td>
                  <td>{row.attemptNumber}</td>
                  <td>{row.attemptStatus}</td>
                  <td>{row.totalScore ?? '—'}</td>
                  <td>{row.maxScore ?? '—'}</td>
                  <td>
                    <Link to={`/exams/${examId}/attempts/${row.attemptId}`}>详情</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>作废尝试</h2>
        <form className="inline-form" onSubmit={handleVoid}>
          <label>
            尝试
            <select
              value={voidAttemptId}
              onChange={(e) => setVoidAttemptId(e.target.value)}
              required
            >
              <option value="">选择尝试</option>
              {attempts
                .filter((row) => !row.voided && row.attemptStatus !== 'voided')
                .map((row) => (
                  <option key={row.attemptId} value={row.attemptId}>
                    {row.employeeId} · 第 {row.attemptNumber} 次 · {row.attemptStatus}
                  </option>
                ))}
            </select>
          </label>
          <label>
            员工可见原因
            <input
              type="text"
              value={employeeReason}
              onChange={(e) => setEmployeeReason(e.target.value)}
              required
            />
          </label>
          <label>
            内部原因
            <input
              type="text"
              value={internalReason}
              onChange={(e) => setInternalReason(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={voiding}>
            {voiding ? '提交中…' : '作废'}
          </button>
        </form>
      </section>
    </div>
  )
}
