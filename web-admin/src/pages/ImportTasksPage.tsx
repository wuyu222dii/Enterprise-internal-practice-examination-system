import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface ImportTask {
  id: string
  questionBankId: string
  status: string
  importableCount: number
  errorCount: number
  createdAt: string
}

interface PagedTasks {
  items: ImportTask[]
  total: number
  page: number
  pageSize: number
}

export default function ImportTasksPage() {
  const [tasks, setTasks] = useState<ImportTask[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<PagedTasks>('/import/tasks?page=1&pageSize=50')
      setTasks(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载导入任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-header">
        <h1>导入任务</h1>
        <p className="page-desc">题目导入任务列表（共 {total} 条）</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>任务列表</h2>
          <Link to="/import" className="btn-primary" style={{ textDecoration: 'none' }}>
            新建导入
          </Link>
        </div>

        {loading ? (
          <p>加载中…</p>
        ) : tasks.length === 0 ? (
          <p className="stub-note">暂无导入任务</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>任务 ID</th>
                <th>题库 ID</th>
                <th>状态</th>
                <th>可导入</th>
                <th>错误数</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>{task.questionBankId}</td>
                  <td>{task.status}</td>
                  <td>{task.importableCount}</td>
                  <td>{task.errorCount}</td>
                  <td>{task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    {task.status === 'preview_ready' && (
                      <Link to={`/import?taskId=${task.id}`}>继续导入</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )

}
