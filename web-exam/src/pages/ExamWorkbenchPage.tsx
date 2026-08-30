import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, newIdempotencyKey } from '../api/client'

interface QuestionOption {
  key: string
  text: string
}

interface PaperItem {
  itemId: string
  order: number
  type: 'singleChoice' | 'multipleChoice' | 'trueFalse' | 'essay'
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
  runStatus?: string
  timing: AttemptTiming
  confirmedAnswers: ConfirmedAnswer[]
}

type AnswerMap = Record<string, string[]>
type VersionMap = Record<string, number>
type SavingMap = Record<string, boolean>
type SavedMap = Record<string, boolean>

const SAVE_DEBOUNCE_MS = 600

export default function ExamWorkbenchPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null)
  const [paper, setPaper] = useState<Paper | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [versions, setVersions] = useState<VersionMap>({})
  const [saving, setSaving] = useState<SavingMap>({})
  const [saved, setSaved] = useState<SavedMap>({})
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)
  const saveTimers = useRef<Record<string, number>>({})
  const pendingAnswers = useRef<AnswerMap>({})
  const versionsRef = useRef<VersionMap>({})

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
      versionsRef.current = initialVersions
      const initiallySaved: SavedMap = {}
      for (const confirmed of detail.confirmedAnswers ?? []) {
        initiallySaved[confirmed.itemId] = confirmed.saveStatus === 'saved'
      }
      setSaved(initiallySaved)
      setPaused(detail.runStatus === 'paused')

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

  useEffect(() => {
    return () => {
      for (const timer of Object.values(saveTimers.current)) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  useEffect(() => {
    versionsRef.current = versions
  }, [versions])

  async function syncConfirmedAnswers() {
    if (!attemptId) return
    const { data } = await apiFetch<AttemptDetail>(`/attempts/${attemptId}`)
    const latestAnswers: AnswerMap = {}
    const latestVersions: VersionMap = {}
    const latestSaved: SavedMap = {}
    for (const confirmed of data.confirmedAnswers ?? []) {
      latestAnswers[confirmed.itemId] = confirmed.answer
      latestVersions[confirmed.itemId] = confirmed.confirmedVersion
      latestSaved[confirmed.itemId] = confirmed.saveStatus === 'saved'
    }
    setAnswers(latestAnswers)
    setVersions(latestVersions)
    versionsRef.current = latestVersions
    setSaved(latestSaved)
    setPaused(data.runStatus === 'paused')
  }

  async function persistAnswer(itemId: string, answer: string[]) {
    if (!attemptId) return
    const nextVersion = (versionsRef.current[itemId] ?? 0) + 1
    setSaving((prev) => ({ ...prev, [itemId]: true }))
    setSaved((prev) => ({ ...prev, [itemId]: false }))
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
      versionsRef.current = { ...versionsRef.current, [itemId]: data.confirmedVersion }
      setVersions((prev) => ({ ...prev, [itemId]: data.confirmedVersion }))
      setSaved((prev) => ({ ...prev, [itemId]: data.saveStatus === 'saved' }))
    } catch (err) {
      setSaved((prev) => ({ ...prev, [itemId]: false }))
      if (err instanceof ApiError && err.status === 409) {
        await syncConfirmedAnswers()
        setError('答案版本冲突，已同步最新数据，请重新选择答案')
        return
      }
      if (err instanceof ApiError && err.status === 403) {
        setPaused(true)
        setError('考试已暂停，答案暂无法保存。恢复后将自动继续。')
        return
      }
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  function scheduleSave(itemId: string, answer: string[]) {
    pendingAnswers.current[itemId] = answer
    if (saveTimers.current[itemId]) {
      window.clearTimeout(saveTimers.current[itemId])
    }
    saveTimers.current[itemId] = window.setTimeout(() => {
      const pending = pendingAnswers.current[itemId]
      if (pending) {
        void persistAnswer(itemId, pending)
      }
    }, SAVE_DEBOUNCE_MS)
  }

  function handleSingleSelect(itemId: string, key: string) {
    const next = [key]
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    setSaved((prev) => ({ ...prev, [itemId]: false }))
    scheduleSave(itemId, next)
  }

  function handleEssayChange(itemId: string, text: string) {
    const next = text.trim() ? [text] : []
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    setSaved((prev) => ({ ...prev, [itemId]: false }))
    if (next.length > 0) {
      scheduleSave(itemId, next)
    }
  }

  function handleMultipleToggle(itemId: string, key: string) {
    const current = answers[itemId] ?? []
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key].sort()
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    setSaved((prev) => ({ ...prev, [itemId]: false }))
    if (next.length > 0) {
      scheduleSave(itemId, next)
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

    if (item.type === 'essay') {
      return (
        <label className="essay-field">
          作答
          <textarea
            rows={8}
            value={selected[0] ?? ''}
            disabled={isSaving || paused}
            placeholder="请输入解答内容"
            onChange={(e) => handleEssayChange(item.itemId, e.target.value)}
          />
        </label>
      )
    }

    if (item.type === 'multipleChoice') {
      return (
        <ul className="option-list">
          {item.options.map((opt) => (
            <li key={opt.key}>
              <label className="option-label">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.key)}
                  disabled={isSaving || paused}
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
                disabled={isSaving || paused}
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

      {paused && (
        <p className="form-error" role="status">
          考试已暂停，当前无法保存答案或交卷。请等待管理员确认补时后继续。
        </p>
      )}
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
                    {currentItem.type === 'essay' && '解答题'}
                  </span>
                  <span>{currentItem.score} 分</span>
                  {saving[currentItem.itemId] && (
                    <span className="save-indicator">保存中…</span>
                  )}
                  {!saving[currentItem.itemId] && saved[currentItem.itemId] && (
                    <span className="save-indicator">已保存</span>
                  )}
                  {!saving[currentItem.itemId] &&
                    !saved[currentItem.itemId] &&
                    (answers[currentItem.itemId]?.length ?? 0) > 0 && (
                      <span className="save-indicator">未保存</span>
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
                disabled={submitting || paused}
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
