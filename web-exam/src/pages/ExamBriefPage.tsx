import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiFetch, newIdempotencyKey } from '../api/client'
import { examCompatibility } from '../browserSupport'
import { startFailureCopy } from '../examLabels'
import { FiveDomainStatus } from '../FiveDomainStatus'
import { formatEnterpriseTime } from '../formatTime'

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
  const [confirmStart, setConfirmStart] = useState(false)
  const [error, setError] = useState('')
  const [gate, setGate] = useState<{ title: string; body: string } | null>(null)

  const load = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    setError('')
    setGate(null)
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

      const lifecycle = String(examRes.data.lifecycle ?? '')
      const runStatus = String(examRes.data.runStatus ?? '')
      const hasActive = Boolean(activeRes.data?.attemptId)
      const compat = examCompatibility()
      if (runStatus === 'paused') {
        setGate(startFailureCopy('ATT_EXAM_PAUSED'))
      } else if (lifecycle === 'notStarted') {
        setGate(startFailureCopy('ATT_NOT_STARTED'))
      } else if (lifecycle === 'closing' || lifecycle === 'ended' || lifecycle === 'cancelled') {
        setGate(startFailureCopy('ATT_WINDOW_CLOSED'))
      } else if (!compat.ok && !hasActive) {
        setGate({ title: '当前环境不支持新开卷', body: compat.message })
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
    const compat = examCompatibility()
    if (!compat.ok) {
      setGate({ title: '当前环境不支持新开卷', body: compat.message })
      setConfirmStart(false)
      return
    }
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
      setConfirmStart(false)
      if (err instanceof ApiError) {
        const copy = startFailureCopy(err.code)
        if (copy) {
          setGate(copy)
          setError('')
          return
        }
      }
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
  const lifecycle = exam ? String(exam.lifecycle ?? '') : ''
  const canStart = !gate && !activeAttempt && lifecycle === 'openForAttempt'
  const maxAttempts = exam?.maxAttempts != null ? Number(exam.maxAttempts) : null
  const remainingAttempts = exam?.remainingAttempts != null ? Number(exam.remainingAttempts) : null
  const durationMinutes = exam?.durationMinutes != null ? Number(exam.durationMinutes) : null

  return (
    <div className="page">
      <header className="page-header">
        <p><Link to="/tasks">← 返回任务列表</Link></p>
        <h1>{title}</h1>
        <p className="page-desc">EX-03 考试说明与开卷</p>
      </header>

      {loading && <p>加载中…</p>}

      {gate && (
        <section className="card gate-card" role="status">
          <h2>{gate.title}</h2>
          <p>{gate.body}</p>
          {lifecycle === 'cancelled' && exam?.employeeVisibleReason != null && (
            <p className="gate-extra">{String(exam.employeeVisibleReason)}</p>
          )}
          {Boolean(exam?.resultLocked) && (
            <p className="gate-extra">结果锁定，异常处理中，请等待企业通知。</p>
          )}
        </section>
      )}

      {error && !gate && <p className="form-error">{error}</p>}

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
          {!examCompatibility().ok && (
            <p className="compat-banner risk">当前浏览器或视口不符合开卷要求，继续作答存在显示风险，但不阻断在途考试。</p>
          )}
          <button type="button" className="btn-primary" onClick={handleResume}>
            继续考试
          </button>
        </section>
      )}

      {exam && (
        <section className="card">
          <FiveDomainStatus
            lifecycle={lifecycle}
            runStatus={exam.runStatus != null ? String(exam.runStatus) : null}
            remainingAttempts={remainingAttempts}
            usedAttempts={exam.usedAttempts != null ? Number(exam.usedAttempts) : null}
            resultState={exam.resultState != null ? String(exam.resultState) : null}
            resultLocked={Boolean(exam.resultLocked)}
            participationLabel={exam.participationLabel != null ? String(exam.participationLabel) : null}
          />
          <dl className="detail-list">
            {exam.examCode != null && (
              <div className="detail-row">
                <dt>考试码</dt>
                <dd>{String(exam.examCode)}</dd>
              </div>
            )}
            {durationMinutes != null && (
              <div className="detail-row">
                <dt>考试时长</dt>
                <dd>{durationMinutes} 分钟</dd>
              </div>
            )}
            {maxAttempts != null && (
              <div className="detail-row">
                <dt>可开卷次数</dt>
                <dd>
                  {maxAttempts} 次
                  {remainingAttempts != null ? `（剩余 ${remainingAttempts} 次）` : ''}
                </dd>
              </div>
            )}
            {exam.openStartAt != null && (
              <div className="detail-row">
                <dt>开放时间</dt>
                <dd>{formatEnterpriseTime(String(exam.openStartAt))}</dd>
              </div>
            )}
            {exam.stopAttemptAt != null && (
              <div className="detail-row">
                <dt>停止开卷</dt>
                <dd>{formatEnterpriseTime(String(exam.stopAttemptAt))}</dd>
              </div>
            )}
            {exam.description != null && String(exam.description) !== '' && (
              <div className="detail-row">
                <dt>说明</dt>
                <dd>{String(exam.description)}</dd>
              </div>
            )}
          </dl>
          {canStart && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setConfirmStart(true)}
              disabled={starting}
            >
              开始考试
            </button>
          )}
        </section>
      )}

      {confirmStart && (
        <div className="workbench-overlay" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <h2>确认开卷</h2>
            <p>开卷将消耗 1 次作答机会，并立即开始计时。提交前不可退出本次计时。</p>
            {remainingAttempts != null && (
              <p>剩余次数（含本次）：{remainingAttempts}</p>
            )}
            {durationMinutes != null && <p>本场时长 {durationMinutes} 分钟。</p>}
            <div className="overlay-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmStart(false)}
                disabled={starting}
              >
                返回
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleStart()}
                disabled={starting}
              >
                {starting ? '开卷中…' : '确认开卷'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
