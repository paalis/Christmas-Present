# Hold av datoer

Liten side der Ingrid kan holde av datoer. Live: https://hold-av-datoer.vercel.app

| Sti | Hva |
|---|---|
| `public/config.js` | Tekst, forslag, reservehelger, regler for kalenderen. Leses både av siden og serveren. |
| `public/` | Alt som serveres (index.html, app.js, dato.js, regler.js, style.css, og.png, robots.txt) |
| `api/send.js` | Serverfunksjon `POST /api/send`: validerer, varsler via ntfy og lagrer en kopi i Vercel Blob |
| `test/run.js` | `npm test` – ordsjekk, datoer i flere tidssoner, API med simulerte tjenester, nettleserflyt |

## Miljøvariabler (Vercel)

- `NTFY_TOPIC` – hemmelig emnenavn. Abonner på det i ntfy-appen. Aldri i koden.
- `BLOB_READ_WRITE_TOKEN` – settes automatisk når Blob-lageret er koblet til prosjektet.

## Levering av svar

1. ntfy-varsel til mobilen.
2. Kopi i Vercel Blob (`svar/<id>.json`, privat) – se Vercel → Storage.
3. Linje `SVAR {...}` i Vercel-loggene.

Siden viser «Tusen takk!» først når serveren bekrefter at svaret er varslet eller lagret.
Samme valg sendes aldri to ganger (knappene låses, og serveren dropper gjentatt id).

## Regel for innhold

Ingenting i `public/` eller i URL-er/metatagger skal avsløre overraskelsen. `npm test` sjekker dette.
