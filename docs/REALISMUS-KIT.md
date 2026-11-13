# Luksi Rescue – Realismus-Kit (Aufgaben + Tests)

Ziel: Luzern so realistisch wie möglich nachbauen, im Comic-Stil. Jede Aussage «ist realistisch» muss sich durch einen Test belegen lassen.
Stand: 13.11.2026 (Version 13a) · Status: **[ERLEDIGT]** · **[IN ARBEIT]** · **[OFFEN]**
Priorität laut Simon (11.11.): Stadt Luzern bis Verkehrshaus detailgetreu vor weiteren Gebieten. 12.11. 23:14: «Realismus optisch steigern, Referenzen holen und nachbauen».

---

## 1. Referenzquellen (Wahrheit)

| Ebene | Referenz | Zugang | Genauigkeit |
|---|---|---|---|
| Gelände | swisstopo swissALTI3D (DTM, 2 m) | GeoTIFF-Kacheln data.geo.admin.ch (STAC) | ±0.5 m (Herstellerangabe) |
| Gebäude 3D | swisstopo swissBUILDINGS3D 3.0 (3D Tiles, Stand 20.05.2026) | 3d.geo.admin.ch/…/v1/20260520/11/x/y.b3dm | Dachhöhe ±0.2 m geprüft |
| Strassen, Wege, Wasser, Parks, Gleise, Namen, Bänke, Strände, Busrouten, Plätze, Fussgängerstreifen | OpenStreetMap (Overpass, nur overpass-api.de hat CORS) | im Browser abgefragt | Lage ±1–3 m (geschätzt) |
| Luftbild | swisstopo SWISSIMAGE (WMS) | wms.geo.admin.ch | 2 m im ganzen Feld; Kernzone 0.625 m (aus 0.25 m) |
| Farben (Wasser, Wiese) | SWISSIMAGE-Ausschnitt Kernzone | public/data/aerial_hr.jpg | Sichtvergleich |

Koordinaten: Spiel-Meter, Ursprung Kapellbrücke (47.0517 N / 8.3077 E), x = Ost, z = Süd, y = über Seespiegel 433.6 m.
Regionen: Luzern x −3800..2700, z −1100..6300 · Nord x −3800..4600, z −3900..−550 · Ost x 2500..7500, z −2000..2500 · West x −8500..−3600, z −1300..3000.

---

## 2. Aufgabenkatalog

| # | Aufgabe | Abnahme | Status |
|---|---|---|---|
| R1 | Gelände swissALTI3D 2 m | G1–G4, gdiff | [ERLEDIGT] + 13a: LOD-Fehler behoben (grobes Gitter lag ab 650 m von der Kapellbrücke überall, bis 7.5 m zu tief); gdiff 0 Abweichungen > 1.5 m |
| R2 | Echte Gebäude | G5 ≤ 2 % | [ERLEDIGT] Luzern 0.7 %, Ost 1.5 %, West 1.5 % |
| R3 | Strassen quer eben | G1–G3 | [ERLEDIGT] |
| R4 | Fluss/See sauber | G3, G3b | [ERLEDIGT] Ost: See flach auf Seespiegel |
| R5 | Einbahn im Navi | G7 | [ERLEDIGT] |
| R6 | Brücken | G8 ≤ 10 % | [ERLEDIGT] Luzern 7.65 %, Ost 0 %, West 6.4 % |
| R7 | Fassaden | Referenzvergleiche | [ERLEDIGT] + Kontaktschatten unten (0.78) |
| R8 | Dachfarben | G9 ≥ 95 % | [ERLEDIGT] |
| R9 | Schiffe, Stege | | [ERLEDIGT] |
| R10 | Wahrzeichen | G6 | [ERLEDIGT] |
| R11 | Strassenmöblierung | G10 ≥ 70 % | [ERLEDIGT] |
| R12 | Verkehr/Passanten | G11 = 0 | [ERLEDIGT] |
| R13 | Leistung | P1 ≤ 2.5 Mio., P2 (Schatten) ≤ 1 Mio. | [TEILWEISE] echte fps ungemessen |
| R21 | Himmel | Sicht | [ERLEDIGT 13a] Verlauf, Sonnenhof, Wolken, Abendfarben |
| R22 | Sonnenschatten | Sicht (mit/ohne-Vergleich) | [ERLEDIGT 13a] nur «Echt», ±140 m |
| R23 | Wasser | Sicht | [ERLEDIGT 13a] Farbe nach SWISSIMAGE, Wellen, Fresnel, Glitzern |
| R24 | Scharfes Luftbild Kernzone | Sicht (mit/ohne `&nohr`) | [ERLEDIGT 13a] |
| R25 | Plätze gepflastert | Sicht | [ERLEDIGT 13a] 32 OSM-Fussgängerflächen |
| R26 | Fussgängerstreifen gelb | Sicht | [ERLEDIGT 13a] 913 Luzern, 549 Nord, 96 Ost |
| R27 | Regionen Ost/West | qa je Region | [ERLEDIGT 13a] |
| R28 | Kantonsstrassen nach Norm | Sicht | [ERLEDIGT 13c] Fahrstreifen/Rad-/Busstreifen/Trottoirs aus OSM (lanes, cycleway, bus:lanes, sidewalk, maxspeed, turn:lanes); Markierung nach SN 640 850 (Leitlinie 3/6 innerorts, Rad-/Busstreifen gelb, Randlinien nur ausserorts; Quelle Normalien Stadt Bern 2.10); Haltelinien an Ampeln, Abbiegepfeile, Signal «Hauptstrasse», Leitpfosten, Bankett, Bushalte-Markierung |
| R29 | Bahnhofplatz/Europaplatz | Sicht | [ERLEDIGT 13c] Belag, Bus-Inseln, Wartehallen, Granit Europaplatz, Wagenbachbrunnen (OSM-Umriss), Torbogen Sandstein |
| R30 | LUKS | Sicht | [ERLEDIGT 13c] Haus 36 weisses Betonraster mit roten/orangen/gelben Faschen (Projektbeschrieb «Les Terrasses»), Haus 31 Sichtbeton mit Fensterbändern |

## 3. Testkit
`python3 tests/qa.py [url]`: G1–G13, G3b, P1, P2. `tests/gdiff.py [qs] ['x,z']`: sichtbarer Boden vs. Höhe. `tests/missions.py N [url]`, `tests/region.py`, `tests/region_ost.py`, `tests/region_west.py`, `tests/region_sued.py`, `tests/look_spots.py`, `tests/ui_check.py` (Pause-Menü, Funk auf kleinem Querformat).
Tests mit `&noshadow` für Missionsläufe (Software-Grafik ist sonst zu langsam; Logik unabhängig von Schatten).

## 6. Rest-Abweichungen
- Altstadt-Farben sind zufällig (nicht hausgenau); Fassadentextur wiederholt sich je Stockwerk.
- Ausserhalb der Kernzone zeigt der Luftbild-Boden Dächer/Schatten (2 m).
- Löwe kinderfreundlich schlafend; Verkehrshaus-Schaustücke erfunden; Rettungsposten Meggen/Littau erfunden.
- Signalisierte Fussgängerstreifen sind wie die übrigen gelb gezeichnet (Annahme).
- Leitlinie ausserorts 6 m / 12 m ist eine Annahme (Norm nicht im Volltext geprüft). Laternen an Kantonsstrassen ohne OSM-Laterne sind ergänzt (alle 32 m, Annahme).
- Fahrbahnbreite = Streifen × 3.1 m (+ 1.5 m je Velostreifen), nicht gemessen.
