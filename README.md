# Luksi Rescue Luzern

Privates 3D-Rettungsspiel (three.js, Vite, TypeScript): Luksi fährt als Rettungssanitäter durch das echte Luzern, Kriens und Horw – ohne Gewalt, ohne Scheitern.

Live: https://gta.simon-infanger.ch/

## Entwickeln
```
npm install
npx vite            # Entwicklung
bash tools/dist.sh  # Build nach dist/ (grosse Daten als .gz)
python3 tests/qa.py # Testkit G1–G13 + P1 (Playwright, Server auf :8765 aus dist/)
```
Stand und Arbeitsweise: `STAND.md`, `docs/REALISMUS-KIT.md`, Änderungen: `CHANGELOG.txt`.
Rohdaten (`data/`, swisstopo-Kacheln, Luftbild) sind nicht im Repo; die Pipeline liegt in `tools/geo/`, die fertigen Spieldaten in `public/data/`.

## Datenquellen
- Geländemodell swissALTI3D, swissBUILDINGS3D 3.0, SWISSIMAGE: © swisstopo (Open Government Data, Quellenangabe erforderlich)
- Strassen, Wege, Gewässer, Gleise, Buslinien, Haltestellen, Gondelbahn: © OpenStreetMap-Mitwirkende, ODbL 1.0
- Busnetz 2027: luzern-faehrt-neu.ch (Linienliste)
- Luksi-Figuren: Luksis Haus (hospitality.luksi.ch), Kinderspital-Logo: Luzerner Kantonsspital – nur für dieses private Projekt verwendet
