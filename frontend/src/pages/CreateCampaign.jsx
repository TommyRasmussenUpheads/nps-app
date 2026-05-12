import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function CreateCampaign() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contacts, setContacts] = useState([])
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const { authFetch } = useAuth()
  const navigate = useNavigate()

  function addContact() {
    if (!newName.trim() || !newEmail.trim()) return
    if (!/\S+@\S+\.\S+/.test(newEmail)) { alert('Ugyldig epostadresse'); return }
    setContacts([...contacts, { id: Date.now(), name: newName.trim(), email: newEmail.trim() }])
    setNewName(''); setNewEmail('')
  }

  async function save(andSend = false) {
    if (!name.trim()) { alert('Firma er påkrevd'); return }
    if (!contacts.length) { alert('Legg til minst én kontakt'); return }
    setSaving(true)
    const res = await authFetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, sender_name: 'Kundeservice', contacts }),
    })
    const data = await res.json()

    if (andSend) {
      await authFetch(`/api/campaigns/${data.id}/send`, { method: 'POST' })
    }

    setSaving(false)
    navigate(`/campaigns/${data.id}`)
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '1.5rem' }}>Ny forespørsel</h1>

      <section style={cardStyle}>
        <h2 style={sectionHead}>Forespørselinfo</h2>
        <Field label="Firma *">
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="f.eks. Upheads AS" />
        </Field>
        <Field label="Beskrivelse">
          <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Valgfri beskrivelse" />
        </Field>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionHead}>Legg til kontakter</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
          <Field label="Navn">
            <input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ola Nordmann"
              onKeyDown={e => e.key === 'Enter' && addContact()} />
          </Field>
          <Field label="Epost">
            <input style={inputStyle} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="ola@firma.no"
              onKeyDown={e => e.key === 'Enter' && addContact()} />
          </Field>
          <button onClick={addContact} style={{ ...btnStyle('primary'), height: '36px', alignSelf: 'flex-end' }}>+</button>
        </div>

        {contacts.length === 0
          ? <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Ingen kontakter ennå.</p>
          : contacts.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '6px' }}>
              <span style={{ flex: 1, fontWeight: 500, fontSize: '13px' }}>{c.name}</span>
              <span style={{ flex: 1, color: 'var(--muted)', fontSize: '13px' }}>{c.email}</span>
              <button onClick={() => setContacts(contacts.filter(x => x.id !== c.id))}
                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
            </div>
          ))
        }
      </section>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => save(false)} disabled={saving} style={btnStyle('primary')}>
          {saving ? 'Lagrer...' : 'Lagre'}
        </button>
        <button onClick={() => save(true)} disabled={saving} style={btnStyle('send')}>
          {saving ? 'Lagrer...' : '✉️ Lagre og Send'}
        </button>
        <button onClick={() => navigate('/')} style={btnStyle()}>Avbryt</button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <div style={{ marginBottom: '12px' }}><label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>{label}</label>{children}</div>
}

const cardStyle = { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }
const sectionHead = { fontSize: '14px', fontWeight: 500, marginBottom: '1rem', color: 'var(--muted)' }
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }

function btnStyle(type) {
  const base = { padding: '9px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }
  if (type === 'primary') return { ...base, border: 'none', background: 'var(--green)', color: '#fff' }
  if (type === 'send') return { ...base, border: 'none', background: '#2563eb', color: '#fff' }
  return { ...base, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)' }
}
