# Luksi Rescue Luzern – STAND

Stand: 10.11.2026 20:58, Version **2026-11-10i** (Buslinien, Fahrleitung, Haltestellenschilder), ZIP an Simon gesendet und entpackt unter `Downloads\luksi-rescue\web-i`. Online ist weiterhin Version d; Simon lädt selbst hoch (FileZilla durch Claude blockiert, solange das CCleaner-Werbefenster offen ist).
Live: https://gta.simon-infanger.ch/ (Hostpoint `/www/luksi-rescue`). Quellen: `Luksi Rescue 2026-11-10i Quelle.tar.gz` (Outputs). Ein GitHub-Repo gibt es noch nicht.
Realismus-Aufgaben und Testkit: siehe `claude/REALISMUS-KIT.md` (R1–R14, Tests G1–G11, P1).

## Daten
- Gelände: swissALTI3D 2 m via api3.geo.admin.ch/profile, exakte LV95-Umrechnung pro Punkt, Strassen offline quer eben, Bodennetz vereinfacht → `ground.bin`, `terrain.bin`.
- Horizont: swissALTI3D 200 m, 42 × 42 km → `horizon.bin` (Int16 dm). Eigene Fernszene (Kamera bis 45 km), Spielfeldrand weich ins Umland überblendet.
- Gebäude: swissBUILDINGS3D 3.0 → `b3d.bin`/`b3d.json`. Dachfarbe je Gebäude aus SWISSIMAGE-WMS → `roofcolors.json`.
- OSM: Strassen, Einbahn, Wasser, Parks; neu `props.json` (Stege, Laternen, Bäume, Ampeln, Brunnen, Haltestellen; Pipeline `tools/geo/build_props.py`).
- Transferweg: Browser der Claude-App holt die Daten; grosse Rückgaben landen als Datei in `/tmp/claude-tool-results`.

## Spiel
- Laden: `tools/dist.sh` baut dist/ und legt grosse Daten als *.gz ab (20 → 8 MB); Browser entpackt mit DecompressionStream. Stufe A = OSM-Häuser + Raster-Boden (sofort spielbar), Stufe B = swisstopo-3D-Häuser + feiner Boden, im Hintergrund gebaut (`buildWorld` ist async mit Pausen) und per `swapWorld` getauscht. `window.__luksiReady` = Stufe B fertig (Tests warten darauf).
- Grafikstufe `save.quality` echt/leicht (Touch-Geräte: leicht; URL `?q=leicht|echt`). Leicht: keine 3D-Häuser, weniger Bäume/Verkehr, Pixelratio 1.
- Touch (`src/touch.ts`): Daumen-Lenkfeld, Gas/Bremse, Knopfleiste; Vollbild + Querformat beim Start; Manifest + App-Symbole.
- Mehrspieler: `players[]` (max. 4), Spieler 1 = Tastatur/Touch/Pad 1, Spieler k = Pad k; Beitritt A/Start; Split Screen per Viewport/Scissor; gemeinsame Einsätze (wer zuerst ankommt). Verkehr reagiert auf alle Ambulanzen.
- Fahrleitung über Trolleybus-Strecken + Haltestellenschilder (Pool von 6 Schildern bei den nächsten Haltestellen).
- Busse (`src/bus.ts`, `public/data/bus.json`, Pipeline `tools/geo/build_bus.py` aus OSM-Routenrelationen `data/osm_bus.json`): 49 Linienwege VBL 1–30 und PostAuto 71–73, max. 14 Busse gleichzeitig nahe den Spielern, Halt an echten Haltestellen (8 s), Ampel- und Ambulanz-Rücksicht. Fahrzeugtyp-Zuordnung (lighTram 1/2/8, Gelenkbus 4–7/12/21/24/30) ist eine Annahme aus Wikipedia/Hess-Angaben, nicht pro Kurs geprüft.
- Häuser (b3d) und Boden in 400-m-Kacheln (Frustum Culling): Testbild 1.82 Mio. Dreiecke, ~450 Draw Calls.
- Ampeln schalten (24-s-Zyklus), Autos halten bei Gelb/Rot. Erdgeschoss mit Schaufenstern per Shader (Textur-v < 1).
- Verkehr (`src/traffic.ts`): 36 Autos, rechts, Einbahn, Blaulicht → rechts ran; Rempler harmlos. 60 Passanten auf Fusswegen, hüpfen aus dem Weg. `?notraffic` schaltet ab.

## Tests (10.11. abends)
- Version f: qa.py G1–G11 + P1 grün (Startknopf nach 17 s Software statt 21 s; voll geladen 88 s Software). missions.py 12 Sterne. multi.py: 4 simulierte Controller treten bei, fahren, Split Screen ok. mobile.py: Android-Emulation, Touch-Gas beschleunigt, Startknopf nach 9 s (Leicht).
- `tests/qa.py`: G1–G11 und P1 grün (2.14 Mio. Dreiecke, 163 Draw Calls, Ladezeit Software 21 s).
- `tests/missions.py`: 4 Einsätze mit Verkehr, 12 Sterne, Spielstand nach Neuladen erhalten.
- `tests/refcmp.py`: 11 Fotovergleiche (Wikimedia Commons/Mapillary) → `shots/ref/`.
- Echte fps auf der GTX 1080: Version e nicht gemessen.

## Bekannte Grenzen
- Striche in den Himmel (Konturlinien): nur im Software-Rendering; Daten geprüft. Auf echter GPU prüfen.
- Fassaden nach Regeln, Erker fehlen.
- Street View per URL liefert nur Nutzer-Fotosphären; deshalb Commons-Fotos als Referenz.

## Nächste Pakete
1. Version h hochladen (Ordner `web-i`); fps (F3), Handy-Test und Sichtprüfung auf echter GPU
2. Altstadt: Ladengeschoss und Erker, bemalte Fassaden an bekannten Häusern (Weinmarkt, Hirschenplatz)
3. Option Agglomeration (Kriens, Horw, Emmenbrücke, Ebikon, Adligenswil): ~90 km² statt 6 km², braucht Kachel-Streaming; Schätzung 3–4 Arbeitstage, Etappe 1 Kriens+Horw
