import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { formatEnterpriseTime } from '../formatTime'

interface QuestionDto {
  id: string
  questionBankId: string
  categoryId: string
  knowledgePointId?: string | null
  status: string
  latestVersionId?: string
}

interface QuestionVersionDto {
  id: string
  questionId?: string
  versionNo?: number
  type: string
  stem: string
  difficulty: string
  options?: OptionRow[]
  standardAnswer?: string[]
  explanation?: string
  defaultScore?: number
  createdAt?: string
}

interface CategoryDto {
  id: string
  name: string
}

interface KnowledgePointDto {
  id: string
  name: string
  categoryId?: string
}

interface PagedQuestions {
  items: QuestionDto[]
  total: number
  page: number
  pageSize: number
}

interface BankDto {
  id: string
  name: string
  status: string
}

interface OptionRow {
  key: string
  text: string
}

const TYPE_LABELS: Record<string, string> = {
  singleChoice: '单选',
  multipleChoice: '多选',
  trueFalse: '判断',
  essay: '解答题',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

function defaultOptions(type: string): OptionRow[] {
  if (type === 'trueFalse') {
    return [
      { key: 'A', text: '正确' },
      { key: 'B', text: '错误' },
    ]
  }
  if (type === 'essay') {
    return []
  }
  return [
    { key: 'A', text: '选项A' },
    { key: 'B', text: '选项B' },
  ]
}

export default function QuestionsPage() {
  const { bankId } = useParams<{ bankId: string }>()
  const [questions, setQuestions] = useState<QuestionDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePointDto[]>([])
  const [versions, setVersions] = useState<Record<string, QuestionVersionDto>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [knowledgePointId, setKnowledgePointId] = useState('')
  const [type, setType] = useState('singleChoice')
  const [stem, setStem] = useState('')
  const [optionRows, setOptionRows] = useState<OptionRow[]>(defaultOptions('singleChoice'))
  const [answerKeys, setAnswerKeys] = useState<string[]>(['A'])
  const [referenceAnswer, setReferenceAnswer] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [explanation, setExplanation] = useState('')
  const [defaultScore, setDefaultScore] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newKpName, setNewKpName] = useState('')
  const [reviseQuestionId, setReviseQuestionId] = useState('')
  const [historyQuestionId, setHistoryQuestionId] = useState('')
  const [historyVersions, setHistoryVersions] = useState<QuestionVersionDto[]>([])
  const [busyQuestionId, setBusyQuestionId] = useState('')
  const [copyQuestion, setCopyQuestion] = useState<QuestionDto | null>(null)
  const [banks, setBanks] = useState<BankDto[]>([])
  const [copyBankId, setCopyBankId] = useState('')
  const [copyCategories, setCopyCategories] = useState<CategoryDto[]>([])
  const [copyCategoryId, setCopyCategoryId] = useState('')
  const [copying, setCopying] = useState(false)
  const categoryIdRef = useRef('')

  const isEssay = type === 'essay'
  const isMultiple = type === 'multipleChoice'
  categoryIdRef.current = categoryId

  const loadKnowledgePoints = useCallback(async (selectedCategoryId: string) => {
    if (!selectedCategoryId) {
      setKnowledgePoints([])
      return
    }
    const { data } = await apiFetch<KnowledgePointDto[]>(
      `/categories/${selectedCategoryId}/knowledge-points`,
    )
    setKnowledgePoints(data)
    setKnowledgePointId((prev) => (data.some((kp) => kp.id === prev) ? prev : ''))
  }, [])

  const load = useCallback(async () => {
    if (!bankId) return
    setLoading(true)
    setError('')
    try {
      const [questionsRes, categoriesRes] = await Promise.all([
        apiFetch<PagedQuestions>(`/question-banks/${bankId}/questions?page=1&pageSize=50`),
        apiFetch<CategoryDto[]>(`/question-banks/${bankId}/categories`),
      ])
      setQuestions(questionsRes.data.items)
      setCategories(categoriesRes.data)
      const nextCategory = categoriesRes.data[0]?.id || ''
      setCategoryId((prev) => prev || nextCategory)
      await loadKnowledgePoints(categoryIdRef.current || nextCategory)

      const versionMap: Record<string, QuestionVersionDto> = {}
      await Promise.all(
        questionsRes.data.items
          .filter((q) => q.latestVersionId)
          .map(async (q) => {
            const { data } = await apiFetch<QuestionVersionDto>(
              `/question-versions/${q.latestVersionId}`,
            )
            versionMap[q.id] = data
          }),
      )
      setVersions(versionMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [bankId, loadKnowledgePoints])

  useEffect(() => {
    load()
  }, [load])

  function handleTypeChange(next: string) {
    setType(next)
    setOptionRows(defaultOptions(next))
    setAnswerKeys(next === 'essay' ? [] : ['A'])
    setReferenceAnswer('')
  }

  function updateOption(index: number, field: keyof OptionRow, value: string) {
    setOptionRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addOption() {
    const nextKey = String.fromCharCode(65 + optionRows.length)
    setOptionRows((prev) => [...prev, { key: nextKey, text: `选项${nextKey}` }])
  }

  function removeOption(index: number) {
    setOptionRows((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleAnswer(key: string) {
    if (isMultiple) {
      setAnswerKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      )
    } else {
      setAnswerKeys([key])
    }
  }

  function versionPayload() {
    const score = Number(defaultScore)
    return {
      type,
      stem: stem.trim(),
      options: isEssay ? [] : optionRows,
      standardAnswer: isEssay ? [referenceAnswer.trim()] : answerKeys,
      difficulty,
      explanation: explanation.trim() || undefined,
      defaultScore: Number.isFinite(score) && score > 0 ? score : 1,
    }
  }

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault()
    if (!bankId || !newCategoryName.trim()) return
    setError('')
    try {
      const { data } = await apiFetch<CategoryDto>(`/question-banks/${bankId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      setCategories((prev) => [...prev, data])
      setCategoryId(data.id)
      setNewCategoryName('')
      await loadKnowledgePoints(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分类失败')
    }
  }

  async function handleCreateKnowledgePoint(e: FormEvent) {
    e.preventDefault()
    if (!categoryId || !newKpName.trim()) return
    setError('')
    try {
      const { data } = await apiFetch<KnowledgePointDto>(
        `/categories/${categoryId}/knowledge-points`,
        {
          method: 'POST',
          body: JSON.stringify({ name: newKpName.trim() }),
        },
      )
      setKnowledgePoints((prev) => [...prev, data])
      setKnowledgePointId(data.id)
      setNewKpName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建知识点失败')
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!bankId || !categoryId) return
    if (!stem.trim()) {
      setError('请填写题干')
      return
    }
    if (isEssay && !referenceAnswer.trim()) {
      setError('请填写参考答案')
      return
    }
    if (!isEssay && (optionRows.length < 2 || optionRows.some((row) => !row.text.trim()))) {
      setError('请至少填写两个选项')
      return
    }
    if (!isEssay && answerKeys.length === 0) {
      setError('请选择标准答案')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (reviseQuestionId) {
        await apiFetch(`/questions/${reviseQuestionId}/versions`, {
          method: 'POST',
          body: JSON.stringify(versionPayload()),
        })
        setReviseQuestionId('')
      } else {
        await apiFetch(`/question-banks/${bankId}/questions`, {
          method: 'POST',
          body: JSON.stringify({
            categoryId,
            knowledgePointId: knowledgePointId || undefined,
            version: versionPayload(),
          }),
        })
      }
      setStem('')
      setReferenceAnswer('')
      setExplanation('')
      setDefaultScore('1')
      setOptionRows(defaultOptions(type))
      setAnswerKeys(type === 'essay' ? [] : ['A'])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function startRevise(question: QuestionDto) {
    const current = versions[question.id]
    if (!current) return
    setReviseQuestionId(question.id)
    setCategoryId(question.categoryId)
    setKnowledgePointId(question.knowledgePointId || '')
    setType(current.type)
    setStem(current.stem)
    setDifficulty(current.difficulty)
    setExplanation(current.explanation ?? '')
    setDefaultScore(current.defaultScore != null ? String(current.defaultScore) : '1')
    setOptionRows(
      current.type === 'essay' ? [] : (current.options?.length ? current.options : defaultOptions(current.type)),
    )
    if (current.type === 'essay') {
      setAnswerKeys([])
      setReferenceAnswer(current.standardAnswer?.[0] ?? '')
    } else {
      setAnswerKeys(current.standardAnswer ?? ['A'])
      setReferenceAnswer('')
    }
    await loadKnowledgePoints(question.categoryId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleQuestionStatus(question: QuestionDto) {
    const next = question.status === 'active' ? 'disabled' : 'active'
    if (next === 'disabled' && !window.confirm('停用后不再进入新练习、模拟和未发布组卷，已发布考试不受影响。确认停用？')) {
      return
    }
    setBusyQuestionId(question.id)
    setError('')
    try {
      await apiFetch(`/questions/${question.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新状态失败')
    } finally {
      setBusyQuestionId('')
    }
  }

  async function showHistory(questionId: string) {
    setError('')
    try {
      const { data } = await apiFetch<QuestionVersionDto[]>(`/questions/${questionId}/versions`)
      setHistoryQuestionId(questionId)
      setHistoryVersions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载版本失败')
    }
  }

  async function openCopy(question: QuestionDto) {
    setError('')
    setCopyQuestion(question)
    try {
      const { data } = await apiFetch<BankDto[]>('/question-banks')
      const activeBanks = data.filter((bank) => bank.status === 'active')
      setBanks(activeBanks)
      const nextBankId = bankId && activeBanks.some((b) => b.id === bankId)
        ? bankId
        : activeBanks[0]?.id || ''
      setCopyBankId(nextBankId)
      if (nextBankId) {
        const cats = await apiFetch<CategoryDto[]>(`/question-banks/${nextBankId}/categories`)
        setCopyCategories(cats.data)
        setCopyCategoryId(
          nextBankId === bankId ? question.categoryId : cats.data[0]?.id || '',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载题库失败')
      setCopyQuestion(null)
    }
  }

  async function handleCopyBankChange(nextBankId: string) {
    setCopyBankId(nextBankId)
    if (!nextBankId) {
      setCopyCategories([])
      setCopyCategoryId('')
      return
    }
    const cats = await apiFetch<CategoryDto[]>(`/question-banks/${nextBankId}/categories`)
    setCopyCategories(cats.data)
    setCopyCategoryId(cats.data[0]?.id || '')
  }

  async function submitCopy() {
    if (!copyQuestion || !copyBankId || !copyCategoryId) {
      setError('请选择启用的目标题库和分类')
      return
    }
    setCopying(true)
    setError('')
    try {
      await apiFetch(`/questions/${copyQuestion.id}/copy`, {
        method: 'POST',
        body: JSON.stringify({
          targetBankId: copyBankId,
          categoryId: copyCategoryId,
        }),
      })
      setCopyQuestion(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制失败')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>题目管理</h1>
        <p className="page-desc">
          AD-06/07 分类、知识点、停用与不可变新版本 · <Link to="/question-banks">返回题库</Link>
        </p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>分类与知识点</h2>
        <form className="inline-form" onSubmit={handleCreateCategory}>
          <label>
            新分类名称
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="例如：安全生产"
              required
            />
          </label>
          <button type="submit" className="btn-secondary">
            创建分类
          </button>
        </form>
        {categories.length > 0 && (
          <form className="inline-form" onSubmit={handleCreateKnowledgePoint}>
            <label>
              所属分类
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  void loadKnowledgePoints(e.target.value)
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              新知识点
              <input
                value={newKpName}
                onChange={(e) => setNewKpName(e.target.value)}
                placeholder="例如：消防器材"
                required
              />
            </label>
            <button type="submit" className="btn-secondary">
              创建知识点
            </button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>{reviseQuestionId ? '发布新版本（原版本只读保留）' : '新建题目'}</h2>
        {categories.length === 0 ? (
          <p>暂无分类，请先在上方创建分类。</p>
        ) : (
          <form className="stack-form" onSubmit={handleCreate}>
            <div className="form-row">
              <label>
                分类
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value)
                    void loadKnowledgePoints(e.target.value)
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                知识点
                <select value={knowledgePointId} onChange={(e) => setKnowledgePointId(e.target.value)}>
                  <option value="">未指定</option>
                  {knowledgePoints.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      {kp.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                题型
                <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
                  <option value="singleChoice">单选</option>
                  <option value="multipleChoice">多选</option>
                  <option value="trueFalse">判断</option>
                  <option value="essay">解答题</option>
                </select>
              </label>
              <label>
                难度
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </label>
            </div>

            <label className="field-block">
              题干
              <textarea
                rows={5}
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                placeholder="请输入题目内容，支持多行"
                required
              />
            </label>

            {isEssay ? (
              <label className="field-block">
                参考答案
                <textarea
                  rows={4}
                  value={referenceAnswer}
                  onChange={(e) => setReferenceAnswer(e.target.value)}
                  placeholder="请输入参考答案，支持多行"
                  required
                />
                <span className="field-hint">
                  解答题暂无选项。当前按去空白后精确比对评分，人工阅卷尚未开放。
                </span>
              </label>
            ) : (
              <div className="field-block">
                <span className="field-legend">选项与标准答案</span>
                {optionRows.map((row, index) => (
                  <div className="option-editor-row" key={`${row.key}-${index}`}>
                    <input
                      className="option-key-input"
                      value={row.key}
                      onChange={(e) => updateOption(index, 'key', e.target.value.toUpperCase())}
                      maxLength={2}
                      aria-label="选项键"
                    />
                    <input
                      className="option-text-input"
                      value={row.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      placeholder={`选项${row.key}`}
                    />
                    <label className="option-answer">
                      <input
                        type={isMultiple ? 'checkbox' : 'radio'}
                        name="standard-answer"
                        checked={answerKeys.includes(row.key)}
                        onChange={() => toggleAnswer(row.key)}
                      />
                      答案
                    </label>
                    {optionRows.length > 2 && type !== 'trueFalse' && (
                      <button type="button" className="btn-text" onClick={() => removeOption(index)}>
                        删除
                      </button>
                    )}
                  </div>
                ))}
                {type !== 'trueFalse' && (
                  <button type="button" className="btn-secondary" onClick={addOption}>
                    添加选项
                  </button>
                )}
              </div>
            )}

            <label className="field-block">
              解析（选填）
              <textarea
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="交卷后按考试公开策略展示"
              />
            </label>
            <label>
              默认分值
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={defaultScore}
                onChange={(e) => setDefaultScore(e.target.value)}
                required
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '保存中…' : reviseQuestionId ? '发布新版本' : '创建'}
              </button>
              {reviseQuestionId && (
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => {
                    setReviseQuestionId('')
                    setStem('')
                    setReferenceAnswer('')
                    setExplanation('')
                    setDefaultScore('1')
                  }}
                >
                  取消修订
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <h2>题目列表</h2>
        {loading ? (
          <p>加载中…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>题型</th>
                <th>题干</th>
                <th>难度</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const v = versions[q.id]
                return (
                  <tr key={q.id}>
                    <td>{TYPE_LABELS[v?.type ?? ''] ?? v?.type ?? '—'}</td>
                    <td className="stem-cell">{v?.stem ?? '—'}</td>
                    <td>{DIFFICULTY_LABELS[v?.difficulty ?? ''] ?? v?.difficulty ?? '—'}</td>
                    <td>{q.status === 'active' ? '启用' : '停用'}</td>
                    <td>
                      <button type="button" className="btn-text" onClick={() => void startRevise(q)}>
                        修订新版本
                      </button>
                      <button type="button" className="btn-text" onClick={() => void openCopy(q)}>
                        复制为新题
                      </button>
                      <button type="button" className="btn-text" onClick={() => void showHistory(q.id)}>
                        版本历史
                      </button>
                      <button
                        type="button"
                        className="btn-text"
                        disabled={busyQuestionId === q.id}
                        onClick={() => void toggleQuestionStatus(q)}
                      >
                        {q.status === 'active' ? '停用' : '启用'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={5}>暂无题目</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {historyQuestionId && (
          <div className="rule-line" style={{ marginTop: 16 }}>
            <h3>版本历史 · {historyQuestionId}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>版本</th>
                  <th>题型</th>
                  <th>题干</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {historyVersions.map((item) => (
                  <tr key={item.id}>
                    <td>v{item.versionNo ?? '—'}</td>
                    <td>{TYPE_LABELS[item.type] ?? item.type}</td>
                    <td className="stem-cell">{item.stem}</td>
                    <td>{formatEnterpriseTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn-text" onClick={() => setHistoryQuestionId('')}>
              关闭
            </button>
          </div>
        )}
      </section>

      {copyQuestion && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>复制为新题</h2>
            <p className="page-desc">将生成独立逻辑题目。停用原题需另行确认，不会与复制合并。</p>
            <label className="field">
              目标题库（仅启用）
              <select
                value={copyBankId}
                onChange={(e) => void handleCopyBankChange(e.target.value)}
              >
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              目标分类
              <select
                value={copyCategoryId}
                onChange={(e) => setCopyCategoryId(e.target.value)}
              >
                {copyCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCopyQuestion(null)}
                disabled={copying}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void submitCopy()}
                disabled={copying || !copyBankId || !copyCategoryId}
              >
                {copying ? '复制中…' : '确认复制'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
