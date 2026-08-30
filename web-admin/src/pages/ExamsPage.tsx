import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiFetch } from '../api/client'

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
}

interface PagedExams {
  items: ExamSummary[]
  total: number
  page: number
  pageSize: number
}

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

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: '草稿',
  openForAttempt: '开放作答',
  cancelled: '已取消',
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [total, setTotal] = useState(0)
  const [banks, setBanks] = useState<QuestionBankSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showWizard, setShowWizard] = useState(false)
  const [title, setTitle] = useState('')
  const [bankId, setBankId] = useState('')
  const [drawCount, setDrawCount] = useState(5)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [submitting, setSubmitting] = useState(false)
  const [preflightIssues, setPreflightIssues] = useState<string[]>([])

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

  const loadBanks = useCallback(async () => {
    try {
      const { data } = await apiFetch<QuestionBankSummary[]>('/question-banks')
      setBanks(data.filter((bank) => bank.status === 'active'))
      if (data.length > 0 && !bankId) {
        setBankId(data[0].id)
      }
    } catch {
      // banks load failure shown during publish
    }
  }, [bankId])

  useEffect(() => {
    loadExams()
    loadBanks()
  }, [loadExams, loadBanks])

  function resetWizard() {
    setTitle('')
    setDrawCount(5)
    setDurationMinutes(60)
    setPreflightIssues([])
    setSuccess('')
    if (banks.length > 0) {
      setBankId(banks[0].id)
    }
  }

  async function handleCreateAndPublish(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    setPreflightIssues([])

    try {
      const { data: created } = await apiFetch<ExamSummary>('/admin/exams', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })

      const openStartAt = new Date().toISOString()

      await apiFetch(`/admin/exams/${created.id}/wizard/basic`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          openStartAt,
        }),
      })

      await apiFetch(`/admin/exams/${created.id}/wizard/rules`, {
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

      await apiFetch(`/admin/exams/${created.id}/wizard/assignees`, {
        method: 'PUT',
        body: JSON.stringify({ mode: 'allActive' }),
      })

      const { data: preflight } = await apiFetch<PreflightResult>(
        `/admin/exams/${created.id}/preflight`,
        { method: 'POST' },
      )

      if (!preflight.ready) {
        setPreflightIssues(preflight.issues.map((issue) => issue.message))
        return
      }

      await apiFetch(`/admin/exams/${created.id}/publish`, { method: 'POST' })

      setSuccess(`考试「${title}」已发布`)
      setShowWizard(false)
      resetWizard()
      await loadExams()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试管理</h1>
        <p className="page-desc">AD-10~12 考试列表、创建向导与发布</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>考试列表</h2>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetWizard()
              setShowWizard(true)
            }}
          >
            创建考试
          </button>
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
                <th>状态</th>
                <th>开放时间</th>
                <th>发布版本</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td>{LIFECYCLE_LABELS[exam.lifecycle] ?? exam.lifecycle}</td>
                  <td>
                    {exam.openStartAt
                      ? new Date(exam.openStartAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>{exam.publishedVersionId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && total > exams.length && (
          <p className="page-desc">共 {total} 条，当前显示 {exams.length} 条</p>
        )}
      </section>

      {showWizard && (
        <section className="card">
          <h2>创建并发布考试</h2>
          <form className="inline-form" onSubmit={handleCreateAndPublish} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
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
              题库
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                required
              >
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
              抽题规则（单选题数量）
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

            <p className="page-desc">
              应考人员：全部在职员工 · 开放开始时间：发布时设为当前时间
            </p>

            {preflightIssues.length > 0 && (
              <ul className="form-error">
                {preflightIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn-text"
                onClick={() => setShowWizard(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || banks.length === 0}
              >
                {submitting ? '预检并发布中…' : '预检并发布'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
