# Luksi Rescue Luzern – STAND

Stand: 11.11.2026 ca. 17:00, Version **2026-11-11s** – live auf https://gta.simon-infanger.ch/ (geprüft: ausgeliefertes JS enthält Version s). Heute live gegangen: q (13:50), r (15:00), s (16:50).
Quellcode: github.com/cyclingsimon/gta (main). Rohdaten (data/) nicht im Repo.
Realismus-Aufgaben und Testkit: `docs/REALISMUS-KIT.md` (Projekt-Version ist aktueller).

## Spielfeld und Daten
- Feld x −3800..2700, z −1100..6300 (seit q: Haldenstrasse, Verkehrshaus, Lido, Tribschen-Ost, Schönbühl, Horwer Halbinsel mit St. Niklausen/Kastanienbaum).
- Geodaten werden über einen Browser geholt und gepackt (`window.PK`), Rückgabe in Base64-Stücken à 225 kB; `tools/geo/collect.py PREFIX N OUTDIR` setzt zusammen. Overpass nur overpass-api.de (CORS), grosse Abfragen in Bändern.
- Gelände: swissALTI3D-GeoTIFF 2 m → `tools/geo/alti_extend.py`. Gebäude: 1652 b3dm-Kacheln → 14'289 Gebäude. Luftbild `data/swissimage_2m_x2700.jpg`.
- OSM komplett neu (`data/osm_big.json`, `osm_props.json`, `osm_bus.json`, `beach.json`); alte Stände `*_x1150.json`.
- city.json: Seefläche (östlich des Nadelwehrs, x > −345) mit `f:1` = flach gezeichnet.

## Spiel (Module)
- `main.ts`: 18 Einsätze, Pedalos (`Boats`), 3 Kursschiff-Routen, Schilder Löwendenkmal/Verkehrshaus/Kastanienbaum, Test G3b.
- `world.ts`: `withRows` (Altstadt-Pastellzeilen), Kapellbrücke mit Geranien und Laternen, Seebrücke-Fahnen, Terrassen, Verkehrshaus-Flugzeug und Lok, Spielplätze, Nadelwehr, Löwendenkmal, Museggmauer, Museggtürme in Stein, Zytturm-Uhr, Bänke, Strände; `chunkInstanced` (500-m-Zellen); See flach (`water-lake`).

## Tests (Version s, Software-Rendering)
- qa.py G1–G13, G3b, P1 grün: P1 1.85 Mio. Dreiecke / 937 Draw Calls (Start), Schwanenplatz 2.32 Mio.
- missions.py: alle 18 Einsätze (Version q, 54 Sterne) und 3 Einsätze (Version s) ok, Spielstand bleibt. fun.py ok.
- Speicher «Echt»: Spitze 2.3 GB, nach Start 1.6 GB; «Leicht» 412 MB.
- Echte fps auf der GTX 1080 nicht gemessen.

## Bekannte Grenzen
- Echte fps/Handy ungemessen. Draw Calls gestiegen (937).
- Neue Buslinien: Linienführung aus OSM-Teilstücken (Annahme).

## Nächste Pakete
1. Simon: spielen (Verkehrshaus, Kastanienbaum, Löwendenkmal, Museggmauer), F3 fps, Rückmeldung in Todoist
2. Leistung: Speicherspitze senken, Draw Calls bündeln
3. Weitere Stadt-Details; Etappe 2 (Emmenbrücke, Ebikon) nur mit Kachel-Streaming
