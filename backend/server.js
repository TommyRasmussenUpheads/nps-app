const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES = '8h';

// --- Database setup ---
const db = new Database(process.env.DB_PATH || '/data/nps.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sender_name TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    score INTEGER NOT NULL,
    comment TEXT,
    responded_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );
`);

// --- Seed defaults ---
(function seedDefaults() {
  // Admin user
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!existingUser) {
    const username = process.env.ADMIN_USER || 'admin';
    const password = process.env.ADMIN_PASS || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(uuidv4(), username, hash);
    console.log(`Default admin created — username: "${username}", password: "${password}"`);
  }

  // Default settings from env (only set if not already in DB)
  const defaults = {
    smtp_host:     process.env.SMTP_HOST || 'mail.smtp2go.com',
    smtp_port:     process.env.SMTP_PORT || '587',
    smtp_secure:   process.env.SMTP_SECURE || 'false',
    smtp_user:     process.env.SMTP_USER || '',
    smtp_pass:     process.env.SMTP_PASS || '',
    from_email:    process.env.FROM_EMAIL || 'nps@skydotten.no',
    from_name:     process.env.FROM_NAME  || 'NPS',
    app_url:       process.env.APP_URL    || 'http://localhost:3003',
    email_body:    'Hei,\n\nTakk for hyggelig møte. Her er link for å gi oss en tilbakemelding på samarbeidet vårt.\n\nDet tar bare 30 sekunder — klikk knappen under for å svare:\n\n{{survey_button}}\n\nLenken er personlig og kan kun brukes én gang. Svaret ditt lagres anonymt.\n\nHa en fin dag videre!',
  };
  const upsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) upsert.run(k, v);
})();

// --- Settings helpers ---
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// --- JWT middleware ---
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- Auth endpoints ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Ugyldig brukernavn eller passord' });
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token, username: user.username });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Nytt passord må være minst 8 tegn' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: 'Nåværende passord er feil' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

// --- Settings endpoints ---
app.get('/api/settings', requireAuth, (req, res) => {
  const s = getAllSettings();
  // Never return smtp_pass to frontend
  res.json({
    smtp_host:   s.smtp_host,
    smtp_port:   s.smtp_port,
    smtp_secure: s.smtp_secure,
    smtp_user:   s.smtp_user,
    smtp_pass:   '',          // masked
    from_email:  s.from_email,
    from_name:   s.from_name,
    app_url:     s.app_url,
  });
});

app.put('/api/settings', requireAuth, (req, res) => {
  const allowed = ['smtp_host','smtp_port','smtp_secure','smtp_user','from_email','from_name','app_url','email_body'];
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const key of allowed) {
    if (req.body[key] !== undefined) upsert.run(key, String(req.body[key]));
  }
  // Only update password if provided and non-empty
  if (req.body.smtp_pass && req.body.smtp_pass.trim() !== '') {
    upsert.run('smtp_pass', req.body.smtp_pass.trim());
  }
  res.json({ ok: true });
});

app.post('/api/settings/test-email', requireAuth, async (req, res) => {
  const to = req.body.to;
  if (!to) return res.status(400).json({ error: 'Mottaker-epost påkrevd' });
  try {
    const transporter = getTransporter();
    await transporter.verify();
    await transporter.sendMail({
      from: `"${getSetting('from_name')}" <${getSetting('from_email')}>`,
      to,
      subject: 'Test — NPS epostutsendelse fungerer',
      html: `<div style="font-family:sans-serif;max-width:480px">
        <p>Hei!</p>
        <p>Dette er en test-epost fra NPS Kampanje-appen.</p>
        <p>Epostutsendelse via <strong>${getSetting('smtp_host')}</strong> fungerer som det skal ✅</p>
        <p>Avsender: ${getSetting('from_name')} &lt;${getSetting('from_email')}&gt;</p>
      </div>`,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Email transporter (reads from DB) ---
function getTransporter() {
  return nodemailer.createTransport({
    host:   getSetting('smtp_host')   || 'mail.smtp2go.com',
    port:   parseInt(getSetting('smtp_port') || '587'),
    secure: getSetting('smtp_secure') === 'true',
    auth: {
      user: getSetting('smtp_user') || '',
      pass: getSetting('smtp_pass') || '',
    },
  });
}

// --- Helpers ---
function genToken() { return crypto.randomBytes(24).toString('hex'); }

function calcNPS(responses) {
  if (!responses.length) return null;
  const promoters  = responses.filter(r => r.score >= 9).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

// --- Campaign endpoints ---
app.get('/api/campaigns', requireAuth, (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  const result = campaigns.map(c => {
    const contacts  = db.prepare('SELECT * FROM contacts WHERE campaign_id = ?').all(c.id);
    const responses = db.prepare('SELECT * FROM responses WHERE campaign_id = ?').all(c.id);
    return {
      ...c,
      contacts: contacts.map(ct => ({
        ...ct,
        responded: !!responses.find(r => r.token === ct.token),
        score: responses.find(r => r.token === ct.token)?.score ?? null,
      })),
      response_count: responses.length,
      nps: calcNPS(responses),
    };
  });
  res.json(result);
});

app.get('/api/campaigns/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const contacts  = db.prepare('SELECT * FROM contacts WHERE campaign_id = ?').all(c.id);
  const responses = db.prepare('SELECT * FROM responses WHERE campaign_id = ?').all(c.id);
  res.json({
    ...c,
    contacts: contacts.map(ct => ({
      ...ct,
      name: ct.company,
      responded: !!responses.find(r => r.token === ct.token),
      score: responses.find(r => r.token === ct.token)?.score ?? null,
    })),
    responses,
    nps: calcNPS(responses),
  });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const { name, description, sender_name, contacts } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (!contacts || !contacts.length) return res.status(400).json({ error: 'At least one contact required' });
  const id = uuidv4();
  db.prepare('INSERT INTO campaigns (id, name, description, sender_name) VALUES (?, ?, ?, ?)').run(id, name, description || '', sender_name || getSetting('from_name') || 'Kundeservice');
  const insertContact = db.prepare('INSERT INTO contacts (id, campaign_id, company, email, token) VALUES (?, ?, ?, ?, ?)');
  for (const c of contacts) insertContact.run(uuidv4(), id, c.name || c.company, c.email, genToken());
  res.json({ id });
});

app.patch('/api/campaigns/:id/status', requireAuth, (req, res) => {
  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/campaigns/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM responses WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/campaigns/:id/send', requireAuth, async (req, res) => {
  const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  const contacts   = db.prepare('SELECT * FROM contacts WHERE campaign_id = ?').all(c.id);
  const baseUrl    = getSetting('app_url') || 'http://localhost:3003';
  const fromEmail  = getSetting('from_email') || 'nps@skydotten.no';
  const fromName   = getSetting('from_name') || 'NPS';
  const transporter = getTransporter();

  const DEFAULT_BODY = 'Hei,\n\nTakk for hyggelig møte. Her er link for å gi oss en tilbakemelding på samarbeidet vårt.\n\nDet tar bare 30 sekunder — klikk knappen under for å svare:\n\n{{survey_button}}\n\nLenken er personlig og kan kun brukes én gang. Svaret ditt lagres anonymt.\n\nHa en fin dag videre!';
  const emailBodyTemplate = getSetting('email_body') || DEFAULT_BODY;

  function buildEmailHtml(surveyUrl) {
    const buttonHtml = `<p style="text-align:center;margin:1.5rem 0"><a href="${surveyUrl}" style="background:#1D9E75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:16px;display:inline-block">Gi tilbakemelding</a></p>`;
    const bodyWithButton = emailBodyTemplate.replace('{{survey_button}}', buttonHtml);
    // Convert plain text lines to HTML paragraphs (skip lines that are already HTML)
    const htmlParts = bodyWithButton.split('\n').map(line => {
      if (line.trim() === '') return '';
      if (line.trim().startsWith('<')) return line;
      return `<p style="margin:0 0 0.75rem">${line}</p>`;
    }).join('');
    return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a18;line-height:1.6">${htmlParts}</div>`;
  }

  const results = [];
  for (const contact of contacts) {
    const existing = db.prepare('SELECT id FROM responses WHERE token = ?').get(contact.token);
    if (existing) { results.push({ email: contact.email, status: 'skipped_already_answered' }); continue; }

    const surveyUrl = `${baseUrl}/survey/${contact.token}`;
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: contact.email,
        subject: `Vi ønsker din tilbakemelding — ${c.name}`,
        html: buildEmailHtml(surveyUrl),
      });
      results.push({ email: contact.email, status: 'sent' });
    } catch (err) {
      results.push({ email: contact.email, status: 'error', error: err.message });
    }
  }
  res.json({ results });
});

