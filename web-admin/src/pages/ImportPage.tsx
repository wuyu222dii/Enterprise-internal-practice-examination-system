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
  sheetName?: string
  rowNum: number
  type: string
  stem: string
  difficulty: string
  categoryName?: string
  knowledgePointName?: string
}

interface ErrorRow {
  sheetName?: string
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
  pendingHierarchy?: {
    categories?: string[]
    knowledgePoints?: { category: string; name: string }[]
  }
}

const TYPE_LABELS: Record<string, string> = {
  singleChoice: '单选',
  multipleChoice: '多选',
  trueFalse: '判断',
  essay: '解答题',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
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
  const [hierarchyConfirmed, setHierarchyConfirmed] = useState(false)

  useEffect(() => {
    apiFetch<QuestionBankDto[]>('/question-banks')
      .then(({ data }) => setBanks(data))
      .catch(() => {})
  }, [])

  const loadPreview = useCallback(async (taskId: string) => {
    const { data } = await apiFetch<ImportPreview>(`/import/tasks/${taskId}/preview`)
    setPreview(data)
    const pendingCats = data.pendingHierarchy?.categories ?? []
    const pendingKps = data.pendingHierarchy?.knowledgePoints ?? []
    setHierarchyConfirmed(pendingCats.length === 0 && pendingKps.length === 0)
  }, [])

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (!taskId) return
    setLoading(true)
    apiFetch<ImportTaskDto>(`/import/tasks/${taskId}`)
      .then(async ({ data }) => {
        setTask(data)
        setBankId(data.questionBankId)
        await loadPreview(data.id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载任务失败'))
      .finally(() => setLoading(false))
  }, [searchParams, loadPreview])

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
    const pendingCats = preview.pendingHierarchy?.categories ?? []
    const pendingKps = preview.pendingHierarchy?.knowledgePoints ?? []
    if ((pendingCats.length > 0 || pendingKps.length > 0) && !hierarchyConfirmed) {
      setError('存在未知分类或知识点，请确认创建后再导入')
      return
    }
    setConfirming(true)
    setError('')
    try {
      const needsHierarchy = pendingCats.length > 0 || pendingKps.length > 0
      await apiFetch(`/import/tasks/${task.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          confirmToken: preview.confirmToken,
          confirmPendingHierarchy: needsHierarchy,
          ...(needsHierarchy ? { hierarchyConfirm: { confirmPendingHierarchy: true } } : {}),
        }),
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
        <p className="page-desc">
          支持历史题库九列模板（一级科目、题型、题目内容、正确答案）以及分类/题干分列的标准模板。题目内容里题干与选项请用 Alt+Enter 换行。
        </p>
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
                    <th>工作表</th>
                    <th>行号</th>
                    <th>分类</th>
                    <th>知识点</th>
                    <th>题型</th>
                    <th>题干</th>
                    <th>难度</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.validRows.slice(0, 20).map((row) => (
                    <tr key={`${row.sheetName ?? ''}-${row.rowNum}`}>
                      <td>{row.sheetName ?? '—'}</td>
                      <td>{row.rowNum}</td>
                      <td>{row.categoryName ?? '—'}</td>
                      <td>{row.knowledgePointName ?? '—'}</td>
                      <td>{TYPE_LABELS[row.type] ?? row.type}</td>
                      <td>{row.stem}</td>
                      <td>{DIFFICULTY_LABELS[row.difficulty] ?? row.difficulty}</td>
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
                    <th>工作表</th>
                    <th>行号</th>
                    <th>错误说明</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errorRows.map((row) => (
                    <tr key={`${row.sheetName ?? ''}-${row.rowNum}`}>
                      <td>{row.sheetName ?? '—'}</td>
                      <td>{row.rowNum}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {preview.importableCount > 0 && !confirmed && task?.status === 'preview_ready' && (
            <div style={{ marginTop: '1rem' }}>
              {(preview.pendingHierarchy?.categories?.length ?? 0) > 0
                || (preview.pendingHierarchy?.knowledgePoints?.length ?? 0) > 0 ? (
                <div className="hierarchy-confirm">
                  <p>Excel 中含未知分类或知识点，确认后将一并创建并归入对应题目：</p>
                  {(preview.pendingHierarchy?.categories?.length ?? 0) > 0 && (
                    <>
                      <p>待建分类</p>
                      <ul>
                        {preview.pendingHierarchy?.categories?.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {(preview.pendingHierarchy?.knowledgePoints?.length ?? 0) > 0 && (
                    <>
                      <p>待建知识点</p>
                      <ul>
                        {preview.pendingHierarchy?.knowledgePoints?.map((item) => (
                          <li key={`${item.category}-${item.name}`}>
                            {item.category} / {item.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hierarchyConfirmed}
                      onChange={(e) => setHierarchyConfirmed(e.target.checked)}
                    />
                    确认创建未知分类和知识点
                  </label>
                </div>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirm}
                disabled={
                  confirming
                  || (((preview.pendingHierarchy?.categories?.length ?? 0) > 0
                    || (preview.pendingHierarchy?.knowledgePoints?.length ?? 0) > 0)
                    && !hierarchyConfirmed)
                }
              >
                {confirming ? '导入中…' : `确认导入 ${preview.importableCount} 题`}
              </button>
            </div>
          )}

          {confirmed && <p className="form-success">导入完成</p>}
        </section>
      )}
    </div>
  )
}
