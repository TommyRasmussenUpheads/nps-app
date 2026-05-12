# NPS Kampanje-app

Enkel app for å sende ut NPS-undersøkelser til kunder.

## Kom i gang

### Forutsetninger
- Docker og Docker Compose installert

### Start appen

```bash
# 1. Klon eller kopier prosjektet
# 2. Konfigurer SMTP i docker-compose.yml
# 3. Start
docker compose up -d --build

# Appen kjører nå på http://localhost:3000
```

### Stopp appen
```bash
docker compose down
```

## SMTP-konfigurasjon

Rediger `docker-compose.yml` og fyll inn SMTP-verdier.

**Gmail (anbefalt):**
1. Aktiver 2-faktor på Google-kontoen din
2. Gå til myaccount.google.com → Sikkerhet → App-passord
3. Generer et app-passord for "E-post"
4. Bruk dette som `SMTP_PASS`

```yaml
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: din@gmail.com
SMTP_PASS: xxxx xxxx xxxx xxxx
```

**Ethereal (kun for testing):**
Gå til https://ethereal.email og generer en gratis testkonto.
Epostene sendes ikke egentlig — du kan se dem i Ethereal-innboksen.

## Funksjonalitet

- Opprett kampanjer med navn og beskrivelse
- Legg til firma + kontaktepost per kampanje
- Send epost med anonym survey-lenke til alle kontakter
- Mottaker fyller inn NPS-score (0–10) og valgfri kommentar
- Lenken er anonym: 48 tegns kryptografisk tilfeldig token
- Dobbeltsvar blokkeres automatisk
- Se NPS-score, fordeling og kommentarer i dashbordet
- Avslutt eller slett kampanjer

## Datalagring

SQLite-database lagres i Docker-volume `nps-data` → `/data/nps.db`.
Data overlever restart og oppdatering av container.

For backup:
```bash
docker cp $(docker compose ps -q nps-app):/data/nps.db ./backup.db
```

## Miljøvariabler

| Variabel | Standard | Beskrivelse |
|----------|----------|-------------|
| PORT | 3000 | HTTP-port |
| APP_URL | http://localhost:3000 | Offentlig URL (brukes i epost-lenker) |
| DB_PATH | /data/nps.db | Sti til SQLite-database |
| SMTP_HOST | smtp.ethereal.email | SMTP-server |
| SMTP_PORT | 587 | SMTP-port |
| SMTP_SECURE | false | TLS (true for port 465) |
| SMTP_USER | — | SMTP-brukernavn |
| SMTP_PASS | — | SMTP-passord |
