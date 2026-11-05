# 🎄 Julebilletten

En liten nettside som gave: kjæresten åpner en julekonvolutt, får en billett til et
**hemmelig reisemål**, og velger selv **når** turen skal være i en kalender. Til slutt
stemples billetten, og svaret sendes til deg.

| Fil | Hva |
|---|---|
| `config.js` | **Det eneste du trenger å redigere** – navn, hilsen, hint, antall netter, datoperiode, blokkerte datoer og hvordan svaret skal nå deg |
| `index.html`, `style.css`, `app.js` | Selve siden |
| `qr.html` | Utskriftsvennlig billett med QR-kode som peker til siden |
| `vendor/qrcode.js` | QR-bibliotek (qrcode-generator, MIT) |

## 1. Tilpass

Åpne `config.js` og fyll inn. Viktigst:

- `til`, `fra`, `hilsen`, `destinasjonHint`
- `netter` – fast lengde (hun velger bare avreisedag), eller `null` for fritt valg av avreise **og** hjemreise
- `tidligsteDato` / `senesteDato` og `utilgjengelig` – datoer som ikke går
- `avreisedager` – f.eks. `[4, 5]` hvis turen må starte torsdag eller fredag

### Hvordan får du svaret?

- `ntfy` (anbefalt) → push-varsel rett på mobilen i det hun stempler billetten. Installer
  appen **ntfy** (App Store / Google Play, gratis, ingen konto), trykk «+» og abonner på
  navnet som står i `config.js` (`julebillett-…`). Hold navnet hemmelig.
- `telefon` → knapp som åpner SMS til deg med datoene ferdig utfylt
- `epost` → knapp som åpner e-post til deg
- `formspree` (anbefalt i tillegg) → opprett et gratis skjema på <https://formspree.io>, lim inn
  adressen, så får du svaret automatisk på e-post i det øyeblikket hun stempler billetten

Valget huskes på telefonen hennes, så åpner hun siden igjen ser hun den stemplede billetten
(med mulighet for «Endre dato»).

## 2. Publiser

**GitHub Pages:** Slå på *Settings → Pages → Source: GitHub Actions*, og merge til `main`.
Workflowen i `.github/workflows/pages.yml` publiserer da siden automatisk.
(Private repoer krever betalt GitHub-plan for Pages – ellers kan du bruke Vercel/Netlify,
som bare serverer mappa som den er.)

## 3. Lag QR-koden

Åpne `qr.html` på den publiserte adressen (eller sett `nettadresse` i `config.js`),
sjekk at QR-koden peker riktig, og trykk **Skriv ut**. Legg billetten i en konvolutt under
juletreet. 🎁

Test lokalt med `python3 -m http.server` og åpne <http://localhost:8000>.
