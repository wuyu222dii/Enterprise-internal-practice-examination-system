import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface PaperOption {
  key: string
  text: string
}

interface PaperItem {
  itemId: string
  order?: number
  type?: string
  stem?: string
  options?: PaperOption[]
  employeeAnswer?: string[]
  standardAnswer?: string[]
}

interface AttemptDetail {
  attemptId: string
  employeeId: string
  attemptNumber: number
  attemptStatus: string
  voided: boolean
  startedAt: string | null
  submittedAt?: string | null
  totalScore?: number
  maxScore?: number
  passed?: boolean
  paper?: {
    items: PaperItem[]
  }
}

const TYPE_LABELS: Record<string, string> = {
  singleChoice: '单选',
  multipleChoice: '多选',
  trueFalse: '判断',
  essay: '解答题',
}

export default function AttemptDetailPage() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>()
  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [employeeReason, setEmployeeReason] = useState('')
  const [internalReason, setInternalReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const load = useCallback(async () => {
    if (!examId || !attemptId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<AttemptDetail>(
        `/admin/exams/${examId}/attempts/${attemptId}`,
      )
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载尝试详情失败')
    } finally {
      setLoading(false)
    }
  }, [examId, attemptId])

  useEffect(() => {
    load()
  }, [load])

  async function handleVoid(e: FormEvent) {
    e.preventDefault()
    if (!examId || !attemptId) return
    setVoiding(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/admin/exams/${examId}/attempts/${attemptId}/void`, {
        method: 'POST',
        body: JSON.stringify({
          employeeVisibleReason: employeeReason,
          internalReason,
        }),
      })
      setSuccess('尝试已作废')
      setEmployeeReason('')
      setInternalReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '作废失败')
    } finally {
      setVoiding(false)
    }
  }

  const items = detail?.paper?.items ?? []

  return (
    <div className="page">
      <header className="page-header">
        <h1>尝试详情</h1>
        <p className="page-desc">考试 {examId} · 尝试 {attemptId}</p>
      </header>

      <p>
        <Link to="/scores">← 返回成绩报表</Link>
      </p>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      {loading && <p>加载中…</p>}

      {detail && (
        <>
          <section className="card">
            <dl className="detail-list">
              <dt>尝试 ID</dt>
              <dd>{detail.attemptId}</dd>
              <dt>员工 ID</dt>
              <dd>{detail.employeeId}</dd>
              <dt>第几次尝试</dt>
              <dd>{detail.attemptNumber}</dd>
              <dt>状态</dt>
              <dd>
                {detail.attemptStatus}
                {detail.voided ? '（已作废）' : ''}
              </dd>
              <dt>开始时间</dt>
              <dd>{detail.startedAt ? new Date(detail.startedAt).toLocaleString() : '—'}</dd>
              <dt>交卷时间</dt>
              <dd>{detail.submittedAt ? new Date(detail.submittedAt).toLocaleString() : '—'}</dd>
              <dt>得分</dt>
              <dd>
                {detail.totalScore != null ? `${detail.totalScore} / ${detail.maxScore ?? '—'}` : '—'}
              </dd>
            </dl>
          </section>

          <section className="card">
            <h2>只读试卷</h2>
            {items.length === 0 ? (
              <p className="stub-note">暂无试卷内容</p>
            ) : (
              items.map((item, index) => (
                <article className="paper-item" key={item.itemId}>
                  <strong>
                    {index + 1}. {TYPE_LABELS[item.type ?? ''] ?? item.type ?? '题目'}
                  </strong>
                  <pre>{item.stem}</pre>
                  {item.options && item.options.length > 0 && (
                    <ul>
                      {item.options.map((option) => (
                        <li key={option.key}>
                          {option.key}. {option.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p>员工作答：{item.employeeAnswer?.join('、') || '未作答'}</p>
                  <p>标准答案：{item.standardAnswer?.join('、') || '—'}</p>
                </article>
              ))
            )}
          </section>

          {!detail.voided && detail.attemptStatus !== 'voided' && (
            <section className="card">
              <h2>作废此尝试</h2>
              <form className="stack-form" onSubmit={handleVoid}>
                <label>
                  员工可见原因
                  <input
                    value={employeeReason}
                    onChange={(e) => setEmployeeReason(e.target.value)}
                    required
                  />
                </label>
                <label>
                  内部原因
                  <input
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
          )}
        </>
      )}
    </div>
  )
}
