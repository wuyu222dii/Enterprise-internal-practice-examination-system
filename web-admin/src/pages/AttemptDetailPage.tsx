import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface AttemptDetail {
  attemptId: string
  employeeId: string
  attemptNumber: number
  attemptStatus: string
  voided: boolean
  startedAt: string | null
  totalScore?: number
  maxScore?: number
}

export default function AttemptDetailPage() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>()
  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!examId || !attemptId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<AttemptDetail>(
        `/admin/exams/${examId}/attempts/${attemptId}`,
      )
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载尝试详情失败')
    } finally {
      setLoading(false)
    }
  }, [examId, attemptId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-header">
        <h1>尝试详情</h1>
        <p className="page-desc">考试 {examId} · 尝试 {attemptId}</p>
      </header>

      <p>
        <Link to="/scores">← 返回成绩报表</Link>
      </p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>加载中…</p>}

      {detail && (
        <section className="card">
          <dl className="detail-list">
            <dt>尝试 ID</dt>
            <dd>{detail.attemptId}</dd>
            <dt>员工 ID</dt>
            <dd>{detail.employeeId}</dd>
            <dt>第几次尝试</dt>
            <dd>{detail.attemptNumber}</dd>
            <dt>状态</dt>
            <dd>{detail.attemptStatus}{detail.voided ? '（已作废）' : ''}</dd>
            <dt>开始时间</dt>
            <dd>{detail.startedAt ? new Date(detail.startedAt).toLocaleString() : '—'}</dd>
            <dt>得分</dt>
            <dd>
              {detail.totalScore != null ? `${detail.totalScore} / ${detail.maxScore ?? '—'}` : '—'}
            </dd>
          </dl>
        </section>
      )}
    </div>
  )
}
