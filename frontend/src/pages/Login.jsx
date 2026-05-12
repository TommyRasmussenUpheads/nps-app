import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Innlogging feilet'); setLoading(false); return }
      login(data.token, data.username)
      navigate(from, { replace: true })
    } catch {
      setError('Nettverksfeil — er serveren oppe?')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f3',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '36px', marginBottom: '0.5rem' }}>📊</div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>NPS Kampanjer</h1>
          <p style={{ color: '#6b6b68', fontSize: '14px' }}>Logg inn for å fortsette</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: '#fff', border: '1px solid #e2e2de',
          borderRadius: '14px', padding: '2rem',
        }}>
          {error && (
            <div style={{
              background: '#fcebeb', border: '1px solid #f5c0c0', borderRadius: '8px',
              padding: '10px 14px', marginBottom: '1rem', fontSize: '14px', color: '#c0392b'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Brukernavn</label>
            <input
              style={inputStyle}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Passord</label>
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', background: '#1D9E75', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            fontFamily: 'inherit',
          }}>
            {loading ? 'Logger inn...' : 'Logg inn'}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: '13px', color: '#6b6b68', display: 'block', marginBottom: '5px' }
const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e2e2de',
  borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
  background: '#fafafa',
}
