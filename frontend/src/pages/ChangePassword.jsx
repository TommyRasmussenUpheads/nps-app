import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { authFetch } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next !== confirm) { setError('Passordene er ikke like'); return }
    if (next.length < 8) { setError('Nytt passord må være minst 8 tegn'); return }
    setLoading(true)
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div style={{ maxWidth: '400px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#6b6b68', cursor: 'pointer', fontSize: '13px', marginBottom: '1rem', padding: 0 }}>
        ← Tilbake
      </button>
      <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '1.5rem' }}>Endre passord</h1>

      <div style={{ background: '#fff', border: '1px solid #e2e2de', borderRadius: '12px', padding: '1.5rem' }}>
        {success
          ? <p style={{ color: '#1D9E75', fontWeight: 500 }}>✓ Passord endret!</p>
          : (
            <form onSubmit={handleSubmit}>
              {error && <div style={{ background: '#fcebeb', border: '1px solid #f5c0c0', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '14px', color: '#c0392b' }}>{error}</div>}
              {[
                { label: 'Nåværende passord', val: current, set: setCurrent, auto: 'current-password' },
                { label: 'Nytt passord', val: next, set: setNext, auto: 'new-password' },
                { label: 'Bekreft nytt passord', val: confirm, set: setConfirm, auto: 'new-password' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '13px', color: '#6b6b68', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                  <input type="password" value={f.val} onChange={e => f.set(e.target.value)} autoComplete={f.auto}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e2de', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              ))}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '10px', background: '#1D9E75', color: '#fff',
                border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '14px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {loading ? 'Lagrer...' : 'Endre passord'}
              </button>
            </form>
          )
        }
      </div>
    </div>
  )
}
