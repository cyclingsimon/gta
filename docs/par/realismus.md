# P-A «Realismus-Bausteine» – Arbeitsprotokoll

Branch `par/realismus`, Worktree `/home/claude/wt-pa`. Dateihoheit: `src/vehicle.ts` (nur Aussehen), `src/bus.ts` (nur Aussehen), `src/real/*`, `tests/par/real_*`, `docs/par/realismus.md`.

---

## 15.11.2026 10:55 – Lauf 7

### Gemacht
**Züge** – `src/real/rail.ts`: Wagenkästen mit gleicher Konvention wie `trainCarGeo()` in fun.ts (Mitte im Ursprung, Längsachse z, Fahrtrichtung +z, Unterkante y = 0.5, Länge `carL` 24 m SBB / 19 m zb). Mittelwagen und Endwagen mit Führerstand (schräge Front, dunkle Scheibe, Scheinwerfer leuchten nachts über `aGlow`), Fensterband, Zierlinie, Doppeltüren, Dachaufbau. Ein Material (`realMaterial`) für alle Züge.
| Typ | Strecke (`trainTypeFor`) | Mittelwagen | Endwagen | Farben |
|---|---|---|---|---|
| FLIRT (SBB) | S-Bahn Littau, S-Bahn Emmenbrücke | 72 | 98 | weiss, rote Zierlinie/Türen/Front [Annahme] |
| Doppelstock (SBB) | IR Richtung Zürich | 88 | 114 | weiss, 2 Fensterbänder, rot unten [Annahme] |
| Zentralbahn | Zentralbahn Luzern–Horw (kind `zb`) | 72 | 98 | weiss-rot, schmaler 2.65 m [Annahme] |
| Traverso (SOB) | S-Bahn Küssnacht (Voralpen-Express Luzern–Arth-Goldau) | 72 | 98 | **kupfer/rot, schwarze Fensterrahmen, graue Türen (belegt)** |
Budget ≤ 120 je Wagen eingehalten. Die Traverso-Zuordnung zur Küssnachter Strecke ist eine Annahme (Vertrauen hoch, dass der VAE dort fährt; im Spiel fährt auf der Linie nur ein Zug).

**Schiffe/Boote** – `src/real/ships.ts`, gleiche Konvention wie `steamship()` in world.ts (Umriss → Rechteck-Einpassung, innere Gruppe mit lokaler x-Achse = Längsachse, Bug +x, y = 0 Wasserlinie) bzw. wie die Boote in fun.ts (Längsachse z):
| Baustein | Dreiecke | Budget |
|---|---|---|
| Raddampfer (weisser Rumpf, dunkle Wasserlinie, goldene Zierlinie, Radkästen, 2 Salondecks, Sonnendeck mit Reling, schräger Schornstein, Masten) | 304 | ≤ 400 |
| Motorschiff (Vorbild MS Diamant: kantige Decks mit grossen Glasbändern, Steuerhaus) | 152 | ≤ 300 |
| Ruderboot / Segelboot (Mast ohne Segel) / Pedalo | 44 / 52 / 48 | ≤ 60 |
Je Schiff 1 Netz + 1 Konturnetz (wie die bisherigen Outlines). Keine Namen/Logos.

### Belege
- FLIRT als S-Bahn u. a. im Kanton Luzern, Länge 75–105 m: https://www.sbb.ch/de/reiseinformationen/services-im-zug/unsere-zuege/flirt.html (Farben dort nicht beschrieben → Annahme).
- Voralpen-Express = Traverso RABe 526, «copper and red livery (with black window frames and grey doors)»: https://en.wikipedia.org/wiki/Voralpen_Express ; «Die neuen achtteiligen Züge sind kupferfarben»: https://www.sob.ch/fileadmin/images/medienmitteilungen/2018/06.06.2018_Roll-out_Voralpen-Express.pdf
- Zentralbahn-Flotte (ADLER, FINK, SPATZ; keine Farbangaben): https://www.zentralbahn.ch/en/get-to-know-us/friends-of-zentralbahn/rolling-stock
- SGV: fünf historische Raddampfer (Uri 1901, Unterwalden 1902, Schiller 1906, Gallia 1913, Stadt Luzern 1928) und 16 Motorschiffe: https://en.wikipedia.org/wiki/Lake_Lucerne_Navigation_Company
- MS Diamant: 63.5 m × 13.3 m, fünf Decks, 2017: https://www.shiptec.ch/en/references/ms-diamant
- Unbelegt (Annahme): Farbaufteilung FLIRT/Doppelstock/Zentralbahn, Schornsteinfarbe (gelblich mit schwarzem Kopf, wie bisher), Wasserlinie, Bootsformen.

### Einbau-Hinweise (je eine Zeile, Rückfall `REAL.trains` / `REAL.ships` bzw. `?real=0`)
- **E9** – src/fun.ts, Klasse `Trains`, Konstruktor, Z. 305 `for (let k = 0; k < n; k++) { const b = new THREE.Mesh(geo, m[0]); … }`: `new THREE.Mesh(geo, m[0])` → `(realTrainCar(line.kind, line.name, carL, k, n) ?? new THREE.Mesh(geo, m[0]))`; Import `import { realTrainCar } from './real/rail';`. Wagen 0 = Spitze (+z ist dort die Fahrtrichtung, wie `update()` dreht), letzter Wagen Führerstand hinten. Dreiecke je Zug: SBB 4 Wagen 340–404, zb 3 Wagen 268 (vorher 12 je Wagen); Material: 1 für alle Züge (vorher je Art 1).
- **E10a** – src/world.ts, Block `if (s.kind === 'ship')`, Z. 1199: `G.add(steamship(s.b.p));` → `G.add(realSteamship(s.b.p) ?? steamship(s.b.p));`; Import `import { realSteamship } from './real/ships';`.
- **E10b** – src/fun.ts, Klasse `Ships`, Z. 210: `const obj = steamship([[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]);` → `const obj = realKursschiff(i, [[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]) ?? steamship([[-31, -6.5], [31, -6.5], [31, 6.5], [-31, 6.5]]);` (gerade Route Raddampfer, ungerade Motorschiff); Import `import { realKursschiff, realBoat } from './real/ships';`.
- **E10c** – src/fun.ts, Klasse `Boats`, Z. 250: `const o = new THREE.Mesh(mergeGeometries(parts, false)!, boatMat);` → `const o = realBoat(i, c) ?? new THREE.Mesh(mergeGeometries(parts, false)!, boatMat);` (Pedalo/Ruderboot/Pedalo/Segelboot im Wechsel, Rumpf in Farbe `c`). **Hinweis:** die bisherigen Boote haben zwei Köpfe als Insassen; die neuen Boote sind leer (Dreiecksbudget ≤ 60).

### Geprüft / ungeprüft
Geprüft: `tsc` fehlerfrei (nach Merge 900aa72); Build `OUT=dist_pa` läuft durch; Testszene ohne JS-Fehler; `real_shots.py` «BUDGET je Baustein: OK» (neu: je Zugtyp Mittel-/Endwagen ≤ 120, Dampfer ≤ 400, Motorschiff ≤ 300, Boote ≤ 60). Screenshots `zug`, `zug2`, `schiff`, `boote` selbst angeschaut: Führerstände mit Scheibe und Lichtern, Traverso kupfer, Doppelstock mit zwei Fensterbändern; Dampfer mit Bug vorne, rundem Heck, nach hinten geneigtem Schornstein, Radkästen; Motorschiff kantig mit Glasbändern; Boote erkennbar.
Ungeprüft: echtes Spiel (Fahrt, Tunnel, Anlegen), Anblick aus der Spielkamera; die Bugspitze des Ruderboots wirkt in der Nahansicht etwas schief (4-eckiger Kegel).

