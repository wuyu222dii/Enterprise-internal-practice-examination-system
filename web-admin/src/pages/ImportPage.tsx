import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE, apiFetch, getToken } from '../api/client'

interface QuestionBankDto {
  id: string
  name: string
}

interface ImportTaskDto {
  id: string
  questionBankId: string
  status: string
  importableCount: number
  errorCount: number
}

interface ValidRow {
  rowNum: number
  type: string
  stem: string
  difficulty: string
}

interface ErrorRow {
  rowNum: number
  message: string
}

interface ImportPreview {
  taskId: string
  status: string
  confirmToken: string
  importableCount: number
  errorCount: number
  validRows: ValidRow[]
  errorRows: ErrorRow[]
}

export default function ImportPage() {
  const [searchParams] = useSearchParams()
  const [banks, setBanks] = useState<QuestionBankDto[]>([])
  const [bankId, setBankId] = useState(searchParams.get('bankId') ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [task, setTask] = useState<ImportTaskDto | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    apiFetch<QuestionBankDto[]>('/question-banks')
      .then(({ data }) => setBanks(data))
      .catch(() => {})
  }, [])

  const loadPreview = useCallback(async (taskId: string) => {
    const { data } = await apiFetch<ImportPreview>(`/import/tasks/${taskId}/preview`)
    setPreview(data)
  }, [])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!bankId || !file) return
    setLoading(true)
    setError('')
    setConfirmed(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('questionBankId', bankId)
      const token = getToken()
      const response = await fetch(`${API_BASE}/import/tasks`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `上传失败 (${response.status})`)
      }
      const json = await response.json()
      const created = json.data as ImportTaskDto
      setTask(created)
      await loadPreview(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!task || !preview?.confirmToken) return
    setConfirming(true)
    setError('')
    try {
      await apiFetch(`/import/tasks/${task.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ confirmToken: preview.confirmToken }),
      })
      setConfirmed(true)
      setTask({ ...task, status: 'completed' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认失败')
    } finally {
      setConfirming(false)
    }
  }

  async function handleDownloadErrors() {
    if (!task) return
    const token = getToken()
    const response = await fetch(`${API_BASE}/import/tasks/${task.id}/errors`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-errors.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadTemplate() {
    if (!bankId) return
    const token = getToken()
    const response = await fetch(`${API_BASE}/import/template?questionBankId=${bankId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>题目导入</h1>
        <p className="page-desc">AD-08/09 Excel 上传、预览与确认导入</p>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>上传 Excel</h2>
        <form className="inline-form" onSubmit={handleUpload}>
          <label>
            目标题库
            <select value={bankId} onChange={(e) => setBankId(e.target.value)} required>
              <option value="">请选择</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Excel 文件
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <button type="button" className="btn-text" onClick={handleDownloadTemplate} disabled={!bankId}>
            下载模板
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !bankId || !file}>
            {loading ? '上传中…' : '上传并校验'}
          </button>
        </form>
      </section>

      {preview && (
        <section className="card">
          <h2>校验预览</h2>
          <p>
            可导入 {preview.importableCount} 行，错误 {preview.errorCount} 行
            {task && ` · 任务 ${task.id} · 状态 ${task.status}`}
          </p>

          {preview.errorCount > 0 && (
            <p>
              <button type="button" className="btn-text" onClick={handleDownloadErrors}>
                下载错误报告
              </button>
            </p>
          )}

          {preview.validRows?.length > 0 && (
            <>
              <h3>可导入行（前 20 条）</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>行号</th>
                    <th>题型</th>
                    <th>题干</th>
                    <th>难度</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.validRows.slice(0, 20).map((row) => (
                    <tr key={row.rowNum}>
                      <td>{row.rowNum}</td>
                      <td>{row.type}</td>
                      <td>{row.stem}</td>
                      <td>{row.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {preview.errorRows?.length > 0 && (
            <>
              <h3>错误行</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>行号</th>
                    <th>错误说明</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errorRows.map((row) => (
                    <tr key={row.rowNum}>
                      <td>{row.rowNum}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {preview.importableCount > 0 && !confirmed && task?.status === 'preview_ready' && (
            <p style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? '导入中…' : `确认导入 ${preview.importableCount} 题`}
              </button>
            </p>
          )}

          {confirmed && <p className="form-success">导入完成</p>}
        </section>
      )}
    </div>
  )
}