// --- Survey endpoints (PUBLIC) ---
app.get('/api/survey/:token', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE token = ?').get(req.params.token);
  if (!contact) return res.status(404).json({ error: 'Invalid link' });
  const existing = db.prepare('SELECT id FROM responses WHERE token = ?').get(req.params.token);
  if (existing) return res.status(409).json({ error: 'Already answered' });
  const campaign = db.prepare('SELECT name, sender_name FROM campaigns WHERE id = ?').get(contact.campaign_id);
  res.json({ company: contact.company, campaign_name: campaign.name, sender_name: campaign.sender_name });
});

app.post('/api/survey/:token', (req, res) => {
  const { score, comment } = req.body;
  if (score === undefined || score < 0 || score > 10) return res.status(400).json({ error: 'Invalid score' });
  const contact = db.prepare('SELECT * FROM contacts WHERE token = ?').get(req.params.token);
  if (!contact) return res.status(404).json({ error: 'Invalid link' });
  const existing = db.prepare('SELECT id FROM responses WHERE token = ?').get(req.params.token);
  if (existing) return res.status(409).json({ error: 'Already answered' });
  db.prepare('INSERT INTO responses (id, campaign_id, token, score, comment) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), contact.campaign_id, req.params.token, score, comment || '');
  res.json({ ok: true });
});

// --- Serve React frontend ---
const frontendDist = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`NPS app running on port ${PORT}`));
