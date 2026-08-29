import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

type AttemptResult = Record<string, unknown>

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!attemptId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<AttemptResult>(
        `/attempts/${attemptId}/result`,
      )
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [attemptId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试结果</h1>
        <p className="page-desc">EX-05 成绩与结果查看</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>加载中…</p>}

      {result && (
        <section className="card result-card">
          <dl className="detail-list">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="detail-row">
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p>
        <Link to="/tasks">返回任务列表</Link>
      </p>
    </div>
  )
}
