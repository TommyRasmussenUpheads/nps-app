import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'

function npsColor(n) {
  if (n === null || n === undefined) return 'var(--muted)'
  if (n >= 50) return 'var(--green)'
  if (n >= 0) return 'var(--amber)'
  return 'var(--red)'
}

export default function CampaignDetail() {
  const { id } = useParams()
  const { authFetch } = useAuth()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [copied, setCopied] = useState(null)

  async function load() {
    const r = await authFetch(`/api/campaigns/${id}`)
    if (!r.ok) { navigate('/'); return }
    setCampaign(await r.json())
  }

  useEffect(() => { load() }, [id])

  async function sendEmails() {
    setSending(true); setSendResult(null)
    const r = await authFetch(`/api/campaigns/${id}/send`, { method: 'POST' })
    const data = await r.json()
    setSendResult(data.results)
    setSending(false)
    load()
  }

  async function closeOrReopen() {
    await authFetch(`/api/campaigns/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: campaign.status === 'active' ? 'closed' : 'active' }),
    })
    load()
  }

  async function deleteCampaign() {
    if (!confirm('Slett kampanjen og alle svar?')) return
    await authFetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    navigate('/')
  }

  function copyLink(token) {
    const url = `${window.location.origin}/survey/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!campaign) return <p style={{ color: 'var(--muted)' }}>Laster...</p>

  const responses = campaign.responses || []
  const promoters = responses.filter(r => r.score >= 9).length
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length
  const detractors = responses.filter(r => r.score <= 6).length
  const nps = campaign.nps

  const distribution = Array.from({ length: 11 }, (_, i) => ({
    score: i, count: responses.filter(r => r.score === i).length,
  }))
  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', marginBottom: '1rem', padding: 0 }}>
        ← Tilbake
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 500 }}>{campaign.name}</h1>
            <span style={{
              fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500,
              background: campaign.status === 'active' ? 'var(--green-light)' : '#f1efe8',
              color: campaign.status === 'active' ? 'var(--green-dark)' : 'var(--muted)',
            }}>
              {campaign.status === 'active' ? 'Aktiv' : 'Avsluttet'}
            </span>
          </div>
          {campaign.description && <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>{campaign.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {campaign.status === 'active' && (
            <button onClick={sendEmails} disabled={sending} style={btnStyle('primary')}>
              {sending ? 'Sender...' : '✉️ Send epost'}
            </button>
          )}
          <button onClick={closeOrReopen} style={btnStyle()}>
            {campaign.status === 'active' ? '🔒 Avslutt' : '🔓 Gjenåpne'}
          </button>
          <button onClick={deleteCampaign} style={{ ...btnStyle(), color: 'var(--red)', borderColor: 'var(--red)' }}>Slett</button>
        </div>
      </div>

      {sendResult && (
        <div style={{ background: 'var(--green-light)', border: '1px solid #9fe1cb', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--green-dark)' }}>Epostsending fullført</p>
          {sendResult.map((r, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--green-dark)' }}>
              {r.email}: {r.status === 'sent' ? '✓ Sendt' : r.status === 'skipped_already_answered' ? '↩ Allerede svart' : `✗ Feil: ${r.error}`}
            </p>
          ))}
        </div>
      )}

      {responses.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1rem' }}>
            {[
              { label: 'NPS-score', value: nps ?? '—', color: npsColor(nps) },
              { label: 'Promotører', value: promoters, color: 'var(--green)' },
              { label: 'Passive', value: passives, color: 'var(--amber)' },
              { label: 'Kritikere', value: detractors, color: 'var(--red)' },
            ].map(m => (
              <div key={m.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: m.color, fontWeight: 500, marginBottom: '4px' }}>{m.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 600, color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '1rem' }}>Fordeling</p>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '80px' }}>
              {distribution.map(d => {
                const h = d.count ? Math.max(6, Math.round((d.count / maxCount) * 72)) : 2
                const col = d.score <= 6 ? 'var(--red)' : d.score <= 8 ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={d.score} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '100%', background: col, height: `${h}px`, borderRadius: '3px 3px 0 0', opacity: d.count ? 1 : 0.15 }} />
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{d.score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 500 }}>Kontakter</p>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{responses.length}/{campaign.contacts.length} svart</span>
        </div>
        {campaign.contacts.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, fontSize: '14px' }}>{c.company}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.email}</p>
            </div>
            {c.responded
              ? <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '20px', background: 'var(--green-light)', color: 'var(--green-dark)', fontWeight: 500 }}>✓ {c.score}/10</span>
              : <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '20px', background: 'var(--bg)', color: 'var(--muted)' }}>Ikke svart</span>
            }
            <button onClick={() => copyLink(c.token)} style={{ ...btnStyle(), fontSize: '12px', padding: '5px 10px' }}>
              {copied === c.token ? '✓ Kopiert' : '🔗 Kopier lenke'}
            </button>
          </div>
        ))}
      </div>

      {responses.filter(r => r.comment).length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '0.75rem' }}>Kommentarer</p>
          {responses.filter(r => r.comment).map(r => (
            <div key={r.id} style={{ padding: '10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                Score: {r.score}/10 · {new Date(r.responded_at * 1000).toLocaleDateString('nb-NO')}
              </p>
              <p style={{ fontSize: '13px' }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function btnStyle(type) {
  return {
    padding: '7px 14px', borderRadius: 'var(--radius-sm)',
    border: type === 'primary' ? 'none' : '1px solid var(--border)',
    background: type === 'primary' ? 'var(--green)' : '#fff',
    color: type === 'primary' ? '#fff' : 'var(--text)',
    fontWeight: 500, fontSize: '13px', cursor: 'pointer',
  }
}
