import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface QuestionBankSummary {
  id: string
  name: string
  status: string
}

interface DepartmentDto {
  id: string
  name: string
  path: string
  status: string
  children?: DepartmentDto[]
}

interface EmployeeSummary {
  id: string
  employeeNo: string
  displayName: string
  status: string
}

interface PagedEmployees {
  items: EmployeeSummary[]
}

interface RuleLine {
  bankId: string
  type: string
  drawCount: number
  scorePerQuestion: number
}

interface PreflightIssue {
  code: string
  message: string
  ruleLineIndex?: number
  required?: number
  available?: number
}

interface PreflightResult {
  examId: string
  ready: boolean
  passed: boolean
  issues: PreflightIssue[]
}

const STEPS = ['基本信息', '抽题规则', '应考人员', '可见性', '复核发布'] as const

const TYPE_OPTIONS = [
  { value: 'singleChoice', label: '单选' },
  { value: 'multipleChoice', label: '多选' },
  { value: 'trueFalse', label: '判断' },
  { value: 'essay', label: '解答题' },
]

function flattenDepartments(nodes: DepartmentDto[]): DepartmentDto[] {
  const result: DepartmentDto[] = []
  function walk(list: DepartmentDto[]) {
    for (const node of list) {
      result.push(node)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(nodes)
  return result
}

function emptyRule(bankId: string): RuleLine {
  return { bankId, type: 'singleChoice', drawCount: 5, scorePerQuestion: 1 }
}

export default function ExamWizardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [step, setStep] = useState(0)
  const [examId, setExamId] = useState(id ?? '')
  const [banks, setBanks] = useState<QuestionBankSummary[]>([])
  const [departments, setDepartments] = useState<DepartmentDto[]>([])
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preflightIssues, setPreflightIssues] = useState<PreflightIssue[]>([])

  const [title, setTitle] = useState('')
  const [openStartAt, setOpenStartAt] = useState('')
  const [ruleLines, setRuleLines] = useState<RuleLine[]>([emptyRule('')])
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [passingScore, setPassingScore] = useState(3)
  const [assigneeMode, setAssigneeMode] = useState('allActive')
  const [departmentIds, setDepartmentIds] = useState<string[]>([])
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [employeeNosText, setEmployeeNosText] = useState('')
  const [showScore, setShowScore] = useState(true)
  const [showAnswers, setShowAnswers] = useState(false)

  const flatDepartments = useMemo(() => flattenDepartments(departments), [departments])
  const totalMaxScore = ruleLines.reduce(
    (sum, line) => sum + Number(line.drawCount || 0) * Number(line.scorePerQuestion || 0),
    0,
  )

  const loadLookups = useCallback(async () => {
    try {
      const [banksRes, deptRes, empRes] = await Promise.all([
        apiFetch<QuestionBankSummary[]>('/question-banks'),
        apiFetch<DepartmentDto[]>('/departments?format=tree'),
        apiFetch<PagedEmployees>('/employees?status=active&page=1&pageSize=50'),
      ])
      const active = banksRes.data.filter((bank) => bank.status === 'active')
      setBanks(active)
      setDepartments(deptRes.data)
      setEmployees(empRes.data.items)
      if (active.length > 0) {
        setRuleLines((current) =>
          current.map((line) => ({ ...line, bankId: line.bankId || active[0].id })),
        )
      }
    } catch {
      // shown during wizard
    }
  }, [])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  async function ensureExam(): Promise<string> {
    if (examId) return examId
    const { data } = await apiFetch<{ id: string }>('/admin/exams', {
      method: 'POST',
      body: JSON.stringify({ title: title || '未命名考试' }),
    })
    setExamId(data.id)
    return data.id
  }

  function updateRule(index: number, patch: Partial<RuleLine>) {
    setRuleLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  function assigneePayload() {
    if (assigneeMode === 'byDepartment') {
      return { mode: 'byDepartment', departmentIds }
    }
    if (assigneeMode === 'selected') {
      const employeeNos = employeeNosText
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
      return { mode: 'selected', employeeIds, employeeNos }
    }
    return { mode: 'allActive' }
  }

  function assigneeLabel() {
    if (assigneeMode === 'byDepartment') {
      return `指定部门（${departmentIds.length} 个）`
    }
    if (assigneeMode === 'selected') {
      return `指定人员（${employeeIds.length} 人 + 工号列表）`
    }
    return '全部在职员工'
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
            openStartAt: openStartAt ? new Date(openStartAt).toISOString() : new Date().toISOString(),
          }),
        })
        setStep(1)
      } else if (step === 1) {
        if (ruleLines.length === 0 || ruleLines.some((line) => !line.bankId || line.drawCount < 1)) {
          setError('请至少配置一条有效抽题规则')
          return
        }
        await apiFetch(`/admin/exams/${currentExamId}/wizard/rules`, {
          method: 'PUT',
          body: JSON.stringify({
            durationMinutes,
            maxAttempts,
            passingScore,
            ruleLines: ruleLines.map((line, index) => ({
              ...line,
              lineOrder: index + 1,
            })),
          }),
        })
        setStep(2)
      } else if (step === 2) {
        await apiFetch(`/admin/exams/${currentExamId}/wizard/assignees`, {
          method: 'PUT',
          body: JSON.stringify(assigneePayload()),
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
          setPreflightIssues(preflight.issues)
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

        <form className="stack-form" onSubmit={handleStepSubmit}>
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
              {ruleLines.map((line, index) => (
                <div className="rule-line" key={`rule-${index}`}>
                  <div className="form-row">
                    <label>
                      题库
                      <select
                        value={line.bankId}
                        onChange={(e) => updateRule(index, { bankId: e.target.value })}
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
                      题型
                      <select
                        value={line.type}
                        onChange={(e) => updateRule(index, { type: e.target.value })}
                      >
                        {TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      抽题数
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={line.drawCount}
                        onChange={(e) => updateRule(index, { drawCount: Number(e.target.value) })}
                        required
                      />
                    </label>
                    <label>
                      每题分值
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={line.scorePerQuestion}
                        onChange={(e) =>
                          updateRule(index, { scorePerQuestion: Number(e.target.value) })
                        }
                        required
                      />
                    </label>
                  </div>
                  {ruleLines.length > 1 && (
                    <button
                      type="button"
                      className="btn-text"
                      onClick={() => setRuleLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      删除此规则
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setRuleLines((prev) => [...prev, emptyRule(banks[0]?.id || '')])
                }
              >
                添加规则行
              </button>
              <p className="field-hint">卷面满分 {totalMaxScore} 分（抽题数 × 分值之和）</p>
              <div className="form-row">
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
                <label>
                  最多尝试次数
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    required
                  />
                </label>
                <label>
                  及格分
                  <input
                    type="number"
                    min={0}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    required
                  />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <label>
                应考人员范围
                <select value={assigneeMode} onChange={(e) => setAssigneeMode(e.target.value)}>
                  <option value="allActive">全部在职员工</option>
                  <option value="byDepartment">指定部门</option>
                  <option value="selected">指定人员 / 工号</option>
                </select>
              </label>
              {assigneeMode === 'byDepartment' && (
                <div className="checkbox-list">
                  {flatDepartments.map((dept) => (
                    <label key={dept.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={departmentIds.includes(dept.id)}
                        onChange={(e) =>
                          setDepartmentIds((prev) =>
                            e.target.checked
                              ? [...prev, dept.id]
                              : prev.filter((id) => id !== dept.id),
                          )
                        }
                      />
                      {dept.path}
                    </label>
                  ))}
                </div>
              )}
              {assigneeMode === 'selected' && (
                <>
                  <div className="checkbox-list">
                    {employees.map((employee) => (
                      <label key={employee.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={employeeIds.includes(employee.id)}
                          onChange={(e) =>
                            setEmployeeIds((prev) =>
                              e.target.checked
                                ? [...prev, employee.id]
                                : prev.filter((id) => id !== employee.id),
                            )
                          }
                        />
                        {employee.displayName}（{employee.employeeNo}）
                      </label>
                    ))}
                  </div>
                  <label>
                    额外工号（每行一个，可与上方勾选合并）
                    <textarea
                      rows={4}
                      value={employeeNosText}
                      onChange={(e) => setEmployeeNosText(e.target.value)}
                      placeholder="EMP001&#10;EMP002"
                    />
                  </label>
                </>
              )}
            </>
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
                <dt>时长 / 次数 / 及格分</dt>
                <dd>
                  {durationMinutes} 分钟 · {maxAttempts} 次 · {passingScore} 分
                </dd>
                <dt>应考人员</dt>
                <dd>{assigneeLabel()}</dd>
              </dl>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>行</th>
                    <th>题库</th>
                    <th>题型</th>
                    <th>抽题</th>
                    <th>分值</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleLines.map((line, index) => (
                    <tr key={`review-${index}`}>
                      <td>{index + 1}</td>
                      <td>{banks.find((b) => b.id === line.bankId)?.name ?? line.bankId}</td>
                      <td>{TYPE_OPTIONS.find((item) => item.value === line.type)?.label ?? line.type}</td>
                      <td>{line.drawCount}</td>
                      <td>{line.scorePerQuestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preflightIssues.length > 0 && (
                <ul className="form-error">
                  {preflightIssues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                      {issue.message}
                      {issue.required != null &&
                        `（需要 ${issue.required}，可用 ${issue.available ?? 0}）`}
                      {issue.ruleLineIndex != null && ` · 规则行 ${issue.ruleLineIndex + 1}`}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="form-actions" style={{ gap: 12 }}>
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
