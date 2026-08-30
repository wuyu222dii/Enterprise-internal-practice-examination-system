import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface QuestionBankSummary {
  id: string
  name: string
  status: string
}

interface PreflightResult {
  examId: string
  ready: boolean
  passed: boolean
  issues: Array<{ code: string; message: string }>
}

const STEPS = ['基本信息', '抽题规则', '应考人员', '可见性', '复核发布'] as const

export default function ExamWizardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [step, setStep] = useState(0)
  const [examId, setExamId] = useState(id ?? '')
  const [banks, setBanks] = useState<QuestionBankSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preflightIssues, setPreflightIssues] = useState<string[]>([])

  const [title, setTitle] = useState('')
  const [openStartAt, setOpenStartAt] = useState('')
  const [bankId, setBankId] = useState('')
  const [drawCount, setDrawCount] = useState(5)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [assigneeMode, setAssigneeMode] = useState('allActive')
  const [showScore, setShowScore] = useState(true)
  const [showAnswers, setShowAnswers] = useState(false)

  const loadBanks = useCallback(async () => {
    try {
      const { data } = await apiFetch<QuestionBankSummary[]>('/question-banks')
      const active = data.filter((bank) => bank.status === 'active')
      setBanks(active)
      if (active.length > 0) {
        setBankId((current) => current || active[0].id)
      }
    } catch {
      // shown during wizard
    }
  }, [])

  useEffect(() => {
    loadBanks()
  }, [loadBanks])

  async function ensureExam(): Promise<string> {
    if (examId) return examId
    const { data } = await apiFetch<{ id: string }>('/admin/exams', {
      method: 'POST',
      body: JSON.stringify({ title: title || '未命名考试' }),
    })
    setExamId(data.id)
    return data.id
  }

  async function handleStepSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setPreflightIssues([])

    try {
      const currentExamId = await ensureExam()

      if (step === 0) {
        await apiFetch(`/admin/exams/${currentExamId}/wizard/basic`, {
          method: 'PUT',
          body: JSON.stringify({
            title,
            openStartAt: openStartAt || new Date().toISOString(),
          }),
        })
        setStep(1)
      } else if (step === 1) {
        await apiFetch(`/admin/exams/${currentExamId}/wizard/rules`, {
          method: 'PUT',
          body: JSON.stringify({
            durationMinutes,
            maxAttempts: 1,
            passingScore: 3,
            ruleLines: [
              {
                bankId,
                type: 'singleChoice',
                drawCount,
                scorePerQuestion: 1,
              },
            ],
          }),
        })
        setStep(2)
      } else if (step === 2) {
        await apiFetch(`/admin/exams/${currentExamId}/wizard/assignees`, {
          method: 'PUT',
          body: JSON.stringify({ mode: assigneeMode }),
        })
        setStep(3)
      } else if (step === 3) {
        await apiFetch(`/admin/exams/${currentExamId}/wizard/visibility`, {
          method: 'PUT',
          body: JSON.stringify({ showScore, showAnswers }),
        })
        setStep(4)
      } else if (step === 4) {
        await apiFetch(`/admin/exams/${currentExamId}/wizard/review`, {
          method: 'PUT',
          body: JSON.stringify({ acknowledged: true }),
        })

        const { data: preflight } = await apiFetch<PreflightResult>(
          `/admin/exams/${currentExamId}/preflight`,
          { method: 'POST' },
        )

        if (!preflight.ready) {
          setPreflightIssues(preflight.issues.map((issue) => issue.message))
          return
        }

        await apiFetch(`/admin/exams/${currentExamId}/publish`, { method: 'POST' })
        setSuccess(`考试「${title}」已发布`)
        setTimeout(() => navigate('/exams'), 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{isNew ? '创建考试' : '编辑考试向导'}</h1>
        <p className="page-desc">
          步骤 {step + 1}/{STEPS.length}：{STEPS[step]}
          {examId && ` · 考试 ID ${examId}`}
        </p>
      </header>

      <p>
        <Link to="/exams">← 返回考试列表</Link>
      </p>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <section className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STEPS.map((label, index) => (
            <span
              key={label}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                background: index === step ? '#2563eb' : index < step ? '#dbeafe' : '#f3f4f6',
                color: index === step ? '#fff' : '#374151',
                fontSize: 14,
              }}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>

        <form className="inline-form" onSubmit={handleStepSubmit} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {step === 0 && (
            <>
              <label>
                考试标题
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="例如：2026 年第一季度考核"
                />
              </label>
              <label>
                开放开始时间
                <input
                  type="datetime-local"
                  value={openStartAt}
                  onChange={(e) => setOpenStartAt(e.target.value)}
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <label>
                题库
                <select value={bankId} onChange={(e) => setBankId(e.target.value)} required>
                  {banks.length === 0 ? (
                    <option value="">暂无可用题库</option>
                  ) : (
                    banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label>
                单选题抽题数量
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={drawCount}
                  onChange={(e) => setDrawCount(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                考试时长（分钟）
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                />
              </label>
            </>
          )}

          {step === 2 && (
            <label>
              应考人员范围
              <select value={assigneeMode} onChange={(e) => setAssigneeMode(e.target.value)}>
                <option value="allActive">全部在职员工</option>
              </select>
            </label>
          )}

          {step === 3 && (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showScore}
                  onChange={(e) => setShowScore(e.target.checked)}
                />
                交卷后显示得分
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                />
                交卷后显示答案解析
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <dl className="detail-list">
                <dt>标题</dt>
                <dd>{title || '—'}</dd>
                <dt>题库</dt>
                <dd>{banks.find((b) => b.id === bankId)?.name ?? bankId}</dd>
                <dt>抽题数</dt>
                <dd>{drawCount} 道单选题</dd>
                <dt>时长</dt>
                <dd>{durationMinutes} 分钟</dd>
                <dt>应考人员</dt>
                <dd>{assigneeMode === 'allActive' ? '全部在职员工' : assigneeMode}</dd>
              </dl>
              {preflightIssues.length > 0 && (
                <ul className="form-error">
                  {preflightIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {step > 0 && (
              <button
                type="button"
                className="btn-text"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
              >
                上一步
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (step === 1 && banks.length === 0)}
            >
              {loading
                ? '处理中…'
                : step === STEPS.length - 1
                  ? '预检并发布'
                  : '下一步'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
