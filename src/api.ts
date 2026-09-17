export interface User {
  id: string
  username: string
  name: string
  createdAt: string
}

export interface Session {
  accessToken: string
  user: User
}

/** A response from the API with an error status. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL
  if (!baseUrl) {
    throw new Error('VITE_API_URL is not set, so the app does not know where the API is.')
  }

  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(new URL(path, baseUrl), { ...init, headers })
  if (!response.ok) {
    // Nest sends { message: string | string[] }; validation errors come as a list.
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null
    const message = Array.isArray(body?.message) ? body.message.join('\n') : body?.message
    throw new ApiError(response.status, message ?? response.statusText)
  }
  return (await response.json()) as T
}

export function login(username: string, password: string) {
  return request<Session>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function getCurrentUser(token: string, signal?: AbortSignal) {
  return request<User>('/api/auth/me', { signal }, token)
}

/** [emisCode, longitude, latitude, hasItLab]; lab is 1, 0, or null when the school did not report it. */
export type SchoolPoint = [string, number, number, 1 | 0 | null]

// The API tags this response with the last schools sync, so the browser revalidates and gets an empty 304 until data changes.
export function getSchoolPoints(token: string) {
  return request<{ schools: SchoolPoint[] }>('/api/map/schools', {}, token)
}
