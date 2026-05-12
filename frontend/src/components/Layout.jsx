import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: '#fff', borderBottom: '1px solid #e2e2de',
        padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '2rem', height: '56px',
      }}>
        <NavLink to="/" style={{ fontWeight: 600, fontSize: '16px', color: '#1D9E75', textDecoration: 'none', letterSpacing: '-0.3px' }}>
          📊 NPS Kampanjer
        </NavLink>
        <nav style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {[['/', 'Oversikt'], ['/campaigns/new', '+ Ny kampanje']].map(([to, label]) => (
            <NavLink key={to} to={to} end style={({ isActive }) => ({
              padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px',
              background: isActive ? '#E1F5EE' : 'transparent',
              color: isActive ? '#0F6E56' : '#6b6b68',
              fontWeight: isActive ? 500 : 400,
            })}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#6b6b68' }}>👤 {user?.username}</span>
          <button onClick={() => navigate('/settings')} style={headerBtn} title="Innstillinger">⚙️</button>
          <button onClick={() => navigate('/change-password')} style={headerBtn}>Passord</button>
          <button onClick={() => { logout(); navigate('/login') }} style={headerBtn}>Logg ut</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  )
}

const headerBtn = {
  background: 'none', border: '1px solid #e2e2de', borderRadius: '6px',
  padding: '5px 10px', fontSize: '12px', color: '#6b6b68', cursor: 'pointer',
}
