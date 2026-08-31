import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, apiFetch } from '../api/client'
import { FiveDomainStatus } from '../FiveDomainStatus'
import { formatEnterpriseTime } from '../formatTime'

type ExamTask = Record<string, unknown>

export default function TaskListPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<ExamTask[]>([])
  const [examCodeFilter, setExamCodeFilter] = useState('')
  const [locateCode, setLocateCode] = useState('')
  const [locating, setLocating] = useState(false)
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
      const code = String(task.examCode ?? '').toLowerCase()
      const title = String(task.title ?? '').toLowerCase()
      return code.includes(query) || title.includes(query)
    })
  }, [tasks, examCodeFilter])

  async function handleLocate(e: FormEvent) {
    e.preventDefault()
    const code = locateCode.trim()
    if (!code) {
      setError('请输入考试码')
      return
    }
    setLocating(true)
    setError('')
    try {
      const { data } = await apiFetch<ExamTask>(`/exams/locate?examCode=${encodeURIComponent(code)}`)
      const id = String(data.id ?? '')
      if (!id) {
        throw new Error('未找到可参加的考试')
      }
      navigate(`/exams/${id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '未找到可参加的考试')
      } else {
        setError(err instanceof Error ? err.message : '未找到可参加的考试')
      }
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>考试任务</h1>
        <p className="page-desc">EX-02 输入考试码定位进入考试说明页</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card filter-bar">
        <form className="inline-form" onSubmit={(e) => void handleLocate(e)}>
          <label className="filter-label">
            考试码定位
            <input
              type="text"
              value={locateCode}
              onChange={(e) => setLocateCode(e.target.value.toUpperCase())}
              placeholder="例如 EX-DEMO1"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={locating}>
            {locating ? '定位中…' : '进入考试'}
          </button>
        </form>
        <label className="filter-label">
          筛选已分配任务
          <input
            type="search"
            value={examCodeFilter}
            onChange={(e) => setExamCodeFilter(e.target.value)}
            placeholder="考试码或名称"
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
            const title = String(task.title ?? '')
            const examCode = task.examCode ? String(task.examCode) : '—'
            const lifecycle = String(task.lifecycle ?? task.status ?? '')
            const paused = task.runStatus === 'paused'
            const locked = Boolean(task.resultLocked)
            return (
              <li key={id} className="card task-card">
                <div className="task-info">
                  <h2>{title || examCode}</h2>
                  <p className="task-meta">考试码：{examCode}</p>
                  <FiveDomainStatus
                    lifecycle={lifecycle}
                    runStatus={paused ? 'paused' : String(task.runStatus ?? 'normal')}
                    remainingAttempts={task.remainingAttempts != null ? Number(task.remainingAttempts) : null}
                    usedAttempts={task.usedAttempts != null ? Number(task.usedAttempts) : null}
                    resultState={task.resultState != null ? String(task.resultState) : null}
                    resultLocked={locked}
                    participationLabel={task.participationLabel != null ? String(task.participationLabel) : null}
                  />
                  {task.stopAttemptAt != null && (
                    <p className="task-meta">停止开卷：{formatEnterpriseTime(String(task.stopAttemptAt))}</p>
                  )}
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
