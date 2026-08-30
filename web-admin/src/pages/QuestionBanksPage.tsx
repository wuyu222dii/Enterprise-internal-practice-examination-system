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
  const [practiceEnabled, setPracticeEnabled] = useState(true)
  const [mockEnabled, setMockEnabled] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState('')

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
        body: JSON.stringify({ name, practiceEnabled, mockEnabled }),
      })
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function patchBank(id: string, body: Record<string, unknown>) {
    setUpdatingId(id)
    setError('')
    try {
      await apiFetch(`/question-banks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>题库管理</h1>
        <p className="page-desc">AD-05 题库列表、创建与练习/模拟开关</p>
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
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={practiceEnabled}
              onChange={(e) => setPracticeEnabled(e.target.checked)}
            />
            开放练习
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={mockEnabled}
              onChange={(e) => setMockEnabled(e.target.checked)}
            />
            开放模拟
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
                  <td>{b.status === 'active' ? '启用' : '停用'}</td>
                  <td>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={b.practiceEnabled}
                        disabled={updatingId === b.id}
                        onChange={(e) => patchBank(b.id, { practiceEnabled: e.target.checked })}
                      />
                      {b.practiceEnabled ? '开' : '关'}
                    </label>
                  </td>
                  <td>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={b.mockEnabled}
                        disabled={updatingId === b.id}
                        onChange={(e) => patchBank(b.id, { mockEnabled: e.target.checked })}
                      />
                      {b.mockEnabled ? '开' : '关'}
                    </label>
                  </td>
                  <td>
                    <Link to={`/question-banks/${b.id}/questions`}>题目</Link>
                    {' · '}
                    <Link to={`/import?bankId=${b.id}`}>导入</Link>
                    {' · '}
                    <button
                      type="button"
                      className="btn-text"
                      disabled={updatingId === b.id}
                      onClick={() =>
                        patchBank(b.id, {
                          status: b.status === 'active' ? 'disabled' : 'active',
                        })
                      }
                    >
                      {b.status === 'active' ? '停用题库' : '启用题库'}
                    </button>
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
