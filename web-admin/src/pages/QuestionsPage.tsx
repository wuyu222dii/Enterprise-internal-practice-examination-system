import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface QuestionDto {
  id: string
  questionBankId: string
  categoryId: string
  status: string
  latestVersionId?: string
}

interface QuestionVersionDto {
  id: string
  type: string
  stem: string
  difficulty: string
}

interface CategoryDto {
  id: string
  name: string
}

interface PagedQuestions {
  items: QuestionDto[]
  total: number
  page: number
  pageSize: number
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
  const [versions, setVersions] = useState<Record<string, QuestionVersionDto>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState('singleChoice')
  const [stem, setStem] = useState('')
  const [optionRows, setOptionRows] = useState<OptionRow[]>(defaultOptions('singleChoice'))
  const [answerKeys, setAnswerKeys] = useState<string[]>(['A'])
  const [referenceAnswer, setReferenceAnswer] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [submitting, setSubmitting] = useState(false)

  const isEssay = type === 'essay'
  const isMultiple = type === 'multipleChoice'

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
      setCategoryId((prev) => prev || categoriesRes.data[0]?.id || '')

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
  }, [bankId])

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

  async function handleCreateCategory() {
    if (!bankId) return
    setError('')
    try {
      const { data } = await apiFetch<CategoryDto>(`/question-banks/${bankId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: '默认分类' }),
      })
      setCategories((prev) => [...prev, data])
      setCategoryId(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分类失败')
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
      await apiFetch(`/question-banks/${bankId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          version: {
            type,
            stem: stem.trim(),
            options: isEssay ? [] : optionRows,
            standardAnswer: isEssay ? [referenceAnswer.trim()] : answerKeys,
            difficulty,
          },
        }),
      })
      setStem('')
      setReferenceAnswer('')
      setOptionRows(defaultOptions(type))
      setAnswerKeys(type === 'essay' ? [] : ['A'])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>题目管理</h1>
        <p className="page-desc">
          AD-06/07 题库题目列表 · <Link to="/question-banks">返回题库</Link>
        </p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>新建题目</h2>
        {categories.length === 0 ? (
          <p>
            暂无分类，请先{' '}
            <button type="button" className="btn-text" onClick={handleCreateCategory}>
              创建默认分类
            </button>
          </p>
        ) : (
          <form className="stack-form" onSubmit={handleCreate}>
            <div className="form-row">
              <label>
                分类
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '创建中…' : '创建'}
              </button>
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
                <th>ID</th>
                <th>题型</th>
                <th>题干</th>
                <th>难度</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const v = versions[q.id]
                return (
                  <tr key={q.id}>
                    <td>{q.id}</td>
                    <td>{TYPE_LABELS[v?.type ?? ''] ?? v?.type ?? '—'}</td>
                    <td className="stem-cell">{v?.stem ?? '—'}</td>
                    <td>{DIFFICULTY_LABELS[v?.difficulty ?? ''] ?? v?.difficulty ?? '—'}</td>
                    <td>{q.status === 'active' ? '启用' : q.status}</td>
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
      </section>
    </div>
  )
}
