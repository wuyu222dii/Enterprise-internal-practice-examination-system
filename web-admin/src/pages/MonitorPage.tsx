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
  source?: string
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
  const [success, setSuccess] = useState('')
  const [pausing, setPausing] = useState(false)
  const [confirmingId, setConfirmingId] = useState('')
  const [rejectingId, setRejectingId] = useState('')

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

  async function handlePause() {
    if (!examId) return
    const reason = window.prompt('请输入暂停原因（可选）') ?? undefined
    setPausing(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/admin/exams/${examId}/pause`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      setSuccess('考试已暂停')
      await loadExams()
      await loadMonitor(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '暂停失败')
    } finally {
      setPausing(false)
    }
  }

  async function handleConfirmProposal(event: OutageEvent) {
    if (!window.confirm(`确认故障事件 ${event.id} 的提案 v${event.latestProposalVersion}？`)) return
    setConfirmingId(event.id)
    setError('')
    setSuccess('')
    try {
      await apiFetch(
        `/admin/outage-events/${event.id}/proposals/${event.latestProposalVersion}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ confirmationNote: '管理后台确认' }),
        },
      )
      setSuccess('故障提案已确认')
      await loadMonitor(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认失败')
    } finally {
      setConfirmingId('')
    }
  }

  async function handleRejectProposal(event: OutageEvent) {
    const reason = window.prompt('请输入驳回原因') ?? ''
    if (!reason.trim()) return
    setRejectingId(event.id)
    setError('')
    setSuccess('')
    try {
      await apiFetch(
        `/admin/outage-events/${event.id}/proposals/${event.latestProposalVersion}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ rejectReason: reason }),
        },
      )
      setSuccess('故障提案已驳回')
      await loadMonitor(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '驳回失败')
    } finally {
      setRejectingId('')
    }
  }

  const selectedExam = exams.find((exam) => exam.id === examId)

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试监控</h1>
        <p className="page-desc">过程监控、暂停考试与故障处置</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

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
          {selectedExam.runStatus !== 'paused' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePause}
              disabled={pausing}
            >
              {pausing ? '暂停中…' : '暂停考试'}
            </button>
          )}
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
                <th>来源</th>
                <th>提案</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {outages.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.status}</td>
                  <td>{event.affectedExamIds.join(', ') || '—'}</td>
                  <td>{event.source === 'auto' ? '自动检测' : '人工'}</td>
                  <td>
                    v{event.latestProposalVersion}
                    {event.source === 'auto' ? '（只读）' : ''}
                  </td>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td>
                    {event.status === 'detected' && (
                      <>
                        <button
                          type="button"
                          className="btn-text"
                          disabled={confirmingId === event.id}
                          onClick={() => handleConfirmProposal(event)}
                        >
                          {confirmingId === event.id ? '确认中…' : '确认提案'}
                        </button>
                        <button
                          type="button"
                          className="btn-text"
                          disabled={rejectingId === event.id}
                          onClick={() => handleRejectProposal(event)}
                        >
                          {rejectingId === event.id ? '驳回中…' : '驳回'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
