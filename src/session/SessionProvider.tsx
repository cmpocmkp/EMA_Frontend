import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, getCurrentUser, type Session } from '../api'
import { readStoredSession, SessionContext, storeSession } from './session-context'

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)
  const accessToken = session?.accessToken

  const signIn = useCallback((next: Session) => {
    storeSession(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    storeSession(null)
    setSession(null)
  }, [])

  // A stored token may have expired or its user been removed; sign out when the API rejects it.
  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    getCurrentUser(accessToken, controller.signal)
      .then((user) => signIn({ accessToken, user }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) signOut()
      })
    return () => controller.abort()
  }, [accessToken, signIn, signOut])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <SessionContext value={value}>{children}</SessionContext>
}
