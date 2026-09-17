import { useEffect, useState } from 'react'
import { ApiError, getCurrentUser, type Session } from './api'
import HomePage from './HomePage'
import LoginPage from './LoginPage'
import { clearSession, loadSession, saveSession } from './session'

function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const accessToken = session?.accessToken

  // A stored token may have expired or its user been removed; sign out when the API rejects it.
  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    getCurrentUser(accessToken, controller.signal)
      .then((user) => {
        const refreshed = { accessToken, user }
        saveSession(refreshed)
        setSession(refreshed)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          setSession(null)
        }
      })
    return () => controller.abort()
  }, [accessToken])

  function handleSignedIn(newSession: Session) {
    saveSession(newSession)
    setSession(newSession)
  }

  function handleSignOut() {
    clearSession()
    setSession(null)
  }

  return session ? (
    <HomePage user={session.user} onSignOut={handleSignOut} />
  ) : (
    <LoginPage onSignedIn={handleSignedIn} />
  )
}

export default App
