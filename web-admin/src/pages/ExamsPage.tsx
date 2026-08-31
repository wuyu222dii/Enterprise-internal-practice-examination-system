import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { FiveDomainStatus } from '../FiveDomainStatus'
import { formatEnterpriseTime } from '../formatTime'

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
  resultState?: string | null
  examCode?: string | null
}

interface DescriptionRevision {
  id: string
  body: string | null
  actorEmployeeId?: string | null
  createdAt: string
}

interface PagedExams {
  items: ExamSummary[]
  total: number
  page: number
  pageSize: number
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancellingId, setCancellingId] = useState('')
  const [cancelTarget, setCancelTarget] = useState<ExamSummary | null>(null)
  const [employeeVisibleReason, setEmployeeVisibleReason] = useState('')
  const [internalReason, setInternalReason] = useState('')
  const [reviseTarget, setReviseTarget] = useState<ExamSummary | null>(null)
  const [reviseBody, setReviseBody] = useState('')
  const [revisions, setRevisions] = useState<DescriptionRevision[]>([])
  const [revising, setRevising] = useState(false)

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

  function openCancel(exam: ExamSummary) {
    setCancelTarget(exam)
    setEmployeeVisibleReason('')
    setInternalReason('')
    setError('')
  }

  async function openRevise(exam: ExamSummary) {
    setReviseTarget(exam)
    setReviseBody(exam.description ?? '')
    setError('')
    setSuccess('')
    try {
      const { data } = await apiFetch<DescriptionRevision[]>(
        `/admin/exams/${exam.id}/description-revisions`,
      )
      setRevisions(data)
    } catch {
      setRevisions([])
    }
  }

  async function handleRevise() {
    if (!reviseTarget) return
    setRevising(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/admin/exams/${reviseTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: reviseBody }),
      })
      setSuccess('考试说明已修订')
      setReviseTarget(null)
      await loadExams()
    } catch (err) {
      setError(err instanceof Error ? err.message : '修订失败')
    } finally {
      setRevising(false)
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    if (!employeeVisibleReason.trim() || !internalReason.trim()) {
      setError('员工可见原因与内部原因均为必填')
      return
    }
    setCancellingId(cancelTarget.id)
    setError('')
    try {
      await apiFetch(`/admin/exams/${cancelTarget.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          employeeVisibleReason: employeeVisibleReason.trim(),
          internalReason: internalReason.trim(),
        }),
      })
      setCancelTarget(null)
      await loadExams()
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败')
    } finally {
      setCancellingId('')
    }
  }

  function isPublished(exam: ExamSummary) {
    return Boolean(exam.publishedVersionId) && exam.lifecycle !== 'draft'
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试管理</h1>
        <p className="page-desc">考试列表、创建向导、发布后说明修订与整场取消</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

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
                <th>考试码</th>
                <th>五域状态</th>
                <th>开放时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td>{exam.examCode || '—'}</td>
                  <td>
                    <FiveDomainStatus
                      lifecycle={exam.lifecycle}
                      runStatus={exam.runStatus}
                      resultState={exam.resultState}
                      resultLocked={exam.resultLocked}
                    />
                  </td>
                  <td>{formatEnterpriseTime(exam.openStartAt)}</td>
                  <td>
                    {exam.lifecycle === 'draft' && (
                      <>
                        <Link to={`/exams/${exam.id}/wizard`}>继续配置</Link>
                        {' · '}
                      </>
                    )}
                    {isPublished(exam) && exam.lifecycle !== 'cancelled' && (
                      <>
                        <button type="button" className="btn-text" onClick={() => void openRevise(exam)}>
                          修订说明
                        </button>
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
                          onClick={() => openCancel(exam)}
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

      {reviseTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>修订考试说明</h2>
            <p className="page-desc">
              已发布考试只能改说明，规则、人员与时间窗口不可改。修订写入审计与修订史。
            </p>
            <label className="field">
              考试说明
              <textarea
                rows={5}
                value={reviseBody}
                onChange={(e) => setReviseBody(e.target.value)}
              />
            </label>
            {revisions.length > 0 && (
              <div>
                <h3>修订史</h3>
                <ul className="revision-list">
                  {revisions.map((row) => (
                    <li key={row.id}>
                      <span>{formatEnterpriseTime(row.createdAt)}</span>
                      <p>{row.body || '（空）'}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReviseTarget(null)}
                disabled={revising}
              >
                返回
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleRevise()}
                disabled={revising}
              >
                {revising ? '保存中…' : '保存说明'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>取消整场考试</h2>
            <p className="page-desc">取消不可逆。请分别填写员工可见说明与内部原因。</p>
            <label className="field">
              员工可见原因（必填）
              <textarea
                rows={3}
                value={employeeVisibleReason}
                onChange={(e) => setEmployeeVisibleReason(e.target.value)}
              />
            </label>
            <label className="field">
              内部原因（必填）
              <textarea
                rows={3}
                value={internalReason}
                onChange={(e) => setInternalReason(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancelTarget(null)}
                disabled={Boolean(cancellingId)}
              >
                返回
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleCancel()}
                disabled={Boolean(cancellingId)}
              >
                {cancellingId ? '取消中…' : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
