import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError, login } from '../api'
import { useSession } from '../session/session-context'

function describeError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Incorrect username or password.'
    if (error.status === 429) return 'Too many attempts. Wait a minute, then try again.'
    return error.message
  }
  // fetch rejects with a TypeError when the request never reaches the server.
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and try again."
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

export default function LoginPage() {
  const { session, signIn } = useSession()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    // Return to the page that sent the user here, if any.
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setSubmitting(true)
    try {
      signIn(await login(String(form.get('username')), String(form.get('password'))))
    } catch (caught) {
      setError(describeError(caught))
      setSubmitting(false)
    }
  }

  return (
    <main className="page">
      <form className="glass login" onSubmit={handleSubmit} aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          LW
        </div>
        <div className="login__heading">
          <h1 id="login-title">Sign in</h1>
          <p>Sign in to continue to LabWatch KP.</p>
        </div>

        <label className="field">
          <span>Username</span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
