import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface ResultVisibility {
  summaryVisible: boolean
  passingScoreVisible: boolean
  passConclusionVisible: boolean
  perItemReviewAllowed: boolean
}

interface ResultItem {
  itemId: string
  isCorrect: boolean
  userAnswer: string[]
  standardAnswer: string[]
  explanation: string
}

interface AttemptResult {
  attemptId: string
  visibility: ResultVisibility
  totalScore?: number
  maxScore?: number
  passed?: boolean
  passingScore?: number
  items?: ResultItem[]
}

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

  const visibility = result?.visibility
  const summaryVisible = visibility?.summaryVisible ?? false

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试结果</h1>
        <p className="page-desc">EX-05 成绩与结果查看</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>加载中…</p>}

      {result && !summaryVisible && (
        <section className="card result-card">
          <p className="stub-text">成绩尚未公开，请稍后再查看。</p>
        </section>
      )}

      {result && summaryVisible && (
        <section className="card result-card">
          <dl className="detail-list">
            <div className="detail-row">
              <dt>总分</dt>
              <dd>
                {result.totalScore != null && result.maxScore != null
                  ? `${result.totalScore} / ${result.maxScore}`
                  : '—'}
              </dd>
            </div>
            {visibility?.passingScoreVisible && result.passingScore != null && (
              <div className="detail-row">
                <dt>及格分</dt>
                <dd>{result.passingScore}</dd>
              </div>
            )}
            {visibility?.passConclusionVisible && result.passed != null && (
              <div className="detail-row">
                <dt>结论</dt>
                <dd className={result.passed ? 'result-pass' : 'result-fail'}>
                  {result.passed ? '通过' : '未通过'}
                </dd>
              </div>
            )}
          </dl>

          {visibility?.perItemReviewAllowed && result.items && result.items.length > 0 && (
            <div className="review-section">
              <h2>逐题回顾</h2>
              <ul className="review-list">
                {result.items.map((item, index) => (
                  <li key={item.itemId} className="review-item">
                    <div className="review-item-header">
                      <span>第 {index + 1} 题</span>
                      <span className={item.isCorrect ? 'result-pass' : 'result-fail'}>
                        {item.isCorrect ? '正确' : '错误'}
                      </span>
                    </div>
                    <p className="review-answer">
                      你的答案：{item.userAnswer.length > 0 ? item.userAnswer.join(', ') : '未作答'}
                    </p>
                    <p className="review-answer">
                      标准答案：{item.standardAnswer.join(', ')}
                    </p>
                    {item.explanation && (
                      <p className="review-explanation">解析：{item.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <p>
        <Link to="/tasks">返回任务列表</Link>
      </p>
    </div>
  )
}
