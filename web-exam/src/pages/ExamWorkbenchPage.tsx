import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, newIdempotencyKey } from '../api/client'
import { examCompatibility } from '../browserSupport'

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
  observationRemainingSeconds?: number
  serverNow: string
}

interface AttemptDetail {
  attemptId: string
  examId: string
  attemptStatus: string
  attemptNumber?: number
  runStatus?: string
  inObservation?: boolean
  resultLocked?: boolean
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
  const [observing, setObserving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)
  const [observationSec, setObservationSec] = useState(0)
  const saveTimers = useRef<Record<string, number>>({})
  const pendingAnswers = useRef<AnswerMap>({})
  const versionsRef = useRef<VersionMap>({})

  const items = paper?.items ?? []
  const currentItem = items[currentIndex] ?? null
  const readOnly = paused || observing

  const answeredSet = useMemo(() => {
    const set = new Set<string>()
    for (const [itemId, value] of Object.entries(answers)) {
      if (value.length > 0) set.add(itemId)
    }
    return set
  }, [answers])

  const applyDetail = useCallback((detail: AttemptDetail) => {
    setAttempt(detail)
    setPaused(detail.runStatus === 'paused')
    const inObservation =
      Boolean(detail.inObservation) ||
      (detail.attemptStatus === 'inProgress' && (detail.timing?.remainingSeconds ?? 1) <= 0)
    setObserving(inObservation && detail.attemptStatus === 'inProgress' && detail.runStatus !== 'paused')
    const timing = detail.timing
    if (timing?.remainingSeconds != null) {
      setRemainingSec(Math.max(0, Math.floor(timing.remainingSeconds)))
    }
    if (timing?.observationRemainingSeconds != null) {
      setObservationSec(Math.max(0, Math.floor(timing.observationRemainingSeconds)))
    }
    if (detail.attemptStatus === 'completed') {
      navigate(`/attempts/${detail.attemptId}/result`, { replace: true })
    }
  }, [navigate])

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
      applyDetail(detail)
      setPaper(paperRes.data)

