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
  const [options, setOptions] = useState('[{"key":"A","text":"选项A"},{"key":"B","text":"选项B"}]')
  const [standardAnswer, setStandardAnswer] = useState('["A"]')
  const [difficulty, setDifficulty] = useState('medium')
  const [submitting, setSubmitting] = useState(false)

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
      if (categoriesRes.data.length > 0 && !categoryId) {
        setCategoryId(categoriesRes.data[0].id)
      }

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
  }, [bankId, categoryId])

  useEffect(() => {
    load()
  }, [load])

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
    setSubmitting(true)
    setError('')
    try {
      await apiFetch(`/question-banks/${bankId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          version: {
            type,
            stem,
            options: JSON.parse(options),
            standardAnswer: JSON.parse(standardAnswer),
            difficulty,
          },
        }),
      })
      setStem('')
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
          <form className="inline-form" onSubmit={handleCreate}>
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
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="singleChoice">单选</option>
                <option value="multipleChoice">多选</option>
                <option value="trueFalse">判断</option>
              </select>
            </label>
            <label>
              题干
              <input type="text" value={stem} onChange={(e) => setStem(e.target.value)} required />
            </label>
            <label>
              选项 (JSON)
              <input type="text" value={options} onChange={(e) => setOptions(e.target.value)} required />
            </label>
            <label>
              标准答案 (JSON)
              <input
                type="text"
                value={standardAnswer}
                onChange={(e) => setStandardAnswer(e.target.value)}
                required
              />
            </label>
            <label>
              难度
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </label>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '创建中…' : '创建'}
            </button>
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
                    <td>{v?.type ?? '—'}</td>
                    <td>{v?.stem ?? '—'}</td>
                    <td>{v?.difficulty ?? '—'}</td>
                    <td>{q.status}</td>
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
