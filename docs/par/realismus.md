# P-A «Realismus-Bausteine» – Arbeitsprotokoll

Branch `par/realismus`, Worktree `/home/claude/wt-pa`. Dateihoheit: `src/vehicle.ts` (nur Aussehen), `src/bus.ts` (nur Aussehen), `src/real/*`, `tests/par/real_*`, `docs/par/realismus.md`.

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
| LUKS-Farbschema leuchtgelb/rot, rote Konturlinie, Warnwinkel hinten | – | **Annahme, Vertrauen niedrig–mittel** (Fotos nicht einsehbar) |
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
