import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiFetch } from '../api/client'

interface DepartmentDto {
  id: string
  name: string
  parentId: string | null
  path: string
  status: string
  employeeCount: number
  children?: DepartmentDto[]
}

function flattenDepartments(nodes: DepartmentDto[]): DepartmentDto[] {
  const result: DepartmentDto[] = []
  function walk(list: DepartmentDto[]) {
    for (const node of list) {
      result.push(node)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(nodes)
  return result
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('dept_root')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await apiFetch<DepartmentDto[]>('/departments?format=tree')
      setDepartments(data)
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
      await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({ name, parentId }),
      })
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const flat = flattenDepartments(departments)

  return (
    <div className="page">
      <header className="page-header">
        <h1>部门管理</h1>
        <p className="page-desc">AD-02 组织部门列表与创建</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>新建部门</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <label>
            部门名称
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="部门名称"
              required
            />
          </label>
          <label>
            上级部门
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              {flat.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.path}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '创建中…' : '创建'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>部门列表</h2>
        {loading ? (
          <p>加载中…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>路径</th>
                <th>状态</th>
                <th>员工数</th>
              </tr>
            </thead>
            <tbody>
              {flat.map((d) => (
                <tr key={d.id}>
                  <td>{d.path}</td>
                  <td>{d.status}</td>
                  <td>{d.employeeCount}</td>
                </tr>
              ))}
              {flat.length === 0 && (
                <tr>
                  <td colSpan={3}>暂无部门</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
