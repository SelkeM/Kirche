# KonfiCamp Materialverwaltung – Export

Dieser Export enthält den Quellcode des veröffentlichten Standes vom 06.10.2026, Logo, QR-Code, den aktuellen Tagesplan und einen Export der Datenbank.

## Inhalt
- `source/`: Quellcode einschließlich Paketversionen und Datenbankschema/Migrationen.
- `database.json`: aktuelle Einheiten, Materialien, Lagerbestände, Bedarfe und Portalwünsche.
- `database.sqlite`: dieselben Daten als SQLite-Datenbank.
- `database.sql`: SQL-Dump zum Wiederherstellen.
- `CLAUDE-UEBERGABE.md`: Beschreibung der Anwendung und Hinweise für die Weiterentwicklung.

Die Datenbank wurde tabellenweise exportiert; Änderungen während des Exports wären nicht als gemeinsame Transaktion erfasst. Der Export enthält personenbezogene Angaben wie Namen bei Bedarfen und Wünschen. Zugangstoken, Passwörter, lokale Konfiguration, Abhängigkeiten und Build-Ausgaben sind nicht enthalten.

Die ZIP ist ein Projekt- und Datenexport, keine sofort lauffähige Datei für einen beliebigen Webhost. Die bestehende Website bleibt unverändert online. Fotos aus dem separaten Bildspeicher sind nicht enthalten; die Datenbank enthält gegebenenfalls deren Schlüssel. Der Tagesplan und die übrigen statischen Dateien sind enthalten.
