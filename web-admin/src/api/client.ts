export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8088/api/v1'
const TOKEN_KEY = 'exam_admin_token'
const SESSION_KEY = 'exam_admin_session'

export interface ResponseMeta {
  serverNow: string
  requestId: string
  timezone?: string
}

export interface ApiResponse<T> {
  data: T
  meta: ResponseMeta
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, session: unknown) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
}

export function getStoredSession<T>(): T | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { auth = true, ...fetchOptions } = options
  const token = getToken()
  const headers = new Headers(fetchOptions.headers)
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })

  if (response.status === 401) {
    clearAuth()
  }

  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const body = await response.json()
      message = body?.error?.message ?? body?.message ?? message
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return { data: undefined as T, meta: { serverNow: '', requestId: '' } }
  }

  return response.json() as Promise<ApiResponse<T>>
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(`${API_BASE}${path}`, { headers })
  if (response.status === 401) {
    clearAuth()
  }
  if (!response.ok) {
    throw new ApiError(`下载失败 (${response.status})`, response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
