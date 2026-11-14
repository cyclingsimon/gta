# P-A «Realismus-Bausteine» – Arbeitsprotokoll

Branch `par/realismus`, Worktree `/home/claude/wt-pa`. Dateihoheit: `src/vehicle.ts` (nur Aussehen), `src/bus.ts` (nur Aussehen), `src/real/*`, `tests/par/real_*`, `docs/par/realismus.md`.

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

### Einbau-Hinweise (für die Hauptsitzung, 03:30)

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
