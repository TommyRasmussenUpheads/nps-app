import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function npsColor(n) {
  if (n === null) return 'var(--muted)'
  if (n >= 50) return 'var(--green)'
  if (n >= 0) return 'var(--amber)'
  return 'var(--red)'
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    authFetch('/api/campaigns')
      .then(r => r.json())
      .then(data => { setCampaigns(data); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: 'var(--muted)' }}>Laster...</p>

  if (!campaigns.length) return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📊</div>
      <p style={{ fontSize: '18px', fontWeight: 500, marginBottom: '0.5rem' }}>Ingen forespørsler ennå</p>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Opprett din første NPS-forespørsel for å komme i gang.</p>
      <button onClick={() => navigate('/campaigns/new')} style={btnStyle('primary')}>+ Ny forespørsel</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500 }}>Forespørsler</h1>
        <button onClick={() => navigate('/campaigns/new')} style={btnStyle('primary')}>+ Ny forespørsel</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {campaigns.map(c => (
          <div key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '1rem 1.25rem', cursor: 'pointer', transition: 'border-color .15s',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span style={{
                  fontSize: '11px', padding: '2px 7px', borderRadius: '20px', fontWeight: 500,
                  background: c.status === 'active' ? 'var(--green-light)' : '#f1efe8',
                  color: c.status === 'active' ? 'var(--green-dark)' : 'var(--muted)',
                }}>
                  {c.status === 'active' ? 'Aktiv' : 'Avsluttet'}
                </span>
              </div>
              {c.description && <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{c.description}</p>}
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                {new Date(c.created_at * 1000).toLocaleDateString('nb-NO')} · {c.contacts.length} kontakter
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>Svar</p>
                <p style={{ fontSize: '20px', fontWeight: 500 }}>{c.response_count}/{c.contacts.length}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>NPS</p>
                <p style={{ fontSize: '20px', fontWeight: 500, color: npsColor(c.nps) }}>
                  {c.nps !== null ? c.nps : '—'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function btnStyle(type) {
  return {
    padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: type === 'primary' ? 'var(--green)' : '#fff',
    color: type === 'primary' ? '#fff' : 'var(--text)',
    fontWeight: 500, fontSize: '14px', cursor: 'pointer',
    ...(type !== 'primary' ? { border: '1px solid var(--border)' } : {}),
  }
}
