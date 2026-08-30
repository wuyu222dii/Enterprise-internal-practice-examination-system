import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch, newIdempotencyKey } from '../api/client'

type ExamDetail = Record<string, unknown>

interface ActiveAttempt {
  attemptId: string
  attemptStatus?: string
}

export default function ExamBriefPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    setError('')
    try {
      const [examRes, activeRes] = await Promise.all([
        apiFetch<ExamDetail>(`/exams/${examId}`),
        apiFetch<Record<string, unknown>>(`/exams/${examId}/active-attempt`),
      ])
      setExam(examRes.data)

      const attemptId = activeRes.data?.attemptId
      if (attemptId) {
        setActiveAttempt({
          attemptId: String(attemptId),
          attemptStatus: activeRes.data.attemptStatus
            ? String(activeRes.data.attemptStatus)
            : undefined,
        })
      } else {
        setActiveAttempt(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    load()
  }, [load])

  async function handleStart() {
    if (!examId) return
    setStarting(true)
    setError('')
    try {
      const { data } = await apiFetch<Record<string, unknown>>(
        `/exams/${examId}/attempts`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': newIdempotencyKey() },
        },
      )
      const attemptId = String(data.attemptId ?? data.id ?? '')
      if (!attemptId) {
        throw new Error('未返回尝试 ID')
      }
      navigate(`/attempts/${attemptId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '开卷失败')
    } finally {
      setStarting(false)
    }
  }

  function handleResume() {
    if (activeAttempt?.attemptId) {
      navigate(`/attempts/${activeAttempt.attemptId}`, { replace: true })
    }
  }

  const title = exam
    ? String(exam.title ?? exam.examCode ?? examId)
    : examId

  return (
    <div className="page">
      <header className="page-header">
        <p><Link to="/tasks">← 返回任务列表</Link></p>
        <h1>{title}</h1>
        <p className="page-desc">EX-03 考试说明与开卷</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>加载中…</p>}

      {activeAttempt && (
        <section className="card resume-prompt">
          <h2>继续考试</h2>
          <p className="resume-text">
            您有进行中的考试
            {activeAttempt.attemptStatus
              ? `（${activeAttempt.attemptStatus}）`
              : ''}
            ，是否继续作答？
          </p>
          <button type="button" className="btn-primary" onClick={handleResume}>
            继续考试
          </button>
        </section>
      )}

      {exam && (
        <section className="card">
          <dl className="detail-list">
            {Object.entries(exam)
              .filter(([key]) => !['id', 'examId'].includes(key))
              .slice(0, 8)
              .map(([key, value]) => (
                <div key={key} className="detail-row">
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
          {!activeAttempt && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleStart}
              disabled={starting}
            >
              {starting ? '开卷中…' : '开始考试'}
            </button>
          )}
        </section>
      )}
    </div>
  )
}
