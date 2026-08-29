const API_BASE = 'http://localhost:8088/api/v1'
const TOKEN_KEY = 'exam_token'
const SESSION_KEY = 'exam_session'

export interface ResponseMeta {
  serverNow: string
  requestId: string
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
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

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

export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
