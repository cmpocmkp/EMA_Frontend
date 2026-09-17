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

export function listUsers(token: string) {
  return request<User[]>('/api/users', {}, token)
}

export interface NewUser {
  username: string
  name: string
  password: string
}

export function createUser(token: string, user: NewUser) {
  return request<User>('/api/users', { method: 'POST', body: JSON.stringify(user) }, token)
}

/** `value` out of `total`. */
export interface Ratio {
  value: number
  total: number
}

/** Counts per place (district or tehsil), level and gender, as rows of values in `fields` order. */
export interface SummaryCells {
  fields: string[]
  rows: unknown[][]
}

export interface SummaryResponse extends SummaryCells {
  /** When the school data was last refreshed from EMA. */
  syncedAt: string | null
  divisions: { division: string; districts: string[] }[]
}

// Both are tagged with the latest syncs like the map points, so revisits get an empty 304 until the data changes.
export function getSummary(token: string) {
  return request<SummaryResponse>('/api/summary', {}, token)
}

export function getTehsils(token: string, district: string) {
  return request<SummaryCells>(`/api/summary/tehsils?district=${encodeURIComponent(district)}`, {}, token)
}

/** [emisCode, longitude, latitude, hasItLab]; lab is 1, 0, or null when the school did not report it. */
export type SchoolPoint = [string, number, number, 1 | 0 | null]

// The API tags this response with the last schools sync, so the browser revalidates and gets an empty 304 until data changes.
export function getSchoolPoints(token: string) {
  return request<{ schools: SchoolPoint[] }>('/api/map/schools', {}, token)
}
