# Veröffentlichung auf Cloudflare Workers

Die App läuft als Cloudflare Worker mit D1-Datenbank (`DB`) und R2-Bildspeicher (`BUCKET`).
Die Verwaltung (`/`) ist per Passwort geschützt, das Portal (`/portal`) ist öffentlich.

## Einmalige Einrichtung (lokal, im Ordner `source/`)

```bash
pnpm install
npx wrangler login
npx wrangler d1 create konficamp-db          # notiere die ausgegebene database_id
npx wrangler r2 bucket create konficamp-bilder
export D1_DATABASE_ID=<database_id>
npx wrangler d1 execute konficamp-db --remote --file=../deploy/import.sql   # Daten + Tabellen
pnpm build
npx wrangler deploy --config dist/server/wrangler.json
npx wrangler secret put ADMIN_PASSWORD --config dist/server/wrangler.json   # Passwort für die Verwaltung
```

Wrangler gibt die Adresse aus (`https://…workers.dev`). Danach den QR-Code für das Portal erzeugen,
neu bauen und deployen:

```bash
node scripts/make-qr.mjs https://<adresse>/portal
pnpm build && npx wrangler deploy --config dist/server/wrangler.json
```

## Automatisch über GitHub

Der Workflow `.github/workflows/deploy.yml` baut und deployt bei jedem Push auf `main` (oder manuell).
Nötige Repository-Secrets: `CLOUDFLARE_API_TOKEN` (Rechte: Workers, D1, R2), `CLOUDFLARE_ACCOUNT_ID`,
`D1_DATABASE_ID`, `ADMIN_PASSWORD`.

## Hinweise
- Die Bilder aus dem bisherigen Speicher sind nicht im Export; aktuell gibt es keine.
- `deploy/import.sql` einmalig ausführen – sonst werden Daten doppelt eingefügt.
- Die Dateien in `build/` und `scripts/connector-preview` stammen aus der alten Umgebung und werden
  für den Build weiterhin benötigt; nicht löschen.

## Lokal testen
```bash
bash deploy/local-test.sh          # baut, importiert die Daten, startet auf http://127.0.0.1:8787 (Passwort: konficamp)
bash deploy/smoke-test.sh          # zweites Terminal: automatischer Funktionstest
```
Der Browser muss `127.0.0.1`/`localhost` verwenden (das Login-Cookie ist `Secure`; Safari akzeptiert das lokal nicht – dann Chrome oder Firefox nehmen).