      const initialAnswers: AnswerMap = {}
      const initialVersions: VersionMap = {}
      const initiallySaved: SavedMap = {}
      for (const confirmed of detail.confirmedAnswers ?? []) {
        initialAnswers[confirmed.itemId] = confirmed.answer
        initialVersions[confirmed.itemId] = confirmed.confirmedVersion
        initiallySaved[confirmed.itemId] = confirmed.saveStatus === 'saved'
      }
      setAnswers(initialAnswers)
      setVersions(initialVersions)
      versionsRef.current = initialVersions
      setSaved(initiallySaved)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [attemptId, applyDetail])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (remainingSec === null) return
    if (remainingSec > 0) {
      const timer = window.setInterval(() => {
        setRemainingSec((s) => (s !== null && s > 0 ? s - 1 : 0))
      }, 1000)
      return () => window.clearInterval(timer)
    }
    if (observationSec > 0 && !paused) {
      setObserving(true)
      const timer = window.setInterval(() => {
        setObservationSec((s) => (s > 0 ? s - 1 : 0))
      }, 1000)
      return () => window.clearInterval(timer)
    }
    return undefined
  }, [remainingSec, observationSec, paused])

  useEffect(() => {
    if (!attemptId || (!paused && !observing)) return
    const timer = window.setInterval(async () => {
      try {
        const { data } = await apiFetch<AttemptDetail>(`/attempts/${attemptId}`)
        applyDetail(data)
      } catch {
        // keep overlay; next poll retries
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [attemptId, paused, observing, applyDetail])

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
    applyDetail(data)
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
  }

  async function persistAnswer(itemId: string, answer: string[]) {
    if (!attemptId || readOnly) return
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
      if (err instanceof ApiError && err.code === 'ANS_IN_OBSERVATION') {
        setObserving(true)
        setRemainingSec(0)
        return
      }
      if (err instanceof ApiError && err.status === 409) {
        await syncConfirmedAnswers()
        setError('答案版本冲突，已同步最新数据，请重新选择答案')
        return
      }
      if (err instanceof ApiError && (err.status === 403 || err.code === 'ATT_EXAM_PAUSED')) {
        setPaused(true)
        setObserving(false)
        return
      }
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  function scheduleSave(itemId: string, answer: string[]) {
    if (readOnly) return
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
    if (readOnly) return
    const next = [key]
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    setSaved((prev) => ({ ...prev, [itemId]: false }))
    scheduleSave(itemId, next)
  }

  function handleEssayChange(itemId: string, text: string) {
    if (readOnly) return
    const next = text.trim() ? [text] : []
    setAnswers((prev) => ({ ...prev, [itemId]: next }))
    setSaved((prev) => ({ ...prev, [itemId]: false }))
    if (next.length > 0) {
      scheduleSave(itemId, next)
    }
  }

  function handleMultipleToggle(itemId: string, key: string) {
    if (readOnly) return
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
    if (!attemptId || readOnly) return
    const unsaved = items.filter((item) => !saved[item.itemId])
    if (unsaved.length > 0) {
      setError('存在未确认保存的答案，请等待保存完成后再交卷')
      return
    }
    if (!confirmSubmit) {
      setConfirmSubmit(true)
      return
    }
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
      if (err instanceof ApiError && err.code === 'ANS_UNCONFIRMED_ANSWERS') {
        setError('存在未确认保存的答案，请等待保存完成后再交卷')
        return
      }
      if (err instanceof ApiError && err.code === 'ANS_IN_OBSERVATION') {
        setObserving(true)
        setRemainingSec(0)
        setConfirmSubmit(false)
        return
      }
      setError(err instanceof Error ? err.message : '交卷失败')
      setConfirmSubmit(false)
    } finally {
      setSubmitting(false)
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const timerUrgent = remainingSec !== null && remainingSec > 0 && remainingSec <= 60

  function renderOptions(item: PaperItem) {
    const selected = answers[item.itemId] ?? []
    const isSaving = saving[item.itemId]
    const disabled = isSaving || readOnly

    if (item.type === 'essay') {
      return (
        <label className="essay-field">
          作答
          <textarea
            rows={8}
            value={selected[0] ?? ''}
            disabled={disabled}
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
                  disabled={disabled}
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

    return (
      <ul className="option-list">
        {item.options.map((opt) => (
          <li key={opt.key}>
            <label className="option-label">
              <input
                type="radio"
                name={`q-${item.itemId}`}
                checked={selected[0] === opt.key}
                disabled={disabled}
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
      {paused && (
        <div className="workbench-overlay" role="alertdialog" aria-modal="true">
          <div className="overlay-card">
            <h2>考试已暂停</h2>
            <p>当前无法保存答案或交卷。请等待管理员确认补时后继续。</p>
          </div>
        </div>
      )}
      {observing && !paused && (
        <div className="workbench-overlay" role="status">
          <div className="overlay-card">
            <h2>答题时间已到，正在确认平台运行状态</h2>
            <p>当前为只读观察，尚未交卷。请不要关闭页面。</p>
            {observationSec > 0 && (
              <p className="overlay-timer">观察剩余 {observationSec} 秒</p>
            )}
          </div>
        </div>
      )}
      {confirmSubmit && !submitting && (
        <div className="workbench-overlay" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <h2>确认交卷</h2>
            <p>
              已答 {answeredSet.size} 题，未答 {Math.max(0, items.length - answeredSet.size)} 题。
            </p>
            <p>提交后不可再改答案。本次为第 {attempt?.attemptNumber ?? '—'} 次尝试。</p>
            <div className="overlay-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmSubmit(false)}
              >
                返回检查
              </button>
              <button type="button" className="btn-primary" onClick={() => void handleSubmit()}>
                确认交卷
              </button>
            </div>
          </div>
        </div>
      )}
      {submitting && (
        <div className="workbench-overlay overlay-busy" role="status" aria-live="polite">
          <div className="overlay-card">
            <h2>交卷处理中</h2>
            <p>正在提交本次作答，请不要关闭页面。</p>
          </div>
        </div>
      )}

      <header className="page-header with-actions">
        <div>
          <h1>考试作答</h1>
          <p className="page-desc">EX-04 答题工作台</p>
        </div>
        <div
          className={['timer', timerUrgent ? 'timer-urgent' : ''].filter(Boolean).join(' ')}
          aria-label="剩余时间"
        >
          {remainingSec !== null ? formatTime(remainingSec) : '--:--'}
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {!examCompatibility().ok && (
        <p className="compat-banner risk">当前浏览器或视口不符合开卷要求。在途考试可继续作答，但不保证版面完整。</p>
      )}
      {loading && <p>加载中…</p>}

      {attempt && paper && (
        <div className={readOnly ? 'workbench-layout is-disabled' : 'workbench-layout'}>
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
                disabled={submitting || readOnly}
              >
                {submitting ? '交卷处理中…' : '交卷'}
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
