import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'
import { useAuth, useClearAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',       label: 'Collection', end: true },
  { to: '/upload', label: 'Upload',     end: false },
  { to: '/review', label: 'Review Queue', end: false },
] as const

export default function Layout() {
  const { user }    = useAuth()
  const clearAuth   = useClearAuth()
  const navigate    = useNavigate()

  async function handleLogout() {
    try { await auth.logout() } catch { /* ignore network errors on logout */ }
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sticky topbar ─────────────────────────────────────────────────── */}
      <header style={{
        position:      'sticky',
        top:           0,
        zIndex:        50,
        borderBottom:  '1px solid var(--border)',
        background:    'var(--surface)',
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{
          maxWidth:   1200,
          margin:     '0 auto',
          padding:    '0 20px',
          height:     56,
          display:    'flex',
          alignItems: 'center',
          gap:        24,
        }}>

          {/* Brand mark */}
          <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="1" y="3" width="18" height="14" rx="2.5"
                stroke="var(--primary)" strokeWidth="1.6" fill="none" />
              <rect x="1" y="7" width="18" height="3.5"
                fill="var(--primary)" fillOpacity="0.22" />
              <rect x="4" y="12" width="5" height="1.5" rx="0.75"
                fill="var(--muted)" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              CardVault <span style={{ color: 'var(--primary)' }}>AI</span>
            </span>
          </NavLink>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `cv-nav-link${isActive ? ' active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User + logout */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username ?? user.email}
              </span>
              <button className="cv-btn cv-btn-danger" style={{ padding: '5px 13px', fontSize: 13 }} onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}

        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <Outlet />
      </main>

    </div>
  )
}
