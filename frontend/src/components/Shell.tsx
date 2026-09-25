import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/" className="brand">
          Plate Scan
        </Link>
        <nav>
          <NavLink to="/" end>
            Cases
          </NavLink>
          <NavLink to="/demo">Demo tools</NavLink>
        </nav>
        <div className="sidebar-foot">
          <p className="muted small">
            {user?.full_name}
            <br />
            {user?.tenant_name}
          </p>
          <button type="button" className="ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
