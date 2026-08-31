import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import { FiveDomainStatus } from '../FiveDomainStatus'

interface ExamSummary {
  id: string
  title: string
  lifecycle: string
  runStatus: string
  resultLocked?: boolean
  resultState?: string | null
}

interface PagedExams {
  items: ExamSummary[]
  total: number
}

interface MonitorCounts {
  assignedCount?: number
  notStartedCount?: number
  inProgressCount?: number
  completedCount?: number
  voidedCount?: number
  passedCount?: number
  failedCount?: number
  officialValidCount?: number
}

interface MonitorData {
  examId: string
  attemptCount: number
  runStatus?: string
  lifecycle?: string
  resultLocked?: boolean
  participation?: MonitorCounts
  results?: MonitorCounts
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
  const [detecting, setDetecting] = useState(false)
  const [confirmingId, setConfirmingId] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<OutageEvent | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadExams = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<PagedExams>('/admin/exams?page=1&pageSize=50')
      const sorted = [...data.items].sort(
        (a, b) => Number(Boolean(b.resultLocked)) - Number(Boolean(a.resultLocked)),
      )
      setExams(sorted)
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
    if (!pauseReason.trim()) {
      setError('请填写暂停原因')
      return
    }
    setPausing(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/admin/exams/${examId}/pause`, {
        method: 'POST',
        body: JSON.stringify({ reason: pauseReason.trim() }),
      })
      setSuccess('考试已暂停。恢复只能通过故障提案确认，管理员不能强制恢复。')
      setPauseOpen(false)
      setPauseReason('')
      await loadExams()
      await loadMonitor(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '暂停失败')
    } finally {
      setPausing(false)
    }
  }

  async function handleDetect() {
    if (!window.confirm('将按当前考试触发故障检测提案，确认继续？')) return
    setDetecting(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch('/admin/outage-events/detect', {
        method: 'POST',
        body: JSON.stringify({
          affectedExamIds: examId ? [examId] : [],
          reason: '管理后台触发检测',
        }),
      })
      setSuccess('已生成检测提案')
      await loadMonitor(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '检测失败')
    } finally {
      setDetecting(false)
    }
  }

  async function handleConfirmProposal(event: OutageEvent) {
    if (!window.confirm(`确认故障事件 ${event.id} 的提案 v${event.latestProposalVersion}？确认后考试将按提案恢复运行。`)) return
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

  async function handleRejectProposal() {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      setError('请填写驳回原因')
      return
    }
    setRejectingId(rejectTarget.id)
    setError('')
    setSuccess('')
    try {
      await apiFetch(
        `/admin/outage-events/${rejectTarget.id}/proposals/${rejectTarget.latestProposalVersion}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ rejectReason: rejectReason.trim() }),
        },
      )
      setSuccess('故障提案已驳回')
      setRejectTarget(null)
      setRejectReason('')
      await loadMonitor(examId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '驳回失败')
    } finally {
      setRejectingId('')
    }
  }

  const selectedExam = exams.find((exam) => exam.id === examId)
  const participation = monitor?.participation
  const results = monitor?.results
  const resultLocked = Boolean(selectedExam?.resultLocked || monitor?.resultLocked)
  const participationLabel = participation
    ? `应考 ${participation.assignedCount ?? 0} · 进行中 ${participation.inProgressCount ?? 0}`
    : null

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试监控</h1>
        <p className="page-desc">AD-13 五域状态、参与维 / 结果维、暂停与故障检测提案。恢复考试只能确认故障提案，没有强制 Resume。</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      {resultLocked && (
        <p className="locked-banner">
          本场结果已锁定，请取消后新建考试，不要在原地修复成绩或答案。
        </p>
      )}

      <section className="card">
        <h2>选择考试</h2>
        <div className="inline-form">
          <label>
            考试
            <select value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loading}>
              <option value="">请选择考试</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.resultLocked ? '【结果锁定】 ' : ''}
                  {exam.title}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-secondary" onClick={handleDetect} disabled={detecting}>
            {detecting ? '检测中…' : '运行故障检测'}
          </button>
        </div>
      </section>

      {monitor && selectedExam && (
        <section className="card monitor-dense">
          <h2>监控概览</h2>
          <FiveDomainStatus
            lifecycle={monitor.lifecycle ?? selectedExam.lifecycle}
            runStatus={monitor.runStatus ?? selectedExam.runStatus}
            resultLocked={resultLocked}
            participationLabel={participationLabel}
          />
          <p className="page-desc">尝试总数 {monitor.attemptCount}</p>
          <h3>参与维</h3>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">应考</div>
              <div className="stat-value">{participation?.assignedCount ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">未开始</div>
              <div className="stat-value">{participation?.notStartedCount ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">进行中</div>
              <div className="stat-value">{participation?.inProgressCount ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">已完成</div>
              <div className="stat-value">{participation?.completedCount ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">已作废</div>
              <div className="stat-value">{participation?.voidedCount ?? 0}</div>
            </div>
          </div>
          <h3>结果维</h3>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">正式有效</div>
              <div className="stat-value">{results?.officialValidCount ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">通过</div>
              <div className="stat-value">{results?.passedCount ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">未通过</div>
              <div className="stat-value">{results?.failedCount ?? 0}</div>
            </div>
          </div>
          {selectedExam.runStatus !== 'paused' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setPauseOpen(true); setPauseReason(''); setError('') }}
              disabled={pausing}
            >
              暂停考试
            </button>
          )}
          {selectedExam.runStatus === 'paused' && (
            <p className="page-desc">考试已暂停。恢复只能走下方故障提案确认，不能由管理员强制恢复。</p>
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
                          onClick={() => { setRejectTarget(event); setRejectReason(''); setError('') }}
                        >
                          驳回
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

      {pauseOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>暂停考试</h2>
            <p className="page-desc">暂停后员工不能新开卷。恢复只能通过故障提案确认。</p>
            <label className="field">
              暂停原因（必填）
              <textarea
                rows={3}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPauseOpen(false)}
                disabled={pausing}
              >
                返回
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handlePause()}
                disabled={pausing}
              >
                {pausing ? '暂停中…' : '确认暂停'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>驳回故障提案</h2>
            <p className="page-desc">事件 {rejectTarget.id} · v{rejectTarget.latestProposalVersion}</p>
            <label className="field">
              驳回原因（必填）
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRejectTarget(null)}
                disabled={Boolean(rejectingId)}
              >
                返回
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleRejectProposal()}
                disabled={Boolean(rejectingId)}
              >
                {rejectingId ? '驳回中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
