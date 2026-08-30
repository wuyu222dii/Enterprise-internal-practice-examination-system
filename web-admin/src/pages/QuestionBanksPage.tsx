import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface QuestionBankDto {
  id: string
  name: string
  status: string
  practiceEnabled: boolean
  mockEnabled: boolean
  createdAt: string
}

export default function QuestionBanksPage() {
  const [banks, setBanks] = useState<QuestionBankDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<QuestionBankDto[]>('/question-banks')
      setBanks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await apiFetch('/question-banks', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      setName('')
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
        <h1>题库管理</h1>
        <p className="page-desc">AD-05 题库列表与创建</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>新建题库</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <label>
            题库名称
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="题库名称"
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '创建中…' : '创建'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>题库列表</h2>
        {loading ? (
          <p>加载中…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>状态</th>
                <th>练习</th>
                <th>模拟</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.status}</td>
                  <td>{b.practiceEnabled ? '是' : '否'}</td>
                  <td>{b.mockEnabled ? '是' : '否'}</td>
                  <td>
                    <Link to={`/question-banks/${b.id}/questions`}>题目</Link>
                    {' · '}
                    <Link to={`/import?bankId=${b.id}`}>导入</Link>
                  </td>
                </tr>
              ))}
              {banks.length === 0 && (
                <tr>
                  <td colSpan={5}>暂无题库</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
