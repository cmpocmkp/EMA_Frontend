import type { Session } from './api'

const STORAGE_KEY = 'ema.session'

// Storage can be unavailable (private mode, blocked site data); the session then lasts until the tab closes.

export function loadSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Keep the in-memory session.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored to clear.
  }
}
