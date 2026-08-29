import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch, newIdempotencyKey } from '../api/client'

type AttemptDetail = Record<string, unknown>

export default function ExamWorkbenchPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!attemptId) return
    setLoading(true)
    setError('')
    try {
      const { data, meta } = await apiFetch<AttemptDetail>(`/attempts/${attemptId}`)
      setAttempt(data)
      const expiresAt = data.expiresAt as string | undefined
      if (expiresAt && meta.serverNow) {
        const diff =
          (new Date(expiresAt).getTime() - new Date(meta.serverNow).getTime()) / 1000
        setRemainingSec(Math.max(0, Math.floor(diff)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [attemptId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (remainingSec === null || remainingSec <= 0) return
    const timer = window.setInterval(() => {
      setRemainingSec((s) => (s !== null && s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [remainingSec])

  async function handleSaveStub() {
    if (!attemptId) return
    setSaveMsg('')
    setError('')
    try {
      await apiFetch(`/attempts/${attemptId}/answers/stub-item`, {
        method: 'PUT',
        body: JSON.stringify({ answer: ['A'], answerVersion: 1 }),
      })
      setSaveMsg('答案已保存（占位）')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  async function handleSubmit() {
    if (!attemptId) return
    setSubmitting(true)
    setError('')
    try {
      await apiFetch(`/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Idempotency-Key': newIdempotencyKey() },
        body: JSON.stringify({ reason: 'manual' }),
      })
      navigate(`/attempts/${attemptId}/result`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '交卷失败')
    } finally {
      setSubmitting(false)
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="page workbench">
      <header className="page-header with-actions">
        <div>
          <h1>考试作答</h1>
          <p className="page-desc">EX-04 答题工作台</p>
        </div>
        <div className="timer" aria-label="剩余时间">
          {remainingSec !== null ? formatTime(remainingSec) : '--:--'}
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {saveMsg && <p className="form-success">{saveMsg}</p>}
      {loading && <p>加载中…</p>}

      {attempt && (
        <>
          <section className="card">
            <h2>试卷区域（占位）</h2>
            <p className="stub-text">
              题目渲染与逐题导航将在后续迭代中实现。当前尝试状态：
              {String(attempt.attemptStatus ?? attempt.status ?? '—')}
            </p>
            <div className="workbench-actions">
              <button type="button" className="btn-secondary" onClick={handleSaveStub}>
                保存答案（占位）
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '交卷中…' : '交卷'}
              </button>
            </div>
          </section>
          <p>
            <Link to="/tasks">返回任务列表</Link>
          </p>
        </>
      )}
    </div>
  )
}
