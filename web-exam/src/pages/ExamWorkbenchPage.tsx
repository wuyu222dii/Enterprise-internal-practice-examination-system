import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, newIdempotencyKey } from '../api/client'

interface QuestionOption {
  key: string
  text: string
}

interface PaperItem {
  itemId: string
  order: number
  type: 'singleChoice' | 'multipleChoice' | 'trueFalse'
  stem: string
  options: QuestionOption[]
  score: number
}

interface Paper {
  attemptId: string
  items: PaperItem[]
}

interface ConfirmedAnswer {
  itemId: string
  answer: string[]
  confirmedVersion: number
  saveStatus: string
}

interface AttemptTiming {
  startedAt: string
  expiresAt: string
  remainingSeconds: number
  serverNow: string
}

interface AttemptDetail {
  attemptId: string
  examId: string
  attemptStatus: string
  timing: AttemptTiming
  confirmedAnswers: ConfirmedAnswer[]
}

type AnswerMap = Record<string, string[]>
type VersionMap = Record<string, number>
type SavingMap = Record<string, boolean>

export default function ExamWorkbenchPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null)
  const [paper, setPaper] = useState<Paper | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [versions, setVersions] = useState<VersionMap>({})
  const [saving, setSaving] = useState<SavingMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)

  const items = paper?.items ?? []
  const currentItem = items[currentIndex] ?? null

  const answeredSet = useMemo(() => {
    const set = new Set<string>()
    for (const [itemId, value] of Object.entries(answers)) {
      if (value.length > 0) set.add(itemId)
    }
    return set
  }, [answers])

  const load = useCallback(async () => {
    if (!attemptId) return
    setLoading(true)
    setError('')
    try {
      const [attemptRes, paperRes] = await Promise.all([
        apiFetch<AttemptDetail>(`/attempts/${attemptId}`),
        apiFetch<Paper>(`/attempts/${attemptId}/paper`),
      ])
      const detail = attemptRes.data
      setAttempt(detail)
      setPaper(paperRes.data)

      const initialAnswers: AnswerMap = {}
      const initialVersions: VersionMap = {}
      for (const confirmed of detail.confirmedAnswers ?? []) {
        initialAnswers[confirmed.itemId] = confirmed.answer
        initialVersions[confirmed.itemId] = confirmed.confirmedVersion
      }
      setAnswers(initialAnswers)
      setVersions(initialVersions)

      const timing = detail.timing
      if (timing?.remainingSeconds != null) {
        setRemainingSec(Math.max(0, Math.floor(timing.remainingSeconds)))
      } else if (timing?.expiresAt && timing?.serverNow) {
        const diff =
          (new Date(timing.expiresAt).getTime() - new Date(timing.serverNow).getTime()) / 1000
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

  async function syncConfirmedAnswers() {
    if (!attemptId) return
    const { data } = await apiFetch<AttemptDetail>(`/attempts/${attemptId}`)
    const latestAnswers: AnswerMap = {}
    const latestVersions: VersionMap = {}
    for (const confirmed of data.confirmedAnswers ?? []) {
      latestAnswers[confirmed.itemId] = confirmed.answer
      latestVersions[confirmed.itemId] = confirmed.confirmedVersion
    }
    setAnswers(latestAnswers)
    setVersions(latestVersions)
  }

  async function persistAnswer(itemId: string, answer: string[]) {
    if (!attemptId) return
    const nextVersion = (versions[itemId] ?? 0) + 1
    setSaving((prev) => ({ ...prev, [itemId]: true }))
    setError('')
    try {
      const { data } = await apiFetch<{
        itemId: string
        confirmedVersion: number
        saveStatus: string
      }>(`/attempts/${attemptId}/answers/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ answer, answerVersion: nextVersion }),
      })
      setVersions((prev) => ({ ...prev, [itemId]: data.confirmedVersion }))
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await syncConfirmedAnswers()
        setError('答案版本冲突，已同步最新数据，请重新选择答案')
      } else {
        setError(err instanceof Error ? err.message : '保存失败')
      }
      throw err
    } finally {
      setSaving((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  async function handleSingleSelect(itemId: string, key: string) {
    const next = [key]
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    await persistAnswer(itemId, next)
  }

  async function handleMultipleToggle(itemId: string, key: string) {
    const current = answers[itemId] ?? []
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key].sort()
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    if (next.length > 0) {
      await persistAnswer(itemId, next)
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

  function renderOptions(item: PaperItem) {
    const selected = answers[item.itemId] ?? []
    const isSaving = saving[item.itemId]

    if (item.type === 'multipleChoice') {
      return (
        <ul className="option-list">
          {item.options.map((opt) => (
            <li key={opt.key}>
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.key)}
                  disabled={isSaving}
                  onChange={() => handleMultipleToggle(item.itemId, opt.key)}
                />
                <span className="option-key">{opt.key}</span>
                <span className="option-text">{opt.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )
    }

    const inputType = item.type === 'trueFalse' ? 'radio' : 'radio'
    return (
      <ul className="option-list">
        {item.options.map((opt) => (
          <li key={opt.key}>
            <label className="option-label">
              <input
                type={inputType}
                name={`q-${item.itemId}`}
                checked={selected[0] === opt.key}
                disabled={isSaving}
                onChange={() => handleSingleSelect(item.itemId, opt.key)}
              />
              <span className="option-key">{opt.key}</span>
              <span className="option-text">{opt.text}</span>
            </label>
          </li>
        ))}
      </ul>
    )
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
      {loading && <p>加载中…</p>}

      {attempt && paper && (
        <div className="workbench-layout">
          <main className="workbench-main">
            {currentItem ? (
              <section className="card question-card">
                <div className="question-meta">
                  <span>第 {currentItem.order} 题</span>
                  <span className="question-type">
                    {currentItem.type === 'singleChoice' && '单选题'}
                    {currentItem.type === 'multipleChoice' && '多选题'}
                    {currentItem.type === 'trueFalse' && '判断题'}
                  </span>
                  <span>{currentItem.score} 分</span>
                  {saving[currentItem.itemId] && (
                    <span className="save-indicator">保存中…</span>
                  )}
                </div>
                <h2 className="question-stem">{currentItem.stem}</h2>
                {renderOptions(currentItem)}
                <div className="question-nav">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => i - 1)}
                  >
                    上一题
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={currentIndex >= items.length - 1}
                    onClick={() => setCurrentIndex((i) => i + 1)}
                  >
                    下一题
                  </button>
                </div>
              </section>
            ) : (
              <section className="card">
                <p>试卷无题目</p>
              </section>
            )}

            <div className="workbench-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '交卷中…' : '交卷'}
              </button>
            </div>
            <p>
              <Link to="/tasks">返回任务列表</Link>
            </p>
          </main>

          <aside className="answer-card" aria-label="答题卡">
            <h2>答题卡</h2>
            <p className="answer-card-summary">
              已答 {answeredSet.size} / {items.length}
            </p>
            <ol className="answer-card-grid">
              {items.map((item, idx) => {
                const answered = answeredSet.has(item.itemId)
                const isCurrent = idx === currentIndex
                return (
                  <li key={item.itemId}>
                    <button
                      type="button"
                      className={[
                        'answer-card-btn',
                        answered ? 'answered' : '',
                        isCurrent ? 'current' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {item.order}
                    </button>
                  </li>
                )
              })}
            </ol>
          </aside>
        </div>
      )}
    </div>
  )
}
