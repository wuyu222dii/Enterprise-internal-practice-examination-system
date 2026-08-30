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
  const [editingId, setEditingId] = useState('')
  const [editName, setEditName] = useState('')
  const [editParentId, setEditParentId] = useState('')
  const [updatingId, setUpdatingId] = useState('')

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

  async function patchDepartment(id: string, body: Record<string, string>) {
    setUpdatingId(id)
    setError('')
    try {
      await apiFetch(`/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setEditingId('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setUpdatingId('')
    }
  }

  const flat = flattenDepartments(departments)

  return (
    <div className="page">
      <header className="page-header">
        <h1>部门管理</h1>
        <p className="page-desc">AD-02 组织部门：创建、改名、移动、停用</p>
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {flat.map((d) => (
                <tr key={d.id}>
                  <td>
                    {editingId === d.id ? (
                      <div className="inline-form">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="部门名称"
                        />
                        <select
                          value={editParentId}
                          onChange={(e) => setEditParentId(e.target.value)}
                          aria-label="上级部门"
                        >
                          {flat
                            .filter((item) => item.id !== d.id)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.path}
                              </option>
                            ))}
                        </select>
                      </div>
                    ) : (
                      d.path
                    )}
                  </td>
                  <td>{d.status === 'active' ? '启用' : '停用'}</td>
                  <td>{d.employeeCount}</td>
                  <td>
                    {editingId === d.id ? (
                      <>
                        <button
                          type="button"
                          className="btn-text"
                          disabled={updatingId === d.id}
                          onClick={() =>
                            patchDepartment(d.id, {
                              name: editName,
                              parentId: editParentId,
                            })
                          }
                        >
                          保存
                        </button>
                        <button type="button" className="btn-text" onClick={() => setEditingId('')}>
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-text"
                          onClick={() => {
                            setEditingId(d.id)
                            setEditName(d.name)
                            setEditParentId(d.parentId || 'dept_root')
                          }}
                        >
                          改名/移动
                        </button>
                        {d.id !== 'dept_root' && (
                          <button
                            type="button"
                            className="btn-text"
                            disabled={updatingId === d.id}
                            onClick={() =>
                              patchDepartment(d.id, {
                                status: d.status === 'active' ? 'disabled' : 'active',
                              })
                            }
                          >
                            {d.status === 'active' ? '停用' : '启用'}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {flat.length === 0 && (
                <tr>
                  <td colSpan={4}>暂无部门</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
