import { createContext, use } from 'react'
import type { Session } from '../api'

export interface SessionContextValue {
  session: Session | null
  signIn: (session: Session) => void
  signOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = use(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}

const STORAGE_KEY = 'ema.session'

// Storage can be unavailable (private mode, blocked site data); the session then lasts until the tab closes.

export function readStoredSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Session) : null
  } catch {
    return null
  }
}

export function storeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Keep the in-memory session.
  }
}
