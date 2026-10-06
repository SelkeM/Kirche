#!/usr/bin/env bash
# Startet die komplette Seite lokal (lokale D1/R2-Simulation, keine Cloudflare-Anmeldung nötig).
#   bash deploy/local-test.sh            -> http://127.0.0.1:8787  (Passwort: konficamp)
# Optional: PORT=9000 ADMIN_PASSWORD=geheim bash deploy/local-test.sh
set -euo pipefail
cd "$(dirname "$0")/../source"
PORT="${PORT:-8787}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-konficamp}"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
pnpm build
rm -rf .wrangler/state
npx wrangler d1 execute konficamp-db --local --persist-to .wrangler/state \
  --config dist/server/wrangler.json --file=../deploy/import.sql >/dev/null
printf 'ADMIN_PASSWORD=%s\nSESSION_SECRET=lokaler-test\n' "$ADMIN_PASSWORD" > dist/server/.dev.vars
echo
echo "Verwaltung:  http://127.0.0.1:$PORT/        (Passwort: $ADMIN_PASSWORD)"
echo "Portal:      http://127.0.0.1:$PORT/portal"
echo "QR-Aushang:  http://127.0.0.1:$PORT/portal/qr"
echo
exec npx wrangler dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port "$PORT"
