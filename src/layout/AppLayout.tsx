import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '../session/session-context'
import './AppLayout.css'
import Sidebar from './Sidebar'

/** Frame for every signed-in page: the floating sidebar plus the current page. */
export default function AppLayout() {
  const { session } = useSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="app-shell">
      <Sidebar user={session.user} />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
