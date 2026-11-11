# Luksi Rescue – Realismus-Kit (Aufgaben + Tests)

Ziel: Luzern so realistisch wie möglich nachbauen, im Comic-Stil. Jede Aussage «ist realistisch» muss sich durch einen Test belegen lassen.
Stand: 10.11.2026 · Status: **[ERLEDIGT]** · **[IN ARBEIT]** · **[OFFEN]**

---

## 1. Referenzquellen (Wahrheit)

| Ebene | Referenz | Zugang | Genauigkeit |
|---|---|---|---|
| Gelände | swisstopo swissALTI3D (DTM, 2 m) | api3.geo.admin.ch/rest/services/profile.json | ±0.5 m (Herstellerangabe, nicht selbst geprüft) |
| Gebäude 3D (Wände, Dächer, Höhen) | swisstopo swissBUILDINGS3D 3.0 (3D Tiles, Stand 20.05.2026) | 3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1 | Dachhöhe = DACH_MAX auf ±0.2 m geprüft (10'540 Gebäude) |
| Strassen, Wege, Einbahn, Wasser, Parks, Namen | OpenStreetMap (Overpass) | im Browser abgefragt | Lage ±1–3 m (geschätzt) |
| Aussehen Fassaden/Dächer | Google Street View, Fotos | manuell/Browser | qualitativ |
| Luftbild | swisstopo SWISSIMAGE | wms.geo.admin.ch | 10 cm |

Koordinaten: Spiel-Meter, Ursprung Kapellbrücke (47.0517 N / 8.3077 E), x = Ost, z = Süd, y = über Seespiegel 433.6 m.
**Lehre aus Fehler 10.11.:** Für swisstopo-Abfragen jeden Punkt exakt nach LV95 umrechnen (Meridiankonvergenz ≈ 0.6°). Eine lineare Näherung erzeugt bis 16 m Lagefehler.

---

## 2. Aufgabenkatalog

| # | Aufgabe | Abnahme (messbar) | Status |
|---|---|---|---|
| R1 | Gelände aus swissALTI3D, 2-m-Raster | Testkit G1–G4 grün; max. Netzfehler ≤ 0.3 m | [ERLEDIGT] 2-m-Raster, exakte LV95-Umrechnung, Bodennetz vereinfacht (472k Dreiecke, max. 0.3 m) |
| R2 | Echte Gebäude (swissBUILDINGS3D) statt Extrusion | G5: Wandfuss-Spalt > 1.5 m bei ≤ 2 % der Gebäude; Dachhöhe ±0.3 m | [ERLEDIGT] 4'222 Gebäude, 0.8 % Spalt > 1.5 m, Dachhöhe ±0.2 m |
| R3 | Strassen quer eben, Boden nie über Strassen/Wasser | G1, G2, G3 = 0 % Verstösse | [ERLEDIGT] (Vorverarbeitung) |
| R4 | Fluss/See: Wasser im Bett, Ufer sauber | G3 grün + Kontaktbogen «Reuss von oben» ohne Befund | [ERLEDIGT] Sichtprüfung 10.11. abends: Reuss unterhalb Nadelwehr war grün überdeckt (Umlandfläche über Wasser unter Seespiegel) → behoben, jetzt durchgehend Wasser |
| R5 | Einbahnstrassen im Navi | Erreichbarkeit G7 grün | [ERLEDIGT] |
| R6 | Brücken mit Deckhöhe (Seebrücke, Kapell-, Spreuerbrücke) | G8: ≤ 10 % der Brücken weichen > 1 m von der Linie zwischen den Brückenköpfen ab | [ERLEDIGT] gemessen: 7 von 74 (9.5 %), u. a. Spreuerbrücke 2.7 m, Kapellbrücke 1.3 m (Holzbrücken leicht gewölbt) – knapp grün |
| R7 | Fassaden nach Referenzbildern | pro Quartier ≥ 3 Vergleiche Referenzfoto ↔ Spielbild am selben Ort | [ERLEDIGT] 11 Vergleiche (Altstadt 3, Neustadt 3, Quai 3, Wohnquartier 2) mit Wikimedia-Commons-/Mapillary-Fotos (Street View liefert per URL nur Nutzer-Fotosphären, Bild-API abgeschaltet). Umgesetzt: Fensterläden Altstadt, Flachdach → Nachkriegsbau, graues Pflaster. Rest-Abweichungen siehe Abschnitt 6 |
| R8 | Dachfarben/-materialien nach Luftbild | G9: ≥ 95 % der Gebäude mit Dachfarbe aus SWISSIMAGE | [ERLEDIGT] 100 %: 2 Messpunkte je Dach (5×5-Median, 0.5 m/px), helleres gewählt (Schatten), comic-quantisiert; warm → Ziegel, grau → Schiefer, grün auf Steildach = Baumkrone → Standardziegel |
| R9 | Schiffe, Stege, Seebad als eigene Objekte | «Wilhelm Tell» als Raddampfer, Stege als Plattformen | [ERLEDIGT] 67 Stege aus OSM (Holz/Stein, schwimmend tiefer) |
| R10 | Wahrzeichen sofort erkennbar | G6 grün + Kontaktbogen | [ERLEDIGT] durch echte 3D-Gebäude |
| R11 | Strassenmöblierung: Laternen, Bäume an Alleen, Ampeln | G10: ≥ 70 % der OSM-Laternen/Ampeln gesetzt | [ERLEDIGT] 99 % (Masten auf der breit gezeichneten Fahrbahn an den Rand verschoben), 1'642 OSM-Bäume, 29 Brunnen, Bushaltestellen |
| R12 | Verkehr und Passanten realistisch (Fahrtrichtung, rechts fahren) | G11: 0 Autos auf falscher Kante oder in Hauswand | [ERLEDIGT] 36 Autos (rechts, Einbahn, Blaulicht-Platz), 60 Passanten (hüpfen aus dem Weg, Mindestabstand 1.9 m erzwungen) |
| R13 | Leistung | P1: ≤ 2.5 Mio. Dreiecke, ≥ 60 fps auf GTX 1080 bei 1080p | [TEILWEISE] P1 grün (2.14 Mio., 163 Draw Calls). Echte fps nicht gemessen: Browser-Pane war beim Test versteckt. Simon: F3 im Spiel |
| R14 | Horizont mit echten Bergen | Pilatus/Rigi-Silhouette aus Höhendaten | [ERLEDIGT] swissALTI3D 200 m, 42 × 42 km, eigene Fernszene ohne Nebel; Spielfeldrand weich ins Umland überblendet |

---

## 3. Testkit

### Stufe 1 – Geometrie (automatisch, jede Version)
`python3 tests/qa.py` → `shots/qa/report.json`

| ID | Prüfung | Grenzwert |
|---|---|---|
| G1 | Asphalt-Vertices über sichtbarem Boden | ≤ 0.5 % darunter |
| G2 | Pflaster/Wege über Boden | ≤ 0.5 % |
| G3 | Wasserfläche über Boden | ≤ 0.5 % |
| G4 | Fahrhöhe (Auto) nie unter sichtbarem Boden (alle Navi-Knoten) | ≤ 0.5 % |
| G5 | Gebäude: Wandfuss über Gelände (Spalt > 1.5 m) | ≤ 2 % der Gebäude |
| G6 | Wahrzeichen vorhanden (8 Namen) | 8/8 |
| G7 | Einsätze in beide Richtungen erreichbar (Einbahn beachtet) | alle |
| G8 | Brückendeck ±1 m zur Uferlinie | ≤ 10 % der Brücken |
| G9 | Dachfarbe aus SWISSIMAGE | ≥ 95 % |
| G10 | Laternen + Ampeln aus OSM gesetzt | ≥ 70 % |
| G11 | Verkehr: falsche Kante / in Wand | 0 |
| P1 | Dreiecke / Draw Calls | ≤ 2.5 Mio. |

### Stufe 2 – Bilder-Rundgang (automatisch, Sichtprüfung)
Gleicher Lauf erzeugt `shots/qa/kontaktbogen.png` mit 12 festen Kamerapunkten (Kapellbrücke, Schwanenplatz, Seebrücke, Bahnhof/KKL, Inseli, Jesuitenkirche, Spreuerbrücke, Weinmarkt, Musegg, Gütsch, Kinderspital, Reuss von oben).
Prüfung durch einen unabhängigen Sub-Agenten auf: schwebende Objekte, Löcher, Z-Fighting, Boden über Strassen, falscher Massstab, Linien-Artefakte.

### Stufe 3 – Referenzvergleich (halbautomatisch)
1. **Luftbild:** gleiche Kachel aus SWISSIMAGE und Spiel-Draufsicht nebeneinander; Wasser- und Dachflächen per Farbklasse vergleichen (IoU ≥ 0.85 Ziel).
2. **Strassenniveau:** `python3 tests/refcmp.py` – Referenzfotos (Wikimedia Commons, `shots/ref/quellen.json` mit Lizenz) neben 4-Richtungs-Spielbild am selben Ort. Früher geplant: Street View an denselben 12 Punkten (Blickrichtung notiert) neben Spielbild; Abweichungen als Aufgaben in Todoist.
3. **Kindertest (nur Simon):** «Erkennst du, wo wir sind?» an 5 Orten – nur notieren, wenn Simon es meldet.

---

## 4. Letzter Testlauf
Version 2026-11-10e: G1–G11 und P1 grün (G5 0.8 %, G8 9.5 %, G9 100 %, G10 99 %, P1 2.14 Mio. Dreiecke, 163 Draw Calls). Ladezeit im Software-Browser 21 s.
Missionstest: 4 Einsätze mit Verkehr und Passanten, 12 Sterne, Spielstand nach Neuladen erhalten, 0 Fehler.
Offen: Striche in den Himmel – Konturlinien, nur im Software-Rendering beobachtet; Daten geprüft (keine Kante länger als das Gebäude). Annahme: Clipping-Fehler von SwiftShader, auf echter GPU zu prüfen.

## 5. Ablauf je Version
1. Daten-Pipeline (`tools/geo/*`) → `public/data/*`
2. `npx vite build`
3. `python3 tests/qa.py` (Stufe 1+2) und `python3 tests/missions.py` (Spiellogik)
4. Befunde → Aufgaben oben, erst bei grünem Stand ZIP bauen

## 6. Rest-Abweichungen aus dem Fotovergleich (R7)
- Altstadt: echte Fassaden stärker bemalt, mit Erkern, Türmchen und Ladengeschoss mit Schaufenstern; im Spiel Fenster pro Geschoss gleich (Textur wiederholt sich pro Stockwerk).
- Neustadt/Quai: Mischung Gründerzeit/Nachkrieg jetzt über Flachdach-Regel; Balkone und Markisen fehlen.
- Wohnquartiere: Wesemlin real moderne Wohnblöcke, im Spiel teils Altbau-Fensterläden.
- Bodenflächen: in Software-Bildern noch hell; auf echter GPU prüfen.
