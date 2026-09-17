import { UserPlus, X } from 'lucide-react'
import { type FormEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { ApiError, createUser, listUsers, type User } from '../api'
import { initials } from '../layout/initials'
import { useSession } from '../session/session-context'
import './UsersPage.css'

type UsersState = { status: 'loading' } | { status: 'ready'; users: User[] } | { status: 'error' }

const byName = (a: User, b: User) => a.name.localeCompare(b.name)

export default function UsersPage() {
  const { session, signOut } = useSession()
  const accessToken = session?.accessToken
  const [state, setState] = useState<UsersState>({ status: 'loading' })
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    listUsers(accessToken)
      .then((users) => {
        if (active) setState({ status: 'ready', users })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) signOut()
        else setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [accessToken, signOut])

  function handleCreated(user: User) {
    setState((current) =>
      current.status === 'ready' ? { status: 'ready', users: [...current.users, user].sort(byName) } : current,
    )
    dialogRef.current?.close()
  }

  return (
    <div className="page-body">
      <header className="page-header page-header--actions">
        <h1>Users</h1>
        <button className="button button--compact" type="button" onClick={() => dialogRef.current?.showModal()}>
          <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
          Add user
        </button>
      </header>

      <section className="glass users" aria-label="Users">
        {state.status === 'loading' && <p className="users__message">Loading users…</p>}
        {state.status === 'error' && <p className="users__message">Couldn't load users.</p>}
        {state.status === 'ready' && (
          <ul className="users__list">
            {state.users.map((user) => (
              <li key={user.id} className="users__item">
                <span className="avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>
                <span className="users__identity">
                  <strong>
                    {user.name}
                    {user.id === session?.user.id && <span className="users__you">You</span>}
                  </strong>
                  <span>@{user.username}</span>
                </span>
                <span className="users__added">
                  Added{' '}
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddUserDialog ref={dialogRef} token={accessToken} onCreated={handleCreated} onUnauthorized={signOut} />
    </div>
  )
}

interface AddUserDialogProps {
  ref: RefObject<HTMLDialogElement | null>
  token: string | undefined
  onCreated: (user: User) => void
  onUnauthorized: () => void
}

function AddUserDialog({ ref, token, onCreated, onUnauthorized }: AddUserDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setError(null)
    setSaving(true)
    try {
      const user = await createUser(token, {
        name: String(form.get('name')),
        username: String(form.get('username')),
        password: String(form.get('password')),
      })
      formElement.reset()
      onCreated(user)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(caught instanceof ApiError ? caught.message : "Can't reach the server. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={ref} className="glass dialog" aria-labelledby="add-user-title" onClose={() => setError(null)}>
      <form className="dialog__form" onSubmit={handleSubmit}>
        <header className="dialog__header">
          <h2 id="add-user-title">Add user</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={() => ref.current?.close()}>
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <label className="field">
          <span>Name</span>
          <input name="name" required maxLength={80} autoComplete="off" />
        </label>

        <label className="field">
          <span>Username</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9._\-]+"
            title="Letters, numbers, dots, dashes or underscores"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
          <small>At least 8 characters.</small>
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Adding…' : 'Add user'}
        </button>
      </form>
    </dialog>
  )
}
