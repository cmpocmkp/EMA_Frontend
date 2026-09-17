import { ChartColumn, LogOut, Map as MapIcon, Users } from 'lucide-react'
import { NavLink } from 'react-router'
import type { User } from '../api'
import { useSession } from '../session/session-context'
import { initials } from './initials'

const NAV_ITEMS = [
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/summary', label: 'Summary', icon: ChartColumn },
  { to: '/users', label: 'Users', icon: Users },
]

export default function Sidebar({ user }: { user: User }) {
  const { signOut } = useSession()

  return (
    <aside className="sidebar glass">
      <div className="sidebar__brand">
        <div className="brand-mark brand-mark--small" aria-hidden="true">
          EMA
        </div>
        <div className="sidebar__brand-text">
          <strong>EMA</strong>
          <span>Dashboard</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="sidebar__link" title={label}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="sidebar__label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__account">
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="sidebar__user">
          <strong>{user.name}</strong>
          <span>@{user.username}</span>
        </span>
        <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
          <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
