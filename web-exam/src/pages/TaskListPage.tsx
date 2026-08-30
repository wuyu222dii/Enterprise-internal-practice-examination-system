import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { lifecycleLabel } from '../examLabels'

type ExamTask = Record<string, unknown>

export default function TaskListPage() {
  const [tasks, setTasks] = useState<ExamTask[]>([])
  const [examCodeFilter, setExamCodeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<ExamTask[]>('/exams/tasks')
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredTasks = useMemo(() => {
    const query = examCodeFilter.trim().toLowerCase()
    if (!query) return tasks
    return tasks.filter((task) => {
      const code = String(task.examCode ?? task.id ?? '').toLowerCase()
      const title = String(task.title ?? '').toLowerCase()
      return code.includes(query) || title.includes(query)
    })
  }, [tasks, examCodeFilter])

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试任务</h1>
        <p className="page-desc">EX-02 我的考试任务列表</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card filter-bar">
        <label className="filter-label">
          考试码筛选
          <input
            type="search"
            value={examCodeFilter}
            onChange={(e) => setExamCodeFilter(e.target.value)}
            placeholder="输入考试码或名称"
          />
        </label>
      </section>

      {loading ? (
        <p>加载中…</p>
      ) : filteredTasks.length === 0 ? (
        <section className="card">
          <p>{tasks.length === 0 ? '暂无考试任务' : '没有匹配的考试任务'}</p>
        </section>
      ) : (
        <ul className="task-list">
          {filteredTasks.map((task) => {
            const id = String(task.id ?? task.examId ?? '')
            const title = String(task.title ?? task.examCode ?? id)
            const examCode = String(task.examCode ?? id)
            const lifecycle = String(task.lifecycle ?? task.status ?? '')
            const paused = task.runStatus === 'paused'
            const locked = Boolean(task.resultLocked)
            return (
              <li key={id} className="card task-card">
                <div className="task-info">
                  <h2>{title}</h2>
                  <p className="task-meta">考试码：{examCode}</p>
                  <p className="task-meta">
                    状态：{lifecycleLabel(lifecycle)}
                    {paused ? ' · 已暂停' : ''}
                    {locked ? ' · 结果锁定' : ''}
                  </p>
                </div>
                <Link to={`/exams/${id}`} className="btn-primary btn-sm">
                  查看详情
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
