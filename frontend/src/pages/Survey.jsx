import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function Survey() {
  const { token } = useParams()
  const [state, setState] = useState('loading') // loading | ready | done | already | error
  const [info, setInfo] = useState(null)
  const [score, setScore] = useState(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/survey/${token}`)
      .then(r => {
        if (r.status === 409) { setState('already'); return null }
        if (!r.ok) { setState('error'); return null }
        return r.json()
      })
      .then(data => { if (data) { setInfo(data); setState('ready') } })
  }, [token])

  async function submit() {
    if (score === null) return
    setSubmitting(true)
    const r = await fetch(`/api/survey/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, comment }),
    })
    if (r.status === 409) { setState('already'); return }
    setState('done')
  }

  const face = s => s <= 6 ? '😞' : s <= 8 ? '😐' : '😊'
  const col = s => s <= 6 ? '#E24B4A' : s <= 8 ? '#BA7517' : '#1D9E75'
  const commentLabel = score === null ? '' : score <= 6 ? 'Hva kan vi gjøre bedre?' : score <= 8 ? 'Hva skulle til for å gi oss en høyere score?' : 'Hva er det du setter mest pris på?'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e2de', borderRadius: '14px', padding: '1.5rem', maxWidth: '560px', width: '100%', boxSizing: 'border-box' }}>

        {state === 'loading' && <p style={{ color: '#6b6b68', textAlign: 'center' }}>Laster...</p>}

        {state === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '1rem' }}>❌</p>
            <p style={{ fontWeight: 500 }}>Ugyldig lenke</p>
            <p style={{ color: '#6b6b68', fontSize: '14px', marginTop: '4px' }}>Denne undersøkelseslenken er ikke gyldig.</p>
          </div>
        )}

        {state === 'already' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '1rem' }}>✅</p>
            <p style={{ fontWeight: 500, fontSize: '18px' }}>Allerede besvart</p>
            <p style={{ color: '#6b6b68', fontSize: '14px', marginTop: '4px' }}>Du har allerede svart på denne undersøkelsen. Tusen takk!</p>
          </div>
        )}

        {state === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🎉</p>
            <p style={{ fontWeight: 500, fontSize: '18px', marginBottom: '8px' }}>Takk for tilbakemeldingen!</p>
            <p style={{ color: '#6b6b68', fontSize: '14px' }}>Svaret ditt er registrert anonymt. Vi setter stor pris på det!</p>
          </div>
        )}

        {state === 'ready' && info && (
          <>
            <p style={{ fontSize: '13px', color: '#6b6b68', marginBottom: '4px' }}>{info.company} — {info.campaign_name}</p>
            <p style={{ fontSize: '17px', fontWeight: 500, marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Hvor sannsynlig er det at du vil anbefale oss til en kollega eller venn?
            </p>

            {/* Score grid: 2 rows on mobile (0-5 top, 6-10 bottom), single row on desktop */}
            <div style={{ marginBottom: '8px' }}>
              {/* Mobile: two rows of 6 + 5 */}
              <div className="score-grid-mobile">
                <div style={{ display: 'flex', gap: '3px', marginBottom: '3px', justifyContent: 'center' }}>
                  {Array.from({ length: 6 }, (_, i) => scoreBtn(i, score, setScore, face, col, true))}
                </div>
                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                  {Array.from({ length: 5 }, (_, i) => scoreBtn(i + 6, score, setScore, face, col, true))}
                </div>
              </div>
              {/* Desktop: single row */}
              <div className="score-grid-desktop" style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
                {Array.from({ length: 11 }, (_, i) => scoreBtn(i, score, setScore, face, col, false))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b6b68', marginBottom: '1.25rem', padding: '0 2px' }}>
              <span>Kritikere (0–6)</span>
              <span>Passive (7–8)</span>
              <span>Promotører (9–10)</span>
            </div>

            {score !== null && (
              <div style={{ animation: 'fadeIn .2s' }}>
                <label style={{ fontSize: '13px', color: '#6b6b68', display: 'block', marginBottom: '6px' }}>{commentLabel}</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Valgfri kommentar..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e2de', borderRadius: '8px', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <button onClick={submit} disabled={submitting} style={{
                  width: '100%', marginTop: '10px', padding: '12px',
                  background: '#1D9E75', color: '#fff', border: 'none',
                  borderRadius: '8px', fontWeight: 500, fontSize: '15px', cursor: 'pointer',
                }}>
                  {submitting ? 'Sender...' : 'Send svar →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        .score-grid-mobile { display: none; }
        .score-grid-desktop { display: flex; }
        @media (max-width: 640px) {
          .score-grid-mobile { display: block; }
          .score-grid-desktop { display: none; }
        }
      `}</style>
    </div>
  )
}

function scoreBtn(i, score, setScore, face, col, compact = false) {
  return (
    <div key={i} onClick={() => setScore(i)} style={{
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: compact ? '2px' : '4px',
      padding: compact ? '6px 2px' : '8px 4px',
      borderRadius: '10px',
      minWidth: compact ? '44px' : '42px',
      flex: '1',
      border: `2px solid ${score === i ? col(i) : 'transparent'}`,
      background: score === i ? col(i) + '18' : 'transparent',
      transition: 'all .12s',
    }}>
      <span style={{ fontSize: compact ? '18px' : '20px' }}>{face(i)}</span>
      <span style={{ fontSize: compact ? '13px' : '14px', fontWeight: 600, color: col(i) }}>{i}</span>
    </div>
  )
}
