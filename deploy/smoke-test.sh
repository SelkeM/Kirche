#!/usr/bin/env bash
# Automatischer Test gegen die laufende lokale Seite:  bash deploy/smoke-test.sh [http://127.0.0.1:8787] [passwort]
B="${1:-http://127.0.0.1:8787}"; PW="${2:-konficamp}"; fail=0
ok() { if [ "$2" = "$3" ]; then echo "OK    $1"; else echo "FEHLER $1 (erwartet $3, bekommen $2)"; fail=1; fi; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
ok "Portal öffentlich" "$(code $B/portal)" 200
ok "QR-Aushang" "$(code $B/portal/qr)" 200
ok "Portal-API" "$(code $B/api/portal)" 200
ok "Daten-API ohne Login gesperrt" "$(code $B/api/data)" 403
ok "Falsches Passwort" "$(code -X POST $B/api/login -H "Origin: $B" -d '{"password":"falsch"}')" 401
ok "Login fremde Herkunft" "$(code -X POST $B/api/login -H "Origin: https://evil.example" -d "{\"password\":\"$PW\"}")" 403
C=$(curl -s -D - -o /dev/null -X POST $B/api/login -H "Origin: $B" -d "{\"password\":\"$PW\"}" | grep -i '^set-cookie' | sed 's/.*kc_admin=\([^;]*\).*/\1/' | tr -d '\r')
[ -n "$C" ] && ok "Login mit Passwort" ok ok || { echo "FEHLER Login mit Passwort"; fail=1; }
ok "Daten-API mit Login" "$(code -H "Cookie: kc_admin=$C" $B/api/data)" 200
ok "Manipuliertes Cookie" "$(code -H "Cookie: kc_admin=${C}0" $B/api/data)" 403
N=$(curl -s -H "Cookie: kc_admin=$C" $B/api/data | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['materials']),len(d['needs']))")
ok "Daten vollständig (Materialien Bedarfe)" "$N" "112 132"
[ $fail = 0 ] && echo "Alle Tests bestanden." || { echo "Tests fehlgeschlagen."; exit 1; }
