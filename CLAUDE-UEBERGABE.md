# Übergabe für Claude

Bitte übernimm dieses bestehende Projekt zur Weiterentwicklung. Bewahre die vorhandenen Funktionen und Daten. Frage vor einer Veröffentlichung nach dem gewünschten Hosting-Ziel.

## Zweck und Darstellung
Materialverwaltung für das KonfiCamp der Ev. Jugend Lauenburg⁴. Das Logo und die Farben Rot/Blau sind in source/public und source/app/globals.css hinterlegt.

## Funktionen
- Materialien mit mehreren Lagerorten und jeweiligen Beständen.
- Bedarfe ohne Bestand, benannte Einheiten und Sammelerfassung mehrerer Materialien mit gemeinsamem Tag/Zeitraum.
- Verbrauchsmaterial: Summe der Bedarfe; wiederverwendbares Material: höchster zeitgleicher Bedarf. Planung in lib/material-planning.ts.
- Fehlmengen und Packlisten je Lager; Packstatus.
- Öffentlicher Bereich /portal: Einkaufswunsch mit Name, Artikel, Menge, Einheit und optionalem Foto. Nur offene Portalwünsche werden öffentlich angezeigt. Positive Bestandsbuchung erfüllt Wünsche dauerhaft.
- Öffentliche Materialsuche zeigt Namen und Packstatus, ohne interne Lagerorte oder Notizen. „Dabei“ bedeutet als gepackt markiert.
- QR-Aushang unter /portal/qr.
- Geschützte Verwaltung unter /, Daten-API unter /api/data. Derzeit erlaubt lib/admin-auth.ts nur das Konto andre.gerbrand@gmail.com.
- Tagesplan unter public/documents/ablauf-konficamp-2026.pdf.

## Technik und Migration
TypeScript, React, Vinext/Next-kompatible App-Routen, Cloudflare Worker. D1-Bindung DB und R2-Bindung BUCKET. Paketmanager pnpm, Versionsstände in package.json und pnpm-lock.yaml.

Die vorhandene Anmeldung verwendet vertrauenswürdige, durch Sites gesetzte Identitätsheader und Sites-eigene Anmelderouten. Auf einem anderen Hosting-Ziel funktioniert das nicht automatisch. Dort ist eine serverseitig geprüfte Anmeldung mit geeignetem Anbieter einzurichten. Identitätsheader aus öffentlichen Anfragen dürfen niemals ungeprüft vertraut werden. Die Verwaltung und sämtliche privaten Datenendpunkte müssen geschützt bleiben; das Portal bleibt öffentlich.

Die Daten unter database.json, database.sqlite und database.sql gehören zur selben Anwendung. Bei Importen IDs und Verknüpfungen erhalten, insbesondere materials → material_stocks, needs und portal_wishes. Vorhandene Migrationen in source/drizzle nicht nachträglich verändern. Bilder müssen separat aus dem bisherigen R2-Bildspeicher übernommen werden, sofern welche vorhanden sind.

Sites-spezifische Veröffentlichungs- und Connector-Skripte sind im Quellcode enthalten. Für ein anderes Hosting-Ziel die Runtime-Bindungen, Build-Konfiguration, Anmeldung und Veröffentlichung gezielt anpassen.
