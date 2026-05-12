import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEFAULT_EMAIL_BODY = `Hei,

Takk for hyggelig møte. Her er link for å gi oss en tilbakemelding på samarbeidet vårt.

Det tar bare 30 sekunder — klikk knappen under for å svare:

{{survey_button}}

Lenken er personlig og kan kun brukes én gang. Svaret ditt lagres anonymt.

Ha en fin dag videre!`

const FIELDS = [
  {
    section: 'Avsender',
    fields: [
      { key: 'from_email', label: 'Avsender-epost', placeholder: 'nps@skydotten.no', type: 'email', help: 'Epostadressen som vises i mottakers innboks. Må være verifisert i SMTP2GO.' },
      { key: 'from_name',  label: 'Avsendernavn',   placeholder: 'NPS', type: 'text', help: 'Vises som visningsnavn i mottakers epostklient.' },
    ]
  },
  {
    section: 'App-URL',
    fields: [
      { key: 'app_url', label: 'Offentlig URL', placeholder: 'https://nps.skydotten.no', type: 'text', help: 'Brukes i survey-lenker som sendes i epost. Må være tilgjengelig for mottakerne.' },
    ]
  },
  {
    section: 'SMTP-innstillinger',
    fields: [
      { key: 'smtp_host',   label: 'SMTP-server',  placeholder: 'mail.smtp2go.com', type: 'text' },
      { key: 'smtp_port',   label: 'Port',          placeholder: '587',              type: 'number' },
      { key: 'smtp_user',   label: 'SMTP-brukernavn', placeholder: 'brukernavn fra SMTP2GO', type: 'text' },
      { key: 'smtp_pass',   label: 'SMTP-passord',  placeholder: '(uendret hvis tom)', type: 'password', help: 'La stå tom for å beholde eksisterende passord.' },
    ]
  },
]

export default function Settings() {
  const { authFetch } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [testMsg, setTestMsg] = useState(null)

  useEffect(() => {
    authFetch('/api/settings')
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false) })
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true); setSaveMsg(null)
    const res = await authFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) setSaveMsg({ ok: true, text: 'Innstillinger lagret!' })
    else setSaveMsg({ ok: false, text: 'Lagring feilet' })
    setTimeout(() => setSaveMsg(null), 3000)
  }

  async function sendTest() {
    if (!testEmail) return
    setTesting(true); setTestMsg(null)
    const res = await authFetch('/api/settings/test-email', {
      method: 'POST',
      body: JSON.stringify({ to: testEmail }),
    })
    const data = await res.json()
    setTesting(false)
    if (res.ok) setTestMsg({ ok: true, text: `Test-epost sendt til ${testEmail} ✓` })
    else setTestMsg({ ok: false, text: `Feil: ${data.error}` })
  }

  if (loading) return <p style={{ color: '#6b6b68' }}>Laster innstillinger...</p>

  return (
    <div style={{ maxWidth: '560px' }}>
      <button onClick={() => navigate('/')} style={backBtn}>← Tilbake</button>
      <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '1.5rem' }}>⚙️ Innstillinger</h1>

      <form onSubmit={save}>
        {FIELDS.map(section => (
          <div key={section.section} style={card}>
            <h2 style={sectionHead}>{section.section}</h2>
            {section.fields.map(f => (
              <div key={f.key} style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={inputStyle}
                  autoComplete="off"
                />
                {f.help && <p style={{ fontSize: '12px', color: '#8b8b88', marginTop: '4px' }}>{f.help}</p>}
              </div>
            ))}
          </div>
        ))}

        {/* Email body section */}
        <div style={card}>
          <h2 style={sectionHead}>E-posttekst</h2>
          <p style={{ fontSize: '12px', color: '#8b8b88', marginBottom: '12px' }}>
            Skriv inn teksten som sendes til mottakerne. Bruk <code style={{ background: '#f1f0eb', padding: '1px 5px', borderRadius: '4px' }}>{'{{survey_button}}'}</code> for å plassere knappen i teksten.
          </p>
          <textarea
            value={form.email_body || DEFAULT_EMAIL_BODY}
            onChange={e => setForm({ ...form, email_body: e.target.value })}
            rows={12}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
          />
          <button
            type="button"
            onClick={() => setForm({ ...form, email_body: DEFAULT_EMAIL_BODY })}
            style={{ marginTop: '8px', background: 'none', border: '1px solid #e2e2de', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#6b6b68', cursor: 'pointer' }}
          >
            ↺ Tilbakestill til standard
          </button>
        </div>

        {saveMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '14px',
            background: saveMsg.ok ? '#E1F5EE' : '#fcebeb',
            color: saveMsg.ok ? '#0F6E56' : '#c0392b',
            border: `1px solid ${saveMsg.ok ? '#9fe1cb' : '#f5c0c0'}`,
          }}>
            {saveMsg.text}
          </div>
        )}

        <button type="submit" disabled={saving} style={btnPrimary}>
          {saving ? 'Lagrer...' : 'Lagre innstillinger'}
        </button>
      </form>

      {/* Test email section */}
      <div style={{ ...card, marginTop: '1.5rem' }}>
        <h2 style={sectionHead}>Send test-epost</h2>
        <p style={{ fontSize: '13px', color: '#6b6b68', marginBottom: '1rem' }}>
          Verifiser at SMTP-oppsettet fungerer ved å sende en test til deg selv.
          Husk å lagre innstillinger først.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="din@epost.no"
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && sendTest()}
          />
          <button onClick={sendTest} disabled={testing || !testEmail} style={btnPrimary}>
            {testing ? 'Sender...' : 'Send test'}
          </button>
        </div>
        {testMsg && (
          <div style={{
            marginTop: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px',
            background: testMsg.ok ? '#E1F5EE' : '#fcebeb',
            color: testMsg.ok ? '#0F6E56' : '#c0392b',
            border: `1px solid ${testMsg.ok ? '#9fe1cb' : '#f5c0c0'}`,
          }}>
            {testMsg.text}
          </div>
        )}
      </div>
    </div>
  )
}

const backBtn = { background: 'none', border: 'none', color: '#6b6b68', cursor: 'pointer', fontSize: '13px', marginBottom: '1rem', padding: 0 }
const card = { background: '#fff', border: '1px solid #e2e2de', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }
const sectionHead = { fontSize: '13px', fontWeight: 600, color: '#6b6b68', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const labelStyle = { fontSize: '13px', color: '#3a3a38', display: 'block', marginBottom: '5px', fontWeight: 500 }
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e2de', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: '#fafafa', boxSizing: 'border-box' }
const btnPrimary = { padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }
