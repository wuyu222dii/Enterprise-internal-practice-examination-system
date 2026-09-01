import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { formatEnterpriseTime } from '../formatTime'

interface ResultVisibility {
  summaryVisible: boolean
  passingScoreVisible: boolean
  passConclusionVisible: boolean
  perItemReviewAllowed: boolean
  showScore?: boolean
  showCorrectCount?: boolean
  showWrongCount?: boolean
  showExplanation?: boolean
  revealTiming?: string
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
  examId?: string
  remainingAttempts?: number
  resultState?: 'available' | 'closing' | 'locked' | 'cancelled'
  resultLocked?: boolean
  submitted?: boolean
  submittedAt?: string | null
  neutralMessage?: string | null
  cancelNotice?: string | null
  visibility: ResultVisibility
  totalScore?: number
  maxScore?: number
  passed?: boolean
  passingScore?: number
  correctCount?: number
  wrongCount?: number
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
  const resultState = result?.resultState ?? 'available'

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试结果</h1>
        <p className="page-desc">EX-05 成绩与结果查看</p>
      </header>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>加载中…</p>}

      {result && resultState === 'locked' && (
        <section className="card result-card" role="status">
          <h2>结果锁定，异常处理中，请等待企业通知</h2>
          {result.submitted && (
            <p className="stub-text">
              已记录提交事实{result.submittedAt ? ` · ${formatEnterpriseTime(result.submittedAt)}` : ''}，官方成绩暂不可见。
            </p>
          )}
        </section>
      )}

      {result && resultState === 'closing' && (
        <section className="card result-card" role="status">
          <h2>考试正在收尾</h2>
          <p className="stub-text">
            {result.neutralMessage || '正在确认平台运行状态，成绩与逐题内容暂不披露。'}
          </p>
          {result.submitted && (
            <p className="stub-text">您的作答已提交。</p>
          )}
        </section>
      )}

      {result && resultState === 'cancelled' && (
        <section className="card result-card" role="status">
          <h2>考试已取消</h2>
          <p className="stub-text">{result.cancelNotice || '本场考试已取消。'}</p>
        </section>
      )}

      {result && resultState === 'available' && !summaryVisible && (
        <section className="card result-card">
          <p className="stub-text">成绩尚未公开，请稍后再查看。</p>
          {result.submitted && (
            <p className="stub-text">您的作答已提交。</p>
          )}
        </section>
      )}

      {result && resultState === 'available' && summaryVisible && (
        <section className="card result-card">
          <dl className="detail-list">
            {visibility?.showScore !== false && result.totalScore != null && (
            <div className="detail-row">
              <dt>总分</dt>
              <dd>
                {result.maxScore != null
                  ? `${result.totalScore} / ${result.maxScore}`
                  : result.totalScore}
              </dd>
            </div>
            )}
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
            {visibility?.showCorrectCount && result.correctCount != null && (
              <div className="detail-row">
                <dt>正确题数</dt>
                <dd>{result.correctCount}</dd>
              </div>
            )}
            {visibility?.showWrongCount && result.wrongCount != null && (
              <div className="detail-row">
                <dt>错误题数</dt>
                <dd>{result.wrongCount}</dd>
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
                    {visibility?.showExplanation !== false && item.explanation && (
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
        {result
          && result.examId
          && (result.remainingAttempts ?? 0) > 0
          && resultState !== 'cancelled'
          && (
            <>
              {' · '}
              <Link to={`/exams/${result.examId}`}>再次考试</Link>
            </>
          )}
      </p>
    </div>
  )
}
