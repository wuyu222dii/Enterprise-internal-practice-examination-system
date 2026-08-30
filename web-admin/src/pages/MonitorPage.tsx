import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

interface ExamSummary {
  id: string
  title: string
  lifecycle: string
  runStatus: string
}

interface PagedExams {
  items: ExamSummary[]
  total: number
}

interface MonitorData {
  examId: string
  attemptCount: number
}

interface OutageEvent {
  id: string
  status: string
  affectedExamIds: string[]
  latestProposalVersion: number
  createdAt: string
}

interface PagedOutageEvents {
  items: OutageEvent[]
  total: number
}

export default function MonitorPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [examId, setExamId] = useState('')
  const [monitor, setMonitor] = useState<MonitorData | null>(null)
  const [outages, setOutages] = useState<OutageEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const loadMonitor = useCallback(async (selectedExamId: string) => {
    if (!selectedExamId) return
    setError('')
    try {
      const [{ data: monitorData }, { data: outageData }] = await Promise.all([
        apiFetch<MonitorData>(`/admin/exams/${selectedExamId}/monitor`),
        apiFetch<PagedOutageEvents>('/admin/outage-events?page=1&pageSize=10'),
      ])
      setMonitor(monitorData)
      setOutages(outageData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载监控数据失败')
    }
  }, [])

  useEffect(() => {
    loadExams()
  }, [loadExams])

  useEffect(() => {
    if (examId) {
      loadMonitor(examId)
    }
  }, [examId, loadMonitor])

  const selectedExam = exams.find((exam) => exam.id === examId)

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试监控</h1>
        <p className="page-desc">AD-13 过程监控与故障事件</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>选择考试</h2>
        <label>
          考试
          <select value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loading}>
            <option value="">请选择考试</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.lifecycle})
              </option>
            ))}
          </select>
        </label>
      </section>

      {monitor && selectedExam && (
        <section className="card">
          <h2>监控概览</h2>
          <dl className="detail-list">
            <dt>考试</dt>
            <dd>{selectedExam.title}</dd>
            <dt>运行状态</dt>
            <dd>{selectedExam.runStatus}</dd>
            <dt>尝试总数</dt>
            <dd>{monitor.attemptCount}</dd>
          </dl>
        </section>
      )}

      <section className="card">
        <h2>故障事件</h2>
        {outages.length === 0 ? (
          <p className="stub-note">暂无故障事件</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>事件 ID</th>
                <th>状态</th>
                <th>受影响考试</th>
                <th>提案版本</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {outages.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.status}</td>
                  <td>{event.affectedExamIds.join(', ') || '—'}</td>
                  <td>{event.latestProposalVersion}</td>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
