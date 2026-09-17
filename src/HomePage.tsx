import type { User } from './api'

interface HomePageProps {
  user: User
  onSignOut: () => void
}

/** Shown after signing in until the dashboard is designed. */
export default function HomePage({ user, onSignOut }: HomePageProps) {
  return (
    <main className="page">
      <section className="glass signed-in" aria-labelledby="signed-in-title">
        <div className="brand-mark" aria-hidden="true">
          EMA
        </div>
        <div className="login__heading">
          <h1 id="signed-in-title">Welcome, {user.name}</h1>
          <p>You're signed in.</p>
        </div>
        <button className="button button--quiet" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  )
}