---

## 15.11.2026 09:55 – Lauf 6

### Gemacht
1. **Bäume in Zellen** (`src/real/trees.ts`): `buildRealTrees` backt die Sparform 'min' jetzt mit `buildTreeCells` in **500-m-Zellen fest zusammen – EIN Mesh je Zelle (alle Arten)** mit eigener Bounding-Sphere → Frustum-Culling greift; leere Zellen entstehen nicht. Farbe je Baum (treeTint) eingebacken; Speicher sparsam (Position Float32, Normale Int8, Farbe Uint8 ≈ 18 Byte je Ecke). Rückgabe weiterhin EINE Gruppe («baeume-zellen»), Einbauzeile E1 unverändert. 'alt'/'lite'/'full' unverändert. Neue Hilfsfunktion `realTreeList` (Arten-Zuordnung, auch für Tests).
   Bewusst **ein Mesh je Zelle statt je Zelle und Art**: mit 7 Arten × sichtbare Zellen wären es in einer Stadtansicht 50+ Aufrufe geworden (Budget +20).
2. **Nahform (volle Baumform < 120 m) – weggelassen.** Begründung: Ohne Änderung an world.ts/main.ts ginge es nur über `onBeforeRender` eines Pool-Netzes. Das (a) läuft auch im Schattendurchgang und bei geteiltem Bildschirm mit wechselnden Kameras (Pool würde zwischen Spielern hin- und herspringen), (b) wirkt erst ein Bild später, (c) zeichnet die nahen Bäume doppelt, weil die gebackene Sparform einzelne Bäume nicht ausblenden kann – die eckigere Sparform sticht dabei durch die volle Form (4-eckiger Stamm in 6-eckigem). Sauber wäre ein Kamera-Hook in main.ts (Hauptsitzung) – nicht gebaut.
3. **Arten nach Lage geschärft** (`pickSpecies`, `ctxFromMask`):
   - Nadelbäume ohne OSM-Kennung nur noch oberhalb y > 270 (≈ 700 m ü. M.) oder im Wald; unten in Parks/Gärten nur Laubbäume.
   - Obstbäume nur noch bei props-Kennung Obstgarten (trees[i][3] = 2); Baumreihen (3) werden Alleebäume (Linde 50 %, Platane 25 %, Rosskastanie 20 %, Buche 5 %).
   - Quais (Wasser in ≤ 15 m UND Strasse/Baumreihe): Rosskastanie 45 %, Linde 30 %, Platane 25 %; Ufer ohne Strasse: Platane 45 %, Rosskastanie 30 %, Linde 25 %.
   - Plätze (Strassen-/Platzzellen in ≥ 6 von 8 Richtungen): Rosskastanie 60 %, Linde 25 %, Platane 15 % [Annahme].
   - Belege: Nationalquai «zwei Reihen Kastanienbäume» (https://www.alpen-guide.de/reisefuehrer/poi/nationalquai-luzern, Vertrauen mittel – Reiseführer); Inseli «im Schatten der grossen Platanen», Helvetiagärtli «mit seinen Kastanienbäumen» (Stadt Luzern, https://www.stadtluzern.ch/_doc/4878700); Linde am Schweizerhofquai (Titel «Sanierungskonzept Linde Schweizerhofquai», https://www.stadtluzern.ch/_docn/3030089/Sanierungskonzept_Linde_Schweizerhofquai_210110.pdf – nur Titel gesehen). Ein öffentlicher Baumkataster der Stadt Luzern wurde nicht gefunden → Gewichte bleiben Annahme, die Stichproben stützen sie.
4. **Tests**: neue Seite `tests/par/real_baeume.html/.ts` + `tests/par/real_baeume.py` (3500 Bäume auf 4 × 4 km, Strassen- und Hochansicht, Vergleich alt / instanziert (Stand Lauf 3–5) / Zellen); `real_shots.py` zählt gebackene Bäume jetzt mit (vorher wären 0 Dreiecke gezählt worden) und prüft > 0.

### Zahlen (Testseite, Software-Rendering, nach Frustum-Culling, inkl. 1 Aufruf Boden)
| Ansicht | alt (Kugelbäume) | instanziert 'min' (Lauf 3–5) | **Zellen (Lauf 6)** |
|---|---|---|---|
| Strasse (Kamera 3 m hoch) | 154 002 Dr. / 3 Aufrufe | 159 166 / 7 | **44 310 / 24** |
| Hochansicht (120 m) | 154 002 / 3 | 159 166 / 7 | **55 596 / 26** |
Gegenüber Lauf 3–5: **−115 000 bzw. −104 000 Dreiecke, +17 bzw. +19 Aufrufe** (Budget +20). Gesamtzahl aller Bäume (3500) 154 875 (Artenmix verschoben). Bauzeit 3500 Bäume: 134–148 ms statt 30–58 ms (einmalig beim Laden).
`real_baeume.py` → «BAEUME ZELLEN OK», `real_shots.py` → «BUDGET je Baustein: OK».

### Geprüft / ungeprüft
Geprüft: `tsc` fehlerfrei (nach Merge 011f00f); Build `OUT=dist_pa` läuft durch; beide Testskripte ohne JS-Fehler; Sichtvergleich Zellen vs. instanziert: gleiches Bild.
Ungeprüft: echtes Spiel (P1-Wirkung, Speicher, Ladezeit mit 4793 Luzern-Bäumen), Schatten der gebackenen Zellen.

---

## 15.11.2026 01:40 – Lauf 5

Rettungswagen-Feinschliff nach den 3 Fotos von Simon (Abweichungsliste aus Lauf 4), nur `src/vehicle.ts` (`buildLuksRtw`):
1. **Lichtbalken** über der Frontscheibe jetzt durchgehend blau (eigenes, nicht blinkendes Grundnetz, Material in die Material-Zusammenfassung aufgenommen); die zwei blinkenden Felder sitzen darin (breiter, 0.7 m). `lights` weiterhin 8 Stück in gleicher Reihenfolge (nur Lage/Grösse der ersten zwei angepasst).
2. **Kofferbug** mit zwei Fasen-Segmenten (Profil extrudiert statt Kasten); **Haube** rot bis knapp unter die Scheibe, Spiegelschrift «Ambulance» im schmalen weissen Streifen darüber (wie KKL-Foto); **Grill** mit silbernem Rahmen, ohne Markenstern.
3. **Heck-Bogen** auf beiden Seiten als roter Bogenstreifen (Dachkante hinten → Gürtelband) statt gefüllter Fläche.
4. **Lesbarkeit Heck**: Schriftband 0.30 m hoch (vorher 0.22) mit 56-px-Schrift (vorher 38), «144» 104 px (vorher 80), Fenster etwas niedriger, damit die «144» zwischen Fenster und Band Platz hat.

### Geprüft / ungeprüft
Geprüft: `tsc` fehlerfrei (nach Merge 050fce1); Build `OUT=dist_pa` läuft durch; Testszene ohne JS-Fehler; `real_shots.py` «BUDGET je Baustein: OK». Fahrzeug **890 Dreiecke** (Budget ≤ 1000; vorher 852), Beschriftung weiterhin 1 Zeichenaufruf, +1 Aufruf für den blauen Balken.
Spielkamera-Ansicht von hinten (neue Ansichten `cam8` = 8.5 m hinter dem Fahrzeug, 3.6 m hoch; `cam12` = 12.5 m, 4.4 m hoch) in **960×540** und **800×380** (`SIZE=800x380 python3 tests/par/real_shots.py cam8,cam12`): «Ambulance» und «144» sind in beiden Grössen lesbar; bei 800×380 / 12.5 m klein, aber eindeutig. Sichtvergleich vorne rechts / rechte Seite gegen die Fotos: Balken, Haube, Grill, Bogen stimmen jetzt besser.
Ungeprüft: echtes Spiel (Kamera dort nicht exakt nachgestellt, Werte geschätzt), Nachtansicht des blauen Balkens.
Offen (klein): die blauen Heck-Eckleuchten überdecken die Ecken des Schriftbands; die roten Heck-Bögen berühren die Rückleuchten.

---

## 14.11.2026 22:55 – Lauf 4

### Gemacht
**Rettungswagen nach Fotos** – Referenz: **3 Fotos von Simon, 14.11.2026** (schräg vorne rechts; schräg hinten links «Baby Ambulance»; vorne vor dem KKL). Fotos nicht im Repo. Umgesetzt im Canvas-Atlas von `buildLuksRtw()` (weiterhin 1 Zeichenaufruf für alle Beschriftungen):
- Grundfarbe weiss; **kein Battenberg, keine gelben Flächen, keine Warnwinkel** mehr (Lauf-1-Annahme war falsch und ist entfernt).
- Rot-oranges Gürtelband `#E8472B` rundum (Koffer, Kabinentüren, Heck) auf gleicher Höhe (0.45–0.82 m über Koffer-Unterkante = unter den Fenstern), darin blauer Streifen `#1F5FAE`.
- Rote Dachkontur; an der Koffer-Vorderkante schwingt ein roter Bogen vom Band zur Dachkante; an der Hinterkante roter Keil/Bogen von der Dachkante bis ins Band.
- Blaues, schräg geschnittenes Schriftband «Ambulance» oben an beiden Seitenwänden (rechts hinten, links vorne – wie auf den Fotos) und oben am Heck; blaue «144» gross an der Seite und auf der rechten Hecktür.
- Star of Life (sechsarmig, blau, ohne Äskulapstab) auf beiden Kabinentüren und oben mittig auf der Frontscheibe (neue Atlasfläche, schräg auf der Scheibe).
- Motorhaube: hinten weiss mit blauer Spiegelschrift «Ambulance», vorne rot; Haubenvorderkante rot mit blauer Unterkante (neue Atlasflächen «hood», «nose»).
- Dunkle Fenster statt Milchglas (2 je Seite, 2 in den Hecktüren); Seitentür rechts; Klappe links hinten.
- Geometrie nur wo nötig: Frontstossfänger weiss (war dunkel), Heck-Trittstufe schwarz (neu), Rückleuchten unten statt hoch. Lichtbalken, Grill-Blitzer und Heck-Eckleuchten waren schon an den richtigen Stellen.
- Unverändert: Schnittstelle, Physik, Hitbox, `vcap`, Anzahl und Reihenfolge der 8 `lights`.
- Bewusst nicht übernommen: «BABY», Teddybär-Grafik, LUKS-Logo, Mercedes-Stern, Kontrollschild.

**Kleinmöbel** (Nebenaufgabe) – neue Datei `src/real/street.ts`, Schalter `REAL.street`:
| Art | Dreiecke (Budget ≤ 32) |
|---|---|
| Abfallkübel (grau, Rundkübel am Pfosten) | 23 |
| Robidog (grün) | 20 |
| Post-Briefkasten (gelb, ohne Logo) | 20 |
| Hydrant (rot) | 18 |
Ein InstancedMesh je Art über `realMaterial()` (≤ 4 Zeichenaufrufe ohne Zellteilung). `buildStreetFurniture(props, roads, mask, groundY, budget = 25000)` leitet Standorte her **[Annahme, Vertrauen niedrig–mittel – keine OSM-Standorte in props.json]**: Kübel an jeder Haltestelle und an jeder 8. Bank, Robidog an `path` alle ~1000 m, Hydrant an `residential`/`living_street` alle ~400 m, Briefkasten an ~15 % der Haltestellen im Ortskern (Box x −900..600, z −500..900). Grobe Obergrenze Luzern ohne Maskenfilter: ~470 Kübel, ~160 Robidog, ~450 Hydranten, ~20 Briefkästen ≈ 22 600 Dreiecke; zusätzlich **harter Deckel** (Listen gleichmässig ausdünnen) – Test: 24 839 bei Deckel 25 000, 4 969 bei Deckel 5 000.

### Geprüft / ungeprüft
Geprüft: `tsc` fehlerfrei (nach Merge c65fe23); Build `OUT=dist_pa` läuft durch; Testszene ohne JS-Fehler; `real_shots.py` «BUDGET je Baustein: OK» (inkl. neuer Kleinmöbel- und Deckel-Prüfung). Screenshots (`ambFR` vorne rechts, `ambHL` hinten links, `ambR` rechte Seite, `ambF` vorne) neben die Fotos gehalten.
**Ehrliche Beurteilung gegen die Fotos:** Farbschema, Band mit blauem Streifen, Schriftband, «144», Star of Life, rote Haube mit Spiegelschrift, dunkle Fenster und weisser Stossfänger stimmen jetzt sichtbar mit den Fotos überein. Abweichungen: (1) der rote Heck-Keil ist auf der rechten Seite eher zu gross/flächig – Foto «vorne rechts» zeigt dort eher einen Bogen; (2) die Rundung des Alkovens/Kofferbugs ist auf den Fotos weicher (Modell kantig); (3) Lichtbalken im Modell schwarz mit 2 blauen Feldern statt durchgehend blau (Anzahl `lights` muss gleich bleiben); (4) Grill ohne silbernen Rahmen mit blauer Linie; (5) die rote Haubenfläche reicht auf dem KKL-Foto weiter nach oben als im Modell. Vertrauen: hoch für Farben und Elemente, mittel für genaue Lage/Grösse der Bögen.
Ungeprüft: echtes Spiel (kein Weltlauf), Lesbarkeit der Schrift in Fahrtdistanz, Kleinmöbel-Standorte mit echter Maske.

### Einbau
- Rettungswagen: kein Einbau nötig (wirkt sofort nach Merge).
- **E8** (Kleinmöbel), world.ts `buildWorld` direkt nach E6:
  `group.add(...buildStreetFurniture(props, d.roads, mask, (x, z) => terrain.height(x, z)));` mit `import { buildStreetFurniture } from './real/street';` – Erwartung ≤ 25 000 Dreiecke für ganz Luzern, ≤ 4 Netze (InstancedMesh, nicht in Zellen geteilt → immer gezeichnet; falls zu teuer: `budget` auf 12 000 setzen oder die Netze mit `chunkInstanced(im, 1000)` teilen).

### Offen
- Heck-Keil rechts als Bogen statt Fläche; weichere Alkovenrundung; Grill-Rahmen.
- Kleinmöbel-Standorte aus OSM (Daten-Pipeline) statt hergeleitet.

---

## 14.11.2026 21:30 – Lauf 3

Anlass: nach Einbau Lauf 2 Startansicht 2.475 Mio. Dreiecke / 852 Aufrufe (Budget 2.5 Mio.). Ziel: neue Bausteine ≤ +30 000 Dreiecke und ≤ +25 Zeichenaufrufe gegenüber `?real=0`.

### Gemacht
- **Neue Datei `src/real/spar.ts`**: Sparformen + EIN gemeinsames Material `realMaterial()` (Vertex-Farben; Attribut `aGlow` = Leuchtteil, Nachtlicht über `NIGHT.value`; Attribut `aTint` = nur Lackflächen nehmen die Instanzfarbe an). Leuchtteile liegen im selben Netz → 1 Zeichenaufruf je Bausteinart (vorher Körper + Licht = 2).
- `buildLamps`: alle Laternen (auch die gewöhnlichen) als Sparform, je Art 1 InstancedMesh; `REAL.lamps = false` → unverändert alter Code.
- `buildStops`: Wartehalle als Sparform (108), Licht im selben Netz.
- `realBenchGeometry()`: Sparform-Bank (48).
- `realCarMeshes`: je Autotyp EIN Netz (Sparform 88, Lack über `aTint`), «cabin» ist jetzt ein leerer Stellvertreter → 4 statt 8 Zeichenaufrufe. Schnittstelle zu traffic.ts unverändert (keine Änderung am Einbau E5 nötig).
- `buildParkedCars`: Sparform, **fest gebacken in 500-m-Zellen** (1 Zeichenaufruf je sichtbare Zelle statt 8 InstancedMeshes); nur noch `residential`/`living_street`; mindestens 14 m Abstand zu allen Strassen-Endpunkten (Einmündungen, exakte Distanz statt Raster); Platzierung rein über Hash der Lage, Strassenreihenfolge per Hash gemischt (gleichmässig statt «erste Strassen der Liste») → deterministisch. Rückgabetyp jetzt `THREE.Object3D[]` (Einbau-Zeile E6 unverändert gültig).
- `buildParkedVelos`: Ständer (108) + Velos (112) gebacken in 500-m-Zellen.
- Volle Formen aus Lauf 1/2 (`furniture.ts`, `carGeometry`) bleiben für Nahansichten erhalten, werden von den Einbau-Funktionen aber nicht mehr benutzt.

### Dreiecke je Baustein (alt = `?real=0`, gemessen an der Geometrie)
| Baustein | alt | Lauf 2 | **Lauf 3** | Budget |
|---|---|---|---|---|
| gewöhnliche Laterne | 32 | 32 (alt) | **20** | – |
| moderne Leuchte (Hauptstrasse) | 32 | 68 (+Licht-Netz) | **20** | ≤ 28 |
| Altstadt-Kandelaber | 32 | 132 (+Licht-Netz) | **38** | ≤ 48 |
| Wartehalle (statt Schild) | 28 | 200 | **108** | ≤ 120 |
| Bank | 36 | 108 | **48** | ≤ 60 |
| geparktes Auto | – | 400–424 | **86–88** | ≤ 180 |
| Verkehrsauto | 24 | 400–424 | **86–88** | ≤ 260 |
| Veloständer / Velo | – | 180 / 364 | **108 / 112** | – |
| Baum (3500 Stück) | 154 000 | 150 208 (min) | 150 208 (min, unverändert) | ≤ 180 000 |

### Stadt-Vergleich in der Testszene (gezählt, nicht gemessen im Spiel)
Synthetischer dichter Ausschnitt: 300 Laternen (100 Altstadt, 100 Hauptstrasse, 100 übrige), 40 Haltestellen, 30 Bänke, 36 Verkehrsautos, Wohnstrassen-Raster mit max. 100 geparkten Autos, 7 Veloständer, 500 Bäume.
| | Dreiecke | Netze (≈ Zeichenaufrufe ohne Zellteilung) |
|---|---|---|
| `?real=0` | 34 664 | 8 |
| Lauf 3 | 49 466 | 19 |
| **Differenz** | **+14 802** (Budget ≤ +30 000) | **+11** (Budget ≤ +25) |
Grösster Posten der Differenz sind die geparkten Autos (8 876, gebacken) und die Wartehallen. Im Spiel kommen durch `chunkInstanced` (1000-m-Zellen) bei Laternen/Hallen je sichtbarer Zelle Aufrufe hinzu – dort sind es jetzt 3 Laternennetze statt 2 (alt: Mast + Kopf) und 2 Haltestellennetze statt 1.
**Schätzung Startansicht** (ungeprüft): Laternen werden günstiger (32 → 20 für die Mehrheit), Autos/Hallen/Bänke deutlich günstiger als Lauf 2 → gegenüber 2.475 Mio. erwarte ich klar unter 2.40 Mio.; die Hauptsitzung bitte mit `qa.py` P1 nachmessen.

### Geprüft / ungeprüft
Geprüft: `tsc` fehlerfrei (nach Merge 5c37a6a); Build `OUT=dist_pa` läuft durch; Testszene ohne JS-Fehler; `real_shots.py` → «BUDGET je Baustein: OK» (neue Prüfung je Baustein + Stadt-Delta Dreiecke/Netze + 3500 Bäume); Sichtprüfung: Wartehallen nachts leuchtend (Vitrine), Laternen nachts leuchtend, Sparautos auf der Strasse und geparkt.
Ungeprüft: echtes Spiel (kein Weltlauf laut Auftrag), insbesondere P1/P2 aus `qa.py`, Speicher der gebackenen Zellen (100 Autos ≈ 26 000 Ecken – gering), Aussehen der Sparautos aus der Fahrerperspektive (Räder als durchgehende Achs-Walze, keine Radkästen).

### Einbau
Keine neue Zeile nötig: E1–E7 aus Lauf 2 gelten unverändert (gleiche Funktionsnamen und Parameter). Nach dem Merge von `par/realismus` neu bauen; `?real=0` bleibt der Rückfall.

### Offen / nächster Lauf
- Fotos LUKS-RTW / ZVB / AAGR / ARAG (unverändert offen).
- Nahansicht: volle Autoform nur für die nächsten ~6 Verkehrsautos (LOD) – erst, wenn das Budget wieder Luft hat.
- Bäume in Zellen teilen (heute 7 Netze über die ganze Stadt, immer gezeichnet) → weniger Dreiecke in Teilansichten.

---

## 14.11.2026 19:40 – Lauf 2

### Gemacht
1. **Referenzabgleich** (nur Text-Quellen auswertbar, Bilder sind hier nicht einsehbar): neu belegt nur VBL-Flotte Batterie-Trolleybus – «24 Gelenk- und 7 Doppelgelenk-Trolleybusse» (VBL-Medienmitteilung 19.03.2026, https://www.vbl.ch/fileadmin/01_vblAG/04_Ueber_vbl/05_Medien/2026_Medienmitteilungen/260319_MM_Batterie-Trolley.pdf) → bestätigt das Nebeneinander Gelenk/Doppelgelenk mit Fahrleitung und Dachaufbauten (Batterie) im Modell; keine Modelländerung nötig. Ohne Farbangabe blieben: LUKS-Medienmitteilung Rettungsdienst 13.02.2020 (https://www.luks.ch/sites/default/files/2020-02/20200213_mm_rettungsdienst_luks.pdf), Wikipedia Rottal Auto (https://en.wikipedia.org/wiki/Rottal_Auto), zvb.ch Buswerbung (https://www.zvb.ch/en/angebote/bus-advertising), electrive-Stichwort Auto AG Rothenburg (https://www.electrive.net/tag/auto-ag-rothenburg/), busphoto.eu (nur Fotos). **Damit bleiben LUKS-Farbschema, ZVB, AAGR, ARAG Annahmen** (unverändert im Modell). Bitte Foto von Simon (LUKS-RTW Seite/Heck) – das ist die verlässlichste Quelle.
2. **Ein-Zeilen-Einbau mit Schalter** – neue Datei `src/real/config.ts` (`REAL`, Rückfall je Teil; Test per URL `?real=0` oder `?real=trees:alt,cars:0`):
   - `buildRealTrees(...)` (`src/real/trees.ts`), neue Sparform **'min'** = Standard: 28–48 Dreiecke/Baum; Hochrechnung 3500 Bäume **150 208** (bisher 154 000) → Budget ≤ 180 000 eingehalten, Startansicht wird sogar minimal leichter. `'alt'` = exakt der bisherige Code.
   - `buildStops(...)`, `buildLamps(...)`, `realBenchGeometry()` (`src/real/props.ts`), je mit Rückfall auf den bisherigen Code (Code 1:1 übernommen).
   - `realCarMeshes(...)` (`src/real/cars.ts`): liefert «body»/«cabin» als Stellvertreter-Objekte mit der InstancedMesh-Schnittstelle, die traffic.ts schon benutzt (setMatrixAt, setColorAt, instanceMatrix.needsUpdate) → in traffic.ts ändert sich genau eine Zeile.
3. **Nachtlicht** (`src/real/night.ts`, `glowMaterial()`): Leuchtteile (Kandelaber-Glas, moderne Leuchte, Wartehallen-Vitrine + Deckenlicht) als eigenes InstancedMesh; Shader mischt Eigenleuchten nach `NIGHT.value` (aus world.ts importiert, nichts dort geändert). `furniture.ts`: Grundkörper und Leuchtteile getrennt (`furnitureGeometry`, `furnitureGlowGeometry`, `furnitureAll`); `buildFurniture` liefert jetzt ein Array `[Grundkörper, Licht?]`.
4. **Geparkt**: `buildParkedCars(roads, mask, groundY, max=400, on, avoid)` – Strassenränder von residential/living_street/service/unclassified/tertiary aus city.json (city.json hat **keine Parkplatz-Flächen**), alle 6 m mit ~45 % Belegung, nicht an Kreuzungen (Raster 12 m), nur auf freier Fläche neben der Fahrbahn, nicht an `avoid`-Punkten (Laternen, Haltestellen). `buildParkedVelos(anker, …)`: Veloständer + 1–5 Velos. `veloRiderGeometry()`: Velo mit Fahrer:in (604 Dreiecke) als Baustein, keine Logik.
5. **Tests**: `tests/par/real_szene.ts` zeigt ein Strassenstück (Kreuzung, Schein-Maske, Haus) mit allen Ein-Zeilen-Bausteinen, Tag- und Nachtansicht (`?nacht=1`), Bäume über `buildRealTrees`, den Verkehrs-Stellvertreter mit 36 Autos; `tests/par/real_shots.py` prüft Budget (3500 Bäume min ≤ 180 000) und echte JS-Fehler.

### Geprüft / ungeprüft
Geprüft: `tsc` fehlerfrei; Build `OUT=dist_pa` läuft durch (nach Merge 19f5797); Testszene ohne JS-Fehler (nur 404 Busheck-Bilder, gewollt); `real_shots.py total` → «BUDGET/BAUSTEINE OK 150208»; Sichtprüfung Screenshots: Strassenstück Tag/Nacht, Wartehalle nachts mit leuchtender Vitrine, Altstadt-Kandelaber nachts leuchtend, geparkte Autos neben der Fahrbahn, Velos am Ständer, Verkehrs-Stellvertreter fährt 8 Autos sichtbar.
Ungeprüft: alles im echten Spiel (Auftrag: kein Weltlauf). Insbesondere: zirkulärer Import world.ts ↔ src/real/* (Bausteine importieren `toon`/`NIGHT` aus world.ts; nur zur Laufzeit benutzt, sollte in ESM funktionieren – nicht im Spiel getestet), Verhalten von `chunkInstanced` mit den neuen Netzen, Abstände der längeren Autos im Stau (traffic.ts rechnet mit 4.1 m, Lieferwagen 5.4 m → leichte Überlappung möglich), Kollision: geparkte Autos sind **nicht** in der Maske (Ambulanz fährt durch; stehen aber neben der Fahrbahn).
Bekannter Schönheitsfehler Testszene: Zähler oben links zeigte in einzelnen Ansichten «2 Aufrufe» (Zählung vor dem letzten Bild) – betrifft nur die Anzeige.

### Einbau-Hinweise Lauf 2 (ersetzen E1–E5 aus Lauf 1)
Alle Funktionen fallen über `REAL` (src/real/config.ts) auf das bisherige Aussehen zurück.

| # | Datei / Stelle | Ersetzen durch (eine Zeile) | Import | Erwartung |
|---|---|---|---|---|
| E1 | world.ts `buildWorld`, ganzer Block `// ---- Bäume (instanziert) ----` `{ … }` (~Z. 1470–1483) | `group.add(buildRealTrees(trees, props?.trees, mask, (x, z) => terrain.ground(x, z)));` | `import { buildRealTrees } from './real/trees';` | 7 statt 2 Netze (+5 Aufrufe), 3500 Bäume ≈ 150 000 statt 154 000 Dreiecke |
| E2 | world.ts `buildProps`, Block `// Bushaltestellen: blaues Schild` `if (P.stops.length) { … }` (~Z. 2547) | `if (P.stops.length) G.add(...buildStops(P.stops, mask, (x, z) => terrain.height(x, z)));` | `import { buildStops, buildLamps, realBenchGeometry } from './real/props';` | ~50 % Hallen (200 Dreiecke), Rest Schild; +2 Aufrufe (Halle, Licht) |
| E3 | world.ts `buildProps`, im Block `if (P.lamps.length) {` die Zeilen von `const poleG = …` bis `pole.name = 'lamps'; G.add(pole, head);` (~Z. 2456–2466); die Zeile `(G as any).counts = …` bleibt | `G.add(...buildLamps(P.lamps, mask, (x, z) => terrain.height(x, z)));` | (s. E2) | Altstadt 132, Hauptstrasse 68 statt 2×12 Dreiecke; +4 Aufrufe |
| E4 | world.ts `buildProps` Bank-Block (~Z. 2400): im `new THREE.InstancedMesh(colorMerge([...]), …)` | `colorMerge([...])` → `realBenchGeometry() ?? colorMerge([...])` | (s. E2) | 108 statt 36 Dreiecke je Bank |
| E5 | traffic.ts Konstruktor: die zwei Zeilen `this.body = new THREE.InstancedMesh(bodyG, …)` und `this.cabin = …` (Z. 62–63) | `({ body: this.body, cabin: this.cabin } = realCarMeshes(N_CARS, bodyG, cabG) as any);` | `import { realCarMeshes } from './real/cars';` | 8 statt 2 Aufrufe; 36 Autos ≈ 15 000 Dreiecke; Farben nach CH-Verteilung (Zeile 68 `setColorAt` wird ignoriert) |
| E6 | world.ts `buildWorld`, direkt nach E1 | `group.add(...buildParkedCars(d.roads, mask, (x, z) => terrain.height(x, z), 300, undefined, [...(props?.lamps || []), ...(props?.stops || []), ...trees]));` | `import { buildParkedCars } from './real/cars';` | ≤ 300 Autos ≈ 123 000 Dreiecke (**bei 2.36 Mio. Startansicht nur mit Vorsicht** – erst 100 versuchen ≈ 41 000) |
| E7 | world.ts `buildProps`, nach E2 | `G.add(...buildParkedVelos(P.stops.filter((_, i) => i % 6 === 0).map(([x, z]) => [x + 2, z + 2, 0]), (x, z) => terrain.height(x, z)));` | `import { buildParkedVelos } from './real/cars';` | wenige Ständer; je Ständer 180 + bis 5×364 Dreiecke |

Alle Zeilen E1–E7 wurden in einer temporären Datei gegen die echten Typen (CityData, Props, Mask, Terrain) mit `tsc` geprüft – fehlerfrei (Datei danach gelöscht). Im Spiel ausgeführt wurden sie nicht.
Prüfen nach dem Einbau: `?real=0` muss exakt wie vorher aussehen (gleiche Dreieckszahl laut `renderer.info`); Abend (`__dbg.evening(true)`) → Kandelaber/Hallen leuchten.

### Offen / nächster Lauf
- Fotos LUKS-RTW / ZVB / AAGR / ARAG (Simon) → Farben korrigieren.
- Geparkte Autos als Hindernis in die Maske eintragen? (Entscheid Hauptsitzung; Kinderspiel: harmloser Rempler wäre okay.)
- Volle Baumform nur nah an der Kamera (LOD) – nicht gebaut; 'min' reicht fürs Budget.
- OSM-Standorte für Robidog/Abfallkübel/Hydrant/Briefkasten/Veloparkierung in der Daten-Pipeline.
- Velo-Verkehr mit Logik (traffic.ts, nicht meine Datei).

---

## 14.11.2026 19:25 – Lauf 1

### Gemacht
| Teil | Datei | Stand | Im Spiel aktiv? |
|---|---|---|---|
| a) Rettungswagen nach Vorbild Rettungsdienst LUKS | `src/vehicle.ts` → neue Funktion `buildLuksRtw()`, aufgerufen von `buildAmbulance('standard')` | fertig | **ja** (sofort, kein Einbau nötig) |
| b) Buslackierungen, Doppeltüren, Faltenbalg, Dachaufbauten | `src/bus.ts` (`brand`, `sideTex`, `frontTex`, `rearTex`, `makeBus`) | fertig | **ja** (sofort) |
| c) Baumarten + Auswahlfunktion | `src/real/trees.ts` | fertig | nein → Einbau-Hinweis E1 |
| d) Strassenmöbel CH | `src/real/furniture.ts` | fertig (Geometrien) | nein → Einbau-Hinweise E2–E4 |
| e) Verkehrsautos + Velo | `src/real/cars.ts` | fertig (Geometrien, Farbverteilung) | nein → Einbau-Hinweis E5 |
| Helfer | `src/real/geo.ts` (paint, parts, box, cyl, tube, roundNormals, hash2, weighted) | fertig | – |
| Testszene | `tests/par/real_szene.html/.ts`, `tests/par/real_vite.config.mjs`, `tests/par/real_shots.py` | fertig | – |

**a) Rettungswagen (Standard)** – Mercedes-Sprinter-Kabine (Seitenprofil extrudiert: Stossstange, Haube, schräge Frontscheibe), WAS-Wechselkoffer 2.3 × 2.33 × 4.4 m mit gerundeten Dachkanten, Alkoven über der Kabine mit integriertem Lichtbalken, Kühlergrill mit 2 Frontblitzern, Heckblitzer oben, seitliche Blaulichter; Radstand 3.65 m, hinten Zwillingsbereifung; Klimagerät auf dem Dach; Spiegel, Trittstufe rechts.
Beschriftung über **einen** Canvas-Atlas (1 Zeichenaufruf): Battenberg 2 Reihen leuchtgelb/rot rundum (Koffer + Kabinentüren), rote Konturlinie Dachkante, Milchglasfenster, Seiteneinstieg rechts, «144» gross + «Ambulanz», Heck mit Flügeltüren, Warnwinkeln rot/gelb, «144», Spiegelschrift «AMBULANZ» vorne am Alkoven. Keine Logos, keine Luksi-Figur.
Unverändert: Schnittstelle (`root, body, lights, blueOn, blueOff, dizzy, wheels, steerPivots, mats`), Physik, Hitbox (`blocked()` mit festen Punkten), `vcap`-Feld (kam mit dem Merge f936979; unverändert), Skins feuerwehr/glace/monster (alter Code-Pfad unverändert). `lights` hat jetzt 8 Elemente (vorher 4) – Wechseltakt `(i + phase) % 2` funktioniert unverändert (links/rechts gegengleich).

**b) Busse** – Lackierungen siehe Tabelle Referenzen. Seitentextur mit Doppeltür (Glas bis unten), tiefem Fensterband, Betreibername, Liniennummer; Front mit Stossfänger; Heckfarbe je Betreiber (vorher nur VBL/PostAuto/grau). Gelenk: gerippter Faltenbalg (4 Ringe) hinter jedem nicht-letzten Wagenkasten. Dach: Klima-/Batteriekasten je Wagenkasten, bei Trolley hinter dem Stromabnehmer, bei VBL/Trolley zweiter Kasten hinten (eigenes Material `roofMat`, +1 Zeichenaufruf je Wagenkasten). Stromabnehmer wie bisher. Gelenk-/Doppelgelenk-/Solobus-Logik und Fahrlogik unverändert.

### Geprüft / ungeprüft
Geprüft (tatsächlich ausgeführt):
- `npx tsc --noEmit -p .` fehlerfrei (nach Merge von `claude/13i-gebiet-a` f936979).
- `OUT=dist_pa sh tools/dist.sh` läuft durch (38 MB).
- Testszene (`tests/par/real_shots.py`, Software-Rendering, Port 8771): alle Bausteine werden ohne JS-Fehler gebaut und gezeichnet; Sichtprüfung der Screenshots Ambulanz (vorne, hinten, links, rechts), Busse (alle Betreiber, Solo/Gelenk/Doppelgelenk/Trolley), Bäume, Möbel, Autos, Velos. Einzige Konsolenfehler: 404 für Luksi-/Kinderspital-Bild am Bus-Heck (in der Testszene absichtlich ohne `public/`).
- Dreieckszahlen aus der Testszene (Tabelle unten).

Ungeprüft:
- **Ganze Welt**: ein Lauf mit `tests/look_spots.py` auf dist_pa (Port 8771, `&noshadow`) ist beim Laden mit «Target crashed» abgebrochen (vermutlich Speicher, Hauptsitzung testete gleichzeitig). Nicht wiederholt (Vorgabe: höchstens einmal). Ambulanz und Busse im echten Spiel also **nicht gesehen**; Fahrverhalten unverändert per Code-Lesen (keine Physikzeile geändert), nicht per Test.
- Bildrate im Spiel, Nachtbeleuchtung der neuen Teile, Zusammenspiel mit Schatten.
- Farbechtheit gegen Fotos (Bilder konnten in dieser Umgebung nicht angeschaut werden, nur Texte).

### Dreiecksbudgets (gemessen in der Testszene)
| Baustein | Dreiecke | Zeichenaufrufe |
|---|---|---|
| Rettungswagen standard (neu) | 852 | ~14 (Material-Merge + 1 Atlas + 8 Blaulichter) |
| Feuerwehr / Glace / Monster (unverändert) | 878 / 1378 / 734 | – |
| Bus VBL Doppelgelenk-Trolley (3 Kästen) | 520 | 3 je Kasten |
| Bus Gelenk-Trolley / Gelenk / Solo | 356 / 280 / 116 | 3 je Kasten |
| Linde / Rosskastanie / Platane / Buche | 132 / 172 / 214 / 132 | 1 je Art (instanziert) |
| Fichte / Tanne / Obstbaum | 66 / 86 / 132 | 1 je Art |
| «lite» (Krone detail 0): Linde/Kastanie/Platane/Buche/Obst | 72 / 112 / 154 / 72 / 72 | – |
| Kandelaber Altstadt / modern | 132 / 68 | 1 je Art |
| Wartehalle VBL | 188 | 1 |
| Robidog / Abfallkübel / Bank / Veloständer (3 Bügel) | 68 / 96 / 108 / 180 | 1 je Art |
| Hydrant / Briefkasten | 192 / 80 | 1 je Art |
| Kombi / Kleinwagen / SUV / Lieferwagen | 424 / 400 / 424 / 412 | 2 je Typ (Körper getönt + Festteile) |
| Velo | 364 | 1 |

Vergleich: bisheriger Baum 44 Dreiecke, bisheriges Verkehrsauto 24. Bei 3500 Bäumen: heute ~154 000, neu ~440 000 (voll) bzw. ~280 000 («lite») → für die Gesamtwelt **lite empfohlen** (Budget R13: P1 ≤ 2.5 Mio.). 36 Autos neu ~15 000 statt 860.

### Einbau-Hinweise (für die Hauptsitzung, 03:30) – **überholt durch Lauf 2 (E1–E7 oben)**

**E1 – Baumarten (src/world.ts)**
1. Import oben: `import { buildTreeInstances, pickSpecies, ctxFromMask, type TreeSpecies } from './real/trees';`
2. In `buildWorld`, Block «R9: echte Einzelbäume» (aktuell Zeile ~724): OSM-Info mitgeben:
   ```ts
   trees.unshift([x, z, t[3] === 2 ? 0.58 + hash(x, z) * 0.16 : 1.05 + hash(x, z) * 0.45, t[2] ?? 0, t[3] ?? 0]);
   ```
   Gestreute Parkbäume (Zeile ~716) unverändert lassen (`[x, z, s]` → Art nach Lage).
3. Block «---- Bäume (instanziert) ----» (Zeilen ~1470–1483) ersetzen durch:
   ```ts
   {
     const list = trees.map(([x, z, s, nd, kd]) => {
       const c = ctxFromMask(mask, x, z); c.needle = nd === 1; c.kind = kd;
       const sp = pickSpecies(c);
       return [x, z, sp === 'obstbaum' ? 0.85 + hash(x, z) * 0.3 : s * 0.75, sp] as [number, number, number, TreeSpecies];
     });
     group.add(buildTreeInstances(list, (x, z) => terrain.ground(x, z) - 0.05, toon('#ffffff', { vertexColors: true }), !!opts.coarse));
   }
   ```
   Erwartung: 7 InstancedMeshes statt 2 (+5 Zeichenaufrufe), Dreiecke siehe Budget (mit `coarse` → lite). Höhen: Linde ~10–12 m, Platane ~11–14 m, Obstbaum 5–7 m.
4. Wald (`buildForest`) bleibt vorerst; optional später `treeGeometry('fichte', true)` / `treeGeometry('buche', true)` statt `coneG`/`leafG` (Achtung: dort trunk/cone/leaf getrennt; dann `vertexColors`-Material und Farbe per setColorAt nahe Weiss).

**E2 – Wartehalle an Bushaltestellen (src/world.ts, `buildProps`, Block «Bushaltestellen: blaues Schild», ~Zeile 2547)**
Ersetzt das Schild durch die Wartehalle für Haltestellen mit Namen (OSM-Haltestellen ohne Unterstand bekommen weiterhin das Schild). Da OSM `shelter=yes` nicht in props.json ist [offen], vorerst jede 2. Haltestelle:
```ts
import { buildFurniture } from './real/furniture'; // oben
const hall = P.stops.filter((_, i) => i % 2 === 0), sign = P.stops.filter((_, i) => i % 2 === 1);
// Drehung: Rückwand von der Strasse weg (gleiches Verfahren wie Laternen: Richtung mit den meisten Strassenzellen = +z)
const rot = (x: number, z: number) => { let best = 0, bn = -1; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; let n = 0; for (const d of [3, 5]) if (mask.isRoad(x + Math.sin(a) * d, z + Math.cos(a) * d)) n++; if (n > bn) { bn = n; best = a; } } return best; };
G.add(buildFurniture('wartehalle', hall.map(([x, z]) => [x, z, rot(x, z)]), (x, z) => terrain.height(x, z), toon('#ffffff', { vertexColors: true })));
// … bisheriger Schild-Code nur noch mit `sign`
```
Erwartung: +1 Zeichenaufruf, +188 Dreiecke je Halle (Luzern ~300 Haltestellen → ~28 000).

**E3 – Kandelaber (src/world.ts, `buildProps`, Block Laternen ~Zeile 2456)**
Altstadt-Kandelaber statt Mast+Kopf innerhalb der Altstadt-Box (Annahme: x −700..250, z −450..150), sonst `kandelaber_modern` für `l[2]` (Hauptstrasse), übrige wie bisher:
```ts
const alt = P.lamps.filter(([x, z]) => x > -700 && x < 250 && z > -450 && z < 150);
G.add(buildFurniture('kandelaber', alt.map(([x, z]) => [x, z, 0]), (x, z) => terrain.height(x, z), toon('#ffffff', { vertexColors: true })));
```
und diese Laternen aus `P.lamps` für den alten Block entfernen. Nachtlicht: der Leuchtkörper ist Vertex-Farbe `LAMP_GLOW`; für Abendleuchten müsste die Hauptsitzung ein zweites Material mit `emissive` nutzen [offen – nicht gebaut].

**E4 – Bänke (src/world.ts, `buildProps`, ~Zeile 2397)**: die `colorMerge(...)`-Geometrie der Bank ersetzen durch `furnitureGeometry('bank')` (Import aus `./real/furniture`), sonst unverändert. Erwartung +96 Dreiecke je Bank.
Robidog, Abfallkübel, Hydrant, Briefkasten, Veloständer: **keine Standortdaten in props.json**. Pipeline-Hinweis für `tools/geo/build_props.py` (nicht meine Datei): Overpass `vending=excrement_bags`, `amenity=waste_basket`, `emergency=fire_hydrant`, `amenity=post_box`, `amenity=bicycle_parking` als `[x, z]`-Listen; Abfallkübel der Stadt Luzern alternativ aus opendata.swiss (Datensatz «Abfallkübel – Standort und Information»). Danach je Art `buildFurniture(kind, liste, …)`.

**E5 – Verkehrsautos (src/traffic.ts, Konstruktor ~Zeile 60 und `draw()` ~Zeile 263)**
```ts
import { CAR_TYPES, carGeometry, carColor, carTypeFor, type CarType } from './real/cars'; // oben
// Konstruktor statt bodyG/cabG/this.body/this.cabin:
this.ctype = Array.from({ length: N_CARS }, (_, i) => carTypeFor(((i * 0.618) % 1)));
this.cidx = this.ctype.map((t, i) => this.ctype.slice(0, i).filter((u) => u === t).length);
this.cmesh = {} as any;
for (const t of CAR_TYPES) { const n = this.ctype.filter((u) => u === t).length, g = carGeometry(t);
  const b = new THREE.InstancedMesh(g.body, toon('#ffffff', { vertexColors: true }), Math.max(1, n)), f = new THREE.InstancedMesh(g.fixed, toon('#ffffff', { vertexColors: true }), Math.max(1, n));
  for (const im of [b, f]) { im.frustumCulled = false; im.name = 'traffic'; this.group.add(im); }
  this.cmesh[t] = [b, f]; }
this.ctype.forEach((t, i) => this.cmesh[t][0].setColorAt(this.cidx[i], new THREE.Color(carColor((i * 0.381966 + 0.13) % 1))));
// draw(): statt this.body.setMatrixAt(i, m); this.cabin.setMatrixAt(i, m):
const [b, f] = this.cmesh[this.ctype[i]]; b.setMatrixAt(this.cidx[i], this.m); f.setMatrixAt(this.cidx[i], this.m);
// und am Ende von draw(): for (const [b, f] of Object.values(this.cmesh)) { b.instanceMatrix.needsUpdate = f.instanceMatrix.needsUpdate = true; }
```
Felder `ctype: CarType[]; cidx: number[]; cmesh: Record<CarType, THREE.InstancedMesh[]>` in der Klasse deklarieren; alle übrigen Stellen, die `this.body`/`this.cabin` benutzen (needsUpdate, Farbe), entsprechend umstellen. Fahrzeuglänge für Abstände: `CAR_LEN[type]`. Erwartung: 8 Zeichenaufrufe statt 2, ~15 000 Dreiecke bei 36 Autos. Velos (`veloGeometry()`) als eigener Verkehrsteilnehmer: offen (keine Velo-Logik in traffic.ts).

### Referenzen (Recherche 14.11.2026)
| Aussage | Quelle | Status |
|---|---|---|
| LUKS-Rettungswagen: Mercedes Sprinter 519 CDI, Wechselkoffer, Lieferant WAS; 15 Rettungsfahrzeuge | https://www.luks.ch/sites/default/files/2017-09/Medienmitteilung_neue%20Rettungfahrzeuge_20170927.pdf | belegt (Stand 2017) |
| WAS 500 Koffer: Radstand 3665 mm, 5 t, integrierte Front-/Heck-LED-Warnanlage, Blitzer im Grill, Seiteneinstieg | https://www.was-vehicles.com/en/vehicles/was-500-box-body-ambulances/was-500-emergency-ambulance | belegt (Hersteller, nicht LUKS-spezifisch) |
| Battenberg-Markierung wird in der Schweiz verwendet (Farben dort nicht genannt) | https://dewiki.de/Lexikon/Battenberg-Markierung | belegt (allgemein) |
| LUKS-Farbschema | 3 Fotos von Simon, 14.11.2026 | **in Lauf 4 korrigiert** – die Lauf-1-Annahme (Battenberg leuchtgelb/rot, Warnwinkel) war falsch |
| VBL: «mainly white, with blue finish»; lighTram doppelgelenkig, Gelenk-Trolleybusse | https://en.wikipedia.org/wiki/Verkehrsbetriebe_Luzern | belegt; Blauton Annahme |
| PostAuto: gelbe Busse, Posthorn | https://www.postauto.ch/de/ueber-uns-und-aktuelles/organisation/die-marke | belegt; dunkler Schweller, roter Schriftzug = Annahme |
| AAGS: rot-weiss | https://en.wikipedia.org/wiki/Auto_AG_Schwyz | belegt; Aufteilung Annahme |
| ZVB weiss/blau | – | **Annahme, Vertrauen mittel** |
| AAGR (Auto AG Rothenburg), ARAG (Rottal Auto) | – (Wikipedia-Abzug ohne Farbangabe) | **Annahme: neutral weiss/grau, nicht belegt** |
| Neuwagenfarben 2024 (DE): Grau/Silber 33 %, Schwarz 26.6 %, Weiss 19.9 %, Blau 8.9 %, Rot 4.7 %, Grün 3.1 % | https://www.autohaus.de/nachrichten/autohandel/autofarben-2024-war-ein-graues-jahr-bei-neuwagen-3610238 | belegt für DE |
| Schweiz: unbunte Farben dominieren, Blau vor Rot und Grün (ohne Zahlen) | https://www.pressetext.com/news/beliebteste-autofarben-in-der-schweiz.html | belegt qualitativ → DE-Zahlen als Näherung = Annahme |
| Abfallkübel Stadt Luzern (Standorte, offene Daten) | https://opendata.swiss/en/dataset/abfallkubel-standort-und-information | Datensatz existiert, nicht geladen |
| Baumarten-Gewichte, Kandelaber-, Robidog-, Hydrant-, Briefkasten-Aussehen | – | **Annahme** (allgemeines Schweizer Strassenbild) |

### Offen / nächster Lauf
1. **Foto-Abgleich Ambulanz**: Simon arbeitet am LUKS – ein Foto eines aktuellen RTW (Seite + Heck) würde Farbschema/Band klären; bis dahin Annahme. Ebenso Fotos AAGR/ZVB-Bus.
2. Einbau E1–E5 durch die Hauptsitzung abwarten, dann im Spiel prüfen (Sicht, Dreiecke `renderer.info`, fps).
3. Weltlauf wiederholen, wenn die Maschine frei ist (Absturz «Target crashed» in Lauf 1).
4. Nachtbeleuchtung für Kandelaber/Wartehalle (emissives Zweitmaterial).
5. Velo-Verkehr (Logik) und geparkte Autos/Velos (Standorte aus OSM `parking`, `bicycle_parking`).
6. Wald mit neuen Arten (lite) – Leistung vorher messen.

### Testszene benutzen
```
npx vite build -c tests/par/real_vite.config.mjs          # → dist_pa_szene/ (nicht committen)
python3 -m http.server 8771 --directory dist_pa_szene &
nice -n 10 python3 tests/par/real_shots.py amb,ambL,ambF,bus,bus2,baum,moebel,autos,total   # → shots/pa_*.png + Dreiecke
```
