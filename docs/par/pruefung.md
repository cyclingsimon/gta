# P-C Unabhängige Prüfung & Fehlerjagd

## 16.11.2026 ca. 19:00 – Prüflauf 17c (nur Code-Lesung)

Prüfgegenstand: `ee55241..2f2ae1c` (Bahnsignale/Hektometertafeln, Plakatwände, Siloballen, Wartende, Kinder unter den Fussgängern, Rücknahme
der Wagen-Skalierung). Dazu `src/velo.ts` (17b, auf Wunsch) und der Einbau in `main.ts`. `claude/13i-gebiet-a` per Fast-Forward hineingemergt.

**Ausgeführt:**
- `npx tsc --noEmit -p .` → ok.
- Python-Zählungen, die nur Daten lesen: Luzern hat 153 Velo-Kandidaten mit 1 769 Punkten und 362 Haltestellen.

**Nicht ausgeführt:** kein Build, kein Browser.

### Ergebnis: keine Befunde der Schwere 1–3

Geprüft:
- **Schleifen / Länge 0:** In `bahnsignal.ts` (+420/+100), `plakat.ts` (+260), `ballen.ts` (höchstens 14 Versuche) und `wartende.ts` (höchstens 8 Versuche) sind alle Schleifen begrenzt, Segmente < 0.5 m werden übersprungen. In `velo.ts` wird `at()` mit `l || 1` gerechnet, Kandidaten sind ≥ 60 m lang, die Winkel-`while` sind endlich.
- **Leere Listen:** Ohne Radstreifen bleibt die Gruppe unsichtbar und `update` kehrt sofort zurück. Ohne Haltestellen, Wiesen oder Hauptstrassen geben die Module `null` zurück, und der Aufrufer prüft das.
- **Speicher:** Velo-InstancedMesh und Material samt Klon sowie Plakat-CanvasTexture (`map`) gibt `freeGroup` frei, beim Gegendwechsel über `main.ts:1906`. Bahnsignale, Ballen und Wartende sind einfache Netze in `world.group`. Kein Leck.
- **Handy-Leistung:**
  - `velo.update`: 8 Velos × ≤ 4 Ambulanzen je Bild, vernachlässigbar.
  - `place()`: rechnet nur nach 120 m Fahrt neu, über ~1 800 Punkte, unkritisch.
  - Wartende: etwa 720 Figuren × 32 Dreiecke ≈ 23 000 Dreiecke in einem Netz.
- **Plakat-Leserichtung:** nachgerechnet. Von der Strasse aus gesehen liegt `u0` links und oben ist oben. Die Rückseite deckt die weisse Tafel ab (Plakat 0.056 m vor der Tafelmitte, Tafel 0.05 m halbe Tiefe). Nicht spiegelverkehrt.
- **Kinder-Skalierung:** `this.peds` hat feste Länge (kein `splice`), Index `i` ist stabil, also wechselt die Grösse nicht. Skaliert wird ab den Füssen.
- **Grundsätze:** Plakate ohne Marken (Berg, Fasnacht, Wochenmarkt, Zirkus, Glace, Schifffahrt, Velo-Sonntag, Kinderfest). Keine Gewalt. Velos halten bei Annäherung an, kein Scheitern. Glocke höchstens alle 8 s. Keine Netzaufrufe.
- **Objekte auf Fahrbahn, im See, in Häusern:** Pfosten, Plakate, Ballen und Wartende stehen nur auf `mask 0 && !isRoad`. Plakate prüfen 6 Punkte, Ballen jeden Ballen, Wartende 5 Punkte. Velos fahren absichtlich auf Radstreifen und Velowegen.

### Schwere 4–5

| # | Schwere | Befund | Beleg |
|---|---|---|---|
| V1 | 4 | Velos auf einer Strasse unter einer gehobenen Überführung fahren **oben auf dem Deck** (`groundY = terrain.height(x, z)` ohne `under()`). Velostrecken unter Überführungen (z. B. Velowege entlang Bahn/Strasse) springen für einige Meter 6 m hoch | `src/main.ts:1368`, `:1906`, `src/velo.ts:50` |
| V2 | 5 | Bahnsignal-Lichter: Der Versatz nach vorn und hinten nutzt nur `uz` (`mz ∓ uz·0.09`), die x-Komponente fehlt. Auf Gleisen in Ost-West-Richtung (uz ≈ 0) liegen beide Lichter im 0.14 m tiefen Schirm → **Signal ohne Licht** | `src/bahnsignal.ts:18` |
| V3 | 5 | Bahnsignale als `MeshBasicMaterial`: Mast und Schirm werden am Abend nicht dunkler (nur die Lichter sollten leuchten) | `src/bahnsignal.ts:25` |
| V4 | 5 | Velos wenden am Ende jedes Wegstücks mitten auf der Strecke (`dir` kehrt bei `s = 0/L` um) – sieht auf kurzen Radstreifen-Stücken (≥ 60 m) seltsam aus | `src/velo.ts:47` |

### Patches

V1:
```diff
--- a/src/velo.ts
-  constructor(roads: Road[], private groundY: (x: number, z: number) => number, n = 14) {
+  constructor(roads: Road[], private groundY: (x: number, z: number, h?: number) => number, n = 14) {
@@
-      … this.p.set(v.x, this.groundY(v.x, v.z) + 0.02, v.z); …
+      … this.p.set(v.x, this.groundY(v.x, v.z, v.h) + 0.02, v.z); …
--- a/src/main.ts (Z. 1368 und 1906)
-velos = new Velos(cityData.roads as any, (x, z) => terrain.height(x, z), MOBILE ? 8 : 14);
+velos = new Velos(cityData.roads as any, (x, z, h = 0) => terrain.height(x, z, terrain.under(x, z, h)), MOBILE ? 8 : 14);
```

V2:
```diff
-        box(mx, y + 5.45, mz - uz * 0.09, 0.26, 0.26, 0.06, ux, uz, LICHT[n % LICHT.length]); box(mx, y + 5.45, mz + uz * 0.09, 0.26, 0.26, 0.06, ux, uz, LICHT[n % LICHT.length]); n++; }
+        box(mx - ux * 0.09, y + 5.45, mz - uz * 0.09, 0.26, 0.26, 0.06, ux, uz, LICHT[n % LICHT.length]); box(mx + ux * 0.09, y + 5.45, mz + uz * 0.09, 0.26, 0.26, 0.06, ux, uz, LICHT[n % LICHT.length]); n++; }
```

V3 (optional): Mast und Schirm mit `MeshLambertMaterial({ vertexColors: true })`, die Lichter als zweites Netz mit `MeshBasicMaterial` – oder alles so lassen (rein kosmetisch).

## 16.11.2026 tagsüber – Prüflauf 17a (nur Code-Lesung)

Prüfgegenstand: `d77becc..51d064e` (9 Commits 17a: Strassennamenschilder, Fahrleitung, Schachtdeckel, Zone 30, Wanderwegweiser,
Normmarkierung und Randlinien auf Brücken, Gleise mit Schienen, 450/700 geparkte Autos mit Parkfeldern). `claude/13i-gebiet-a` per Fast-Forward
hineingemergt.

**Ausgeführt:**
- `npx tsc --noEmit -p .` → ok.
- Skript `/tmp/pcw/ww.py` liest nur Daten: Es bildet die Auswahl in `wanderweg.ts` (Verzweigungen, 300 m Abstand, Zielorte aus
  `SIGN_PLACES`) für alle 25 Gegenden nach. **Ohne** die Pfosten-Prüfung `frei()` – die echten Zahlen sind deshalb eher etwas kleiner.

**Nicht ausgeführt:** kein Build, kein Browser. Alle Befunde stammen aus Code-Lesung oder dem Skript.

`src/terrain.ts under()` und `traffic.ts hy`/Fussgänger liegen **vor** `d77becc` (Commit c96050e, 16b) und haben sich im Prüfbereich
nicht geändert. Ich habe sie kurz gelesen: kein Befund.

### Befunde

| # | Schwere | Befund | Szenario → falsches Ergebnis | Vertrauen | Beleg |
|---|---|---|---|---|---|
| W1 | 1 oder 3 (je Browser) | Wanderweg-Atlas wird **256 × 32 768 px** gross | Die Atlashöhe ist `ceilPowerOfTwo(Namen × 2 × 48)`, also eine einzige Spalte. Skript: Luzern 187, a10 195, a17 187, a6 182, Nord 175 verschiedene Tafeltexte → 32 768 px; alle übrigen Gegenden → 16 384. Chrome und Firefox erlauben höchstens 32 767 px je Seite. Bei 32 768 ist die Leinwand unbrauchbar: je nach Browser liefert `getContext` `null` → `g.save()` wirft → `buildWorld` bricht ab, Start in Luzern unmöglich (C1-Ausweichen landet wieder in Luzern) – **oder** alle Tafeln bleiben leer. Wo es klappt, sind es 32 MB + Mip-Stufen GPU je Gegend (Desktop mit MAX_TEXTURE_SIZE 32 768). Am Handy (MAX_TEXTURE_SIZE 4096/8192) verkleinert three.js auf 32 × 4096 px → Schrift unlesbar | hoch für Grösse und Grenzwert (Skript), mittel für die Folge (ohne `frei()` gerechnet, Browser nicht getestet) | `src/wanderweg.ts:27`, `:28-32` |
| W2 | 3 | Canvas-Atlanten bleiben im Arbeitsspeicher | `CanvasTexture` hält die Leinwand: Schilder 2048 × 2048 (Echt, 16 MB) bzw. 2048 × 1024 (Leicht, 8 MB) je Gegend, dazu W1. Am iPhone gilt ein Gesamtlimit für Leinwand-Speicher (Safari: «Total canvas memory use exceeds the maximum limit»). Wird es erreicht, liefert `getContext` `null` → nächster `canvasTex` wirft. Nach Entladen gibt der GC frei, aber Stufe A + Stufe B + Nachbar liegen gleichzeitig vor | mittel (Grenzwert je Gerät verschieden, nicht gemessen) | `src/schilder.ts:37`, `src/wanderweg.ts:27` |
| W3 | 4 | Fahrleitung sticht durch Strassenbrücken | Die 16a-Hebung garantiert nur 5.6 m Deck über dem Gleis (Fahrbahn ≈ Boden + 6.2 m). Fahrdraht liegt bei +5.5, Tragseil bei +6.5, Ausleger bei +6.5, Mast bis +7.4 → an jeder knapp gehobenen Überführung liegt das Tragseil **über** der Fahrbahn der Brücke (Draht quer über die Strasse), der Fahrdraht steckt in der Platte | hoch (Rechnung) | `src/bahnmast.ts:23-24`, `src/world.ts:783` (5.6 m) |
| W4 | 5 | Schachtdeckel und Zone-30-Zeichen unter hohen Decks oben auf dem Deck | `yOf = terrain.height(x, z)` ohne `under()` → Deckel der unterführten Strasse liegen quer auf der Überführung | hoch | `src/world.ts:1075-1076` |
| W5 | 5 | Schienen-Anhebung über Farbschwellen | Die Gleishöhe auf Bahnbrücken unterscheidet Schiene, Schwelle und Schotter über `col < 0.1 / 0.23` (linear). Wer die Farben ändert, lässt die Schienen auf Brücken verschwinden. Heute stimmt es (#4A4E52 → 0.068, #7A726B → 0.195, #8E847C → 0.27) | hoch | `src/world.ts:1094` |

Ohne Befund geprüft:
- **Schleifen:** In `deckel.ts` steigen `accD`/`accR` jedes Mal um ≥ 38/45 m, Segmente < 0.5 m werden übersprungen. In `bahnmast.ts` steigt `acc` um 50. In `zone30.ts` ist `i` durch die Länge begrenzt. `dirOf`/`along` laufen auch bei Doppelpunkten weiter. → keine Endlosschleife bei Länge 0.
- **NaN:** `|| 1` bei `sl`/`L`, `beam` mit `|| 1`.
- **Wicklung/UV:** Strassenschilder, Wanderwegweiser (beidseitig), Zone-30-Signal (Vorderseite gegen die Einfahrt) und Bodenzeichen «30» (oben = Fahrtrichtung) habe ich nachgerechnet. Text liest sich überall von links nach rechts, die Pfeile zeigen in die Astrichtung.
- **Speicher beim Entladen:** Alle neuen Netze hängen in `world.group`, auch Gruppen in Gruppen. `freeGroup` läuft rekursiv und gibt Material und `map` frei. Jeder Aufruf erzeugt eigene Materialien, keine geteilten. Kein Leck.
- **Objekte auf der Fahrbahn:** Pfosten (Schilder, Zone 30, Wanderweg, Masten) stehen nur auf `mask 0 && !isRoad`. Deckel und Bodenzeichen liegen absichtlich auf der Fahrbahn.
- **`lastParkedSpots`:** wird synchron direkt nach dem Bau gelesen. Die Abschaltung `REAL.parked` lässt den Wert leer → kein Übertrag zwischen Gegenden.
- **O(n²):** `done.some`/`seen.some`/`names.indexOf` laufen über höchstens ein paar hundert Einträge (Skript: höchstens 142 Pfosten, 393 Tafeln) → unkritisch. Schilder nutzen ein Raster.
- **Normmarkierung auf Brücken:** trägt das +100-Kennzeichen (bleibt auf dem Deck). Pfeile über `roadDecals` → `terrain.height` → Deck.
- **Grundsätze:** keine Marken oder Logos (Strassennamen aus OSM, «ZONE 30», Ortsnamen), keine Netzaufrufe.

### Patch-Vorschläge

W1 – Wanderweg-Atlas mehrspaltig wie die Strassenschilder (2048 breit, 8 Spalten; 195 Namen → 2048 × 4096 statt 256 × 32 768):
```diff
-  const names = [...new Set(panels.map((p) => p.txt))], RH = 48, W = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = THREE.MathUtils.ceilPowerOfTwo(names.length * 2 * RH); const g = cv.getContext('2d')!;
+  const names = [...new Set(panels.map((p) => p.txt))].slice(0, 336), RH = 48, W = 256, COLS = 8; // höchstens 2048 × 4096
+  const cv = document.createElement('canvas'); cv.width = W * COLS; cv.height = THREE.MathUtils.ceilPowerOfTwo(Math.ceil(names.length * 2 / COLS) * RH); const g = cv.getContext('2d')!;
+  const cellXY = (slot: number) => [(slot % COLS) * W, Math.floor(slot / COLS) * RH];
   names.forEach((t, i) => { const [nm, zeit] = t.split('|');
-    for (const side of [0, 1]) { const y0 = (i * 2 + side) * RH; g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
+    for (const side of [0, 1]) { const [x0, y0] = cellXY(i * 2 + side); g.save(); g.translate(x0, 0); if (side) { g.translate(W, 0); g.scale(-1, 1); }
       … (Pfeil wie bisher) … g.restore();
-      … g.fillText(nm, side ? 36 : 10, …); … g.fillText(zeit, side ? W - 10 : W - 36, …); } });
+      … g.fillText(nm, x0 + (side ? 36 : 10), …); … g.fillText(zeit, x0 + (side ? W - 10 : W - 36), …); } });
@@ UV
-  for (const p of panels) { const i = names.indexOf(p.txt), …
-    for (const side of [0, 1]) { const v0 = 1 - ((i * 2 + side) * RH + RH) / V, v1 = 1 - ((i * 2 + side) * RH) / V, …; const [ua, ub] = side ? [1, 0] : [0, 1];
+  const idx = new Map(names.map((t, i) => [t, i] as [string, number]));
+  for (const p of panels) { const i = idx.get(p.txt); if (i === undefined) continue; …
+    for (const side of [0, 1]) { const [x0, y0] = cellXY(i * 2 + side), U = cv.width, v0 = 1 - (y0 + RH) / V, v1 = 1 - y0 / V, …;
+      const [ua, ub] = side ? [(x0 + W) / U, x0 / U] : [x0 / U, (x0 + W) / U];
```
Zusätzlich als Absicherung in allen drei Atlas-Modulen: `const g = cv.getContext('2d'); if (!g) return null;` (bzw. `0` in `schilder.ts`). Dann fehlen Tafeln, aber die Welt baut weiter.

W2 – Leinwand nach dem Hochladen klein machen (gilt für `schilder.ts`, `wanderweg.ts`, `zone30.ts`, `deckel.ts`):
```diff
   const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
+  tex.onUpdate = () => { cv.width = cv.height = 1; }; // GPU hat die Pixel – Leinwand-Speicher (iOS-Limit) sofort freigeben
```
(Nebenwirkung: Bei WebGL-Kontextverlust fehlt die Textur bis zum Neuladen – das gilt im Spiel ohnehin.)

W3 – Fahrleitung unter Brücken absenken (Deck aus `terrain.bridgeAt`):
```diff
-export function buildFahrleitung(lines: number[][][], railY: …, groundY: …, frei: …): THREE.Mesh | null {
+export function buildFahrleitung(lines: number[][][], railY: …, groundY: …, frei: …, deckAt: (x: number, z: number) => number = () => NaN): THREE.Mesh | null {
@@
-        for (const [h, w] of [[5.5, 0.07], [6.5, 0.05]]) quad([A[0] - uz * w, ya + h, …
+        const cl = (x: number, z: number, y: number) => { const b = deckAt(x, z); return isNaN(b) || b - y > 8 ? 0 : Math.min(0, b - 1.1 - (y + 6.5)); }; // unter einem Deck: Tragseil 1.1 m unter der Fahrbahn
+        const oa = Math.max(-1.6, cl(A[0], A[1], ya)), ob = Math.max(-1.6, cl(B[0], B[1], yb));
+        for (const [h, w] of [[5.5, 0.07], [6.5, 0.05]]) quad([A[0] - uz * w, ya + h + oa, …], […, ya + h + oa, …], […, yb + h + ob, …], […, yb + h + ob, …], WIRE);
```
und in `world.ts` beim Aufruf `(x, z) => terrain.bridgeAt(x, z)` als 5. Argument. Masten unter einem Deck auslassen: In der Mast-Schleife `if (!isNaN(deckAt(x, z))) continue;`.

W4 – Deckel und Zone-30-Zeichen auf der richtigen Ebene:
```diff
-    { const sd = buildSchachtdeckel(d.roads, (x, z) => terrain.height(x, z)); if (sd) group.add(sd); } // 17a
+    { const sd = buildSchachtdeckel(d.roads.filter((r) => !r.b), (x, z) => terrain.height(x, z, terrain.under(x, z, 0) ?? undefined)); if (sd) group.add(sd); } // 17a
```
(Ohne Fahrtrichtung genügt `h = 0` nur ungefähr. Einfacher und sicher: `terrain.ground(x, z)` für Strassen ohne `r.b`, weil Deckel nur auf Strassen liegen, die keine Brücke sind.)

## 16.11.2026 00:15 – Prüflauf (vorgezogen, nur Code-Lesung)

Prüfgegenstand: `640e268..62b6bee` (8 Commits 16a: Brückenumbau, Bahnbrücken, Einmündungen auf Decks, Fussbrücken, Konzert-Zeichen,
Schiffe am KKL, KKL als Hindernis, Velo-Piktogramm, OSM-Strassenmöbel). Worktree `/home/claude/wt-pc`, `claude/13i-gebiet-a` per Fast-Forward
hineingemergt. Zeilen beziehen sich auf `62b6bee`.

**Ausgeführt:** `npx tsc --noEmit -p .` → ok. Zwei Python-Skripte, die nur Daten aus `/home/claude/gta/public/data` lesen: Aufwand der Brücken-Schleifen
und Kreuzungen von Brücken mit Tunnelstrassen. **Nicht ausgeführt** (Auftrag): kein Build, kein Browser, kein Playwright. Alle Befunde
sind daher **Code-Lesung**, keiner ist durch einen Test belegt.

Hinweis: In diesem Bereich hat sich `main.ts` nur bei Konzert, Bahnbrücken und `hg` geändert. Kameras, Vollbild, `grafikNot`, `midPick` und `osmFor`
(Leitungen) sowie `src/real/fuel.ts` liegen vor `640e268` und wurden nicht neu geprüft. `audio.ts` hat sich nur bei `venueNear` geändert.

### Befunde Schwere 1–3

| # | Schwere | Befund | Szenario → falsches Ergebnis | Vertrauen | Beleg |
|---|---|---|---|---|---|
| D1 | 1 (bestehend, nicht neu) | `CanvasRenderingContext2D.roundRect` ohne Rückfall | Altes iPad (iOS/Safari < 16, z. B. iPad Air 2, iPad mini 4 – bleiben auf iOS 15): Mit `konzert.ts` wirft schon die **oberste Ebene von main.ts** (`new Konzerte`) einen TypeError → Spiel startet gar nicht, Ladebild bleibt stehen. Vorher scheiterte es etwas später an `textSprite` (`vehicle.ts:18`) – das Ergebnis ist dasselbe, aber jetzt sogar vor `boot()` und ohne C1-Ausweichen | hoch (API-Verfügbarkeit), unbekannt, ob solche Geräte im Einsatz sind | `src/konzert.ts:7`, `src/main.ts:135`, `src/vehicle.ts:18`, `src/world.ts:958`, `src/bus.ts:179` (bus.ts:94 prüft es bereits) |
| D2 | 3 | Hintergrund-Gegenden ohne Bahnbrücken, OSM-Möbel und Tankstellen | Leicht/Handy (dort kein Upgrade): Jede **nachgeladene** Nachbargegend baut `buildWorld` ohne `railBridges`/`osm`/`fuel`. → In Nachbargegenden fährt der Zug unter Bahnbrücken weiter auf Strassenhöhe durch die Ambulanz (genau der Fehler, den Simon am 15.11. gemeldet hat). Im Echt-Modus erst nach dem Upgrade richtig | hoch | `src/main.ts:1799` (Optionen nur `trees, forestStep, forestMask, aerial, coarse, freeCPU`), vgl. `1351`, `1492` |

Weitere Befunde mit Schwere 1–3 habe ich nicht gefunden. Insbesondere gibt es **keine Falle** (Stelle ohne Weiterkommen): Pfeiler, Stützmauern und
Brückenkörper haben keine Kollision, und `placeCar` setzt immer auf einen Navi-Knoten. NaN-Quellen sind abgesichert: `X()` nur bei echtem Schnitt,
`proj` mit `L2 > 1e-4`, `sl || 1`, `L || 1`, `sb - sa ≥ 3`, `Math.max(1, …)` bei den Widerlagern.

Speicher beim Entladen geprüft: `bruecken-koerper` (eigenes Toon-Material), `real-strassenmoebel` (gemeinsames `realSpar`, wird von `freeGroup`
bewusst geschont) und die Kursschiffe am Steg (in `ships.group`, Freigabe in `activate`, `main.ts:1906`) liegen alle in Gruppen, die `freeGroup`
erreicht. `konzerte` ist global, einmalig vorhanden und klein (2 × 512×192 + 6 × 64² Texturen). `terrain.railBr` gehört zum Terrain der Gegend
und geht mit ihm. **Kein neues Leck gefunden.**

Grundsätze: Neue Netzaufrufe gibt es nur zum eigenen Server (`data/railbridges.json`, `data/osmprops.json`). Briefkasten ohne Posthorn,
keine Logos. Die Konzert-Meldung ist kindgerecht. Kein Scheitern, keine Strafe.

Aufwand Brückenbau (Skript, Luzern): 276 Brückenstücke × 35 000 Strassen-/Gleissegmente ≈ 9.7 Mio. Rechteck-Tests. `deckOf` mit `brs.indexOf`
ergibt 2 × 18 625 × 276 ≈ 10 Mio. Vergleiche. Am Handy schätzungsweise 0.1–0.5 s mehr Ladezeit je Gegend (nicht gemessen) – **unter Schwere 3**.

### Schwere 4–5 (zur Kenntnis, kurz)

| # | Schwere | Befund | Beleg |
|---|---|---|---|
| D3 | 4 | Hebung auch über **Tunnelstrassen** (`under` filtert `tu` nicht): Steinhof- und Berglistrasse sowie 2 Fusswege über dem Sonnenbergtunnel, Fussweg über dem Schlund/Ruopigen-Tunnel (Skript: 6 Kreuzungen). Liegt der Tunnel tief, wird die Brücke unnötig bis 5 m gehoben → Buckel mit Rampen. Dasselbe gilt für Bahntunnels (`railAll` hat keine Tunnel-Kennung) | `src/world.ts:783` |
| D4 | 4 | Strasse mit **beiden** Enden an gehobenen Ketten: Wegen `break` wird nur ein Ende Rampe, am anderen Ende entsteht eine Stufe bis 7 m. Mit der neuen Regel `ref < b − 2.4` (`terrain.ts:113`) fährt die Ambulanz dann **unter** dem Deck am Boden weiter (über Gleis/Flussbett), statt es zu befahren. Kein Hänger, Reset hilft | `src/world.ts:798-805` |
| D5 | 4 | Reset/Startposition in einer Unterführung: `placeCar` ohne `ref` → `max(Deck, Boden)` → Ambulanz steht **auf** dem Deck quer zur Brücke und fällt beim Losfahren herunter. Verkehr (`hy`, erstes Bild ohne `ty`) und Fussgänger (`traffic.ts:278`, ohne `ref`) laufen in Unterführungen oben auf dem Deck | `src/main.ts:1031`, `src/traffic.ts:261`, `278` |
| D6 | 4 | OSM-Möbel: `frei = mask.at !== 2` schliesst nur Häuser aus. Hydrant, Radarkasten und 6 m breite Sammelstelle können **mitten auf der Fahrbahn oder im See** stehen (der Kommentar verspricht «nicht auf der Fahrbahn»). Die Ambulanz fährt hindurch | `src/world.ts:1616`, `src/real/osmprops.ts:245` |
| D7 | 5 | Seitenstrassen, die mitten auf einem Rampenstück einmünden (OSM teilt Wege nicht an Einmündungen), bleiben am Boden → Stufe bis Δ oder Durchfahrt unter der Rampe. Rampen verlieren Markierung und Trottoir (`r.b` → else-Zweig) | `src/world.ts:798-806`, `891` |
| D8 | 5 | `(ey - ge > 0.5 \|\| true)` – Bedingung ohne Wirkung (immer Widerlager). G8-Ausnahme `(r as any).ramp` wirkt nicht, weil `cityData.roads` keine Rampen enthält (die gibt es nur in der lokalen Kopie `d`) | `src/world.ts:853`, `src/main.ts:1628` |

### Patch-Vorschläge

D1 – ein Rückfall ganz oben in `main.ts`, vor `new Konzerte` (hilft auch `vehicle.ts`, `world.ts` und `bus.ts`):
```diff
+// Safari < 16 kennt roundRect nicht → einfaches Rechteck statt Absturz beim Start
+if (typeof CanvasRenderingContext2D !== 'undefined' && !(CanvasRenderingContext2D.prototype as any).roundRect)
+  (CanvasRenderingContext2D.prototype as any).roundRect = function (x: number, y: number, w: number, h: number) { this.rect(x, y, w, h); };
 const konzerte = new Konzerte([
```

D2 – Hintergrund-Gegenden mit denselben Daten bauen:
```diff
-  try { return await buildWorld(data, t, () => { /* still im Hintergrund */ }, undefined, undefined, props ? JSON.parse(JSON.stringify(props)) : undefined, { trees: 1200, forestStep: 14, forestMask: fm, aerial: tex, coarse: true, freeCPU: true }); }
+  try { return await buildWorld(data, t, () => { /* still im Hintergrund */ }, undefined, undefined, props ? JSON.parse(JSON.stringify(props)) : undefined, { trees: 1200, forestStep: 14, forestMask: fm, aerial: tex, coarse: true, freeCPU: true,
+    railBridges: railBrFor(id), osm: osmFor(id), fuel: fuelFor(id) }); }
```
(Falls `aerialMid: midsFor(id)` dort absichtlich fehlt – Speicher am Handy –, so lassen.)

D3 – Tunnelstrassen nicht als «darunter» zählen:
```diff
-      ...d.roads.filter((r) => !r.b && DRV.has(r.c) && r.p.length >= 2).map((r) => [r.p, 5.0] as [number[][], number])];
+      ...d.roads.filter((r) => !r.b && !(r as any).tu && DRV.has(r.c) && r.p.length >= 2).map((r) => [r.p, 5.0] as [number[][], number])];
```
(Für Bahntunnels müsste die Kennung `tun` aus trains.json herangezogen werden – erst prüfen, ob es Bahntunnels unter Brücken gibt.)

D4 – beide Enden in eine Rampe (Deck zu Deck) statt `break`:
```diff
-        for (const e of [0, 1]) { const node = e ? q.p[q.p.length - 1] : q.p[0], nl = nodeLift.get(bkey(node)); if (!nl) continue;
+        const nl0 = nodeLift.get(bkey(q.p[0])), nl1 = nodeLift.get(bkey(q.p[q.p.length - 1]));
+        if (nl0 && nl1) { const ramp: any = { ...q, b: 1, ramp: 1 }; rampH.set(ramp, [nl0[0], nl1[0]]); roads[qi] = ramp; nRamp++; changed = true; continue; }
+        for (const e of [0, 1]) { const node = e ? q.p[q.p.length - 1] : q.p[0], nl = nodeLift.get(bkey(node)); if (!nl) continue;
```

D6 – nur auf freier Fläche neben der Fahrbahn:
```diff
-    { const m = buildOsmMoebel(o, gy, (x, z) => mask.at(x, z) !== 2);
+    { const m = buildOsmMoebel(o, gy, (x, z) => mask.at(x, z) === 0 && !mask.isRoad(x, z));
```

D5 – Ebene beim Platzieren wählen (minimal: bei hohem Deck am Boden bleiben, wenn das Deck nicht in Fahrtrichtung weiterläuft):
```diff
-  { const t = terrain.tunnelAt(car.x, car.z); car.y = terrain.height(car.x, car.z, !isNaN(t) && terrain.ground(car.x, car.z) > t + 3 ? -1e6 : undefined); }
+  { const t = terrain.tunnelAt(car.x, car.z), g = terrain.ground(car.x, car.z), b = terrain.bridgeAt(car.x, car.z);
+    const unten = !isNaN(b) && b - g > 3.2 && isNaN(terrain.bridgeAt(car.x + Math.sin(car.heading) * 8, car.z + Math.cos(car.heading) * 8)); // Unterführung: Deck läuft quer
+    car.y = terrain.height(car.x, car.z, !isNaN(t) && g > t + 3 ? -1e6 : unten ? g : undefined); }
```
(Annahme: `heading` 0 = +z, wie in `placeCar`/`atan2(dx, dz)`. Für eine breite Brücke reicht die 8-m-Probe nicht immer – Heuristik, Vertrauen mittel.)

### Status der früheren Befunde (nur Hinweis)

Im Code sieht man inzwischen `freeGroup` (`main.ts:1877`) mit Schonung von `realSpar`/`realGlow` und die Freigabe beim Wechsel (`main.ts:1906`)
→ N6/C5 ist **weitgehend erledigt**. Die übrigen N-/C-Befunde vom 15.11. habe ich in diesem Lauf nicht neu geprüft.

## 15.11.2026 01:40 – Prüflauf

Prüfgegenstand: Branch `claude/13i-gebiet-a` @ `050fce1` (Commits der letzten 24 h: 15a Fassaden-Atlas, Umland-Ausschnitt, Funkhalt,
Schwierigkeitswahl, Baustellen-Bremse, P-A Lauf 2–4, P-B Lauf 1–2). Worktree `/home/claude/wt-pc`, Branch `par/pruefung`.
Spielcode nicht verändert. Zeilenangaben beziehen sich auf `050fce1`.

### Was tatsächlich ausgeführt wurde

| Schritt | Ergebnis |
|---|---|
| `npm ci` | ok (0 vulnerabilities) |
| `npx tsc --noEmit -p .` | ok, keine Fehler |
| `OUT=dist_pc sh tools/dist.sh` | ok, 38 MB; Hinweis «Region a1…a20/nord… fehlt» – im Worktree liegen nur Luzern-Daten (keine Symlinks angelegt) |
| `tests/par/pc_lauf.py 8773` | **ein** Seitenaufruf, Headless-Chrome (SwiftShader, `nice -n 10`), `?test&noshadow&q=leicht&notraffic&diffwahl&funkhalt`, Luzern. Laufzeit ca. 1 min |
| Skript Grenzen-Paare (nur Lesen der Daten in `/home/claude/gta/public/data`) | REG_BOUNDS = `meta.bounds` aller 25 Gegenden (exakt gleich); Überlappungen je Paar ermittelt (siehe C7) |
| Alles übrige | Code-Lesung mit konkreten Szenarien |

Messwerte aus `pc_lauf.py` (Leicht-Stufe, Startansicht Luzern, ohne Verkehr):
- Schwierigkeitswahl: Startknopf `display:block`, `opacity:0`, `pointer-events:none`; Fokus «Mittel», Pfeil rechts → «Schnell»; Ladeschritte `done:true`, 100 % (verträgt sich mit P-B `loadSteps.ts`).
- **Zweimal Enter im Abstand von 120 ms → 2 Willkommens-Meldungen und Seitenfehler `Cannot read properties of null (reading 'remove')`** (Befund N3).
- Speichern: `diff:"profi"`, `diffChosen:true` ok.
- FPS-Zeile: `728 Draw Calls · 1242k Dreiecke` (gerendert, Leicht).
- Geometrie im Szenengraf (nicht gerendert, ganze Gegend, Instanzen mitgezählt): gesamt 5.94 Mio.; grösste Posten: `forest` 2.26 Mio. (855 Netze), `ground` 1.50 Mio. (323), `roads-asphalt` 0.58 Mio. (279), `baeume-arten` (P-A) 0.23 Mio. (7), `hecken` 0.21 Mio. (20), `roads-cobble` 0.19 Mio., `props` 0.17 Mio. (245). Die P-A-Kleinteile (`real-statisch`, Kleinmöbel) sind nicht unter den 18 grössten.
- Funkhalt: Welt steht (Position unverändert), Tempo bleibt 12.5 m/s, Tacho zeigt «45 km/h» während des Halts. Pause während Funk: Angebot bleibt offen, nach Pause-Ende annehmbar. Schnellreise-Karte (T) während Funk: Angebot bleibt, nach Schliessen (Esc) mit E annehmbar → `toScene`. Kein Zustand gefunden, in dem das Angebot offen bleibt und nicht beantwortet werden kann.

### Befunde (sortiert nach Schwere)

Schwere: 1 Absturz/Hänger · 2 Spielstand-Verlust · 3 Leistungseinbruch · 4 sichtbarer Fehler · 5 Kosmetik.
**Keine Befunde der Schwere 1 oder 2 gefunden.**

| # | Schwere | Befund | Szenario → falsches Ergebnis | Vertrauen | Beleg |
|---|---|---|---|---|---|
| N1 | 3 (+4) | Start-Gegend wird beim Zurückkehren ein zweites Mal «echt» gebaut – ohne Luftbild und Waldmaske | Echt-Modus, Start Luzern → nach Norden fahren (Wechsel) → zurück nach Luzern. `activate(luzern)`: Start-Slot hat kein `echt`, kein `tex`, kein `fm` → `upgradeSlot` lädt b3d/ground (≈ 60 MB) neu und baut Stufe B ein zweites Mal, dann `swapWorld` mit `tex = undefined`, `fm = undefined`, ohne `aerialHr` → Ruckler/Speicherspitze, danach Boden ohne Luftbild und ohne scharfes Kernzonen-Luftbild | hoch (Pfad), mittel (wie stark es aussieht) | Code: `main.ts:1329` (Slot ohne echt/tex/fm), `main.ts:1794`, `main.ts:1717-1721`, `main.ts:1415` (`aerialHr` nur bei `globals`) |
| N2 | 3 | Fehlende/defekte Nachbargegend: Endlos-Neuversuch alle 0.5 s **und** Ambulanz für immer im Schritttempo (= C4, verschärft durch Baustellen-Bremse) | Ordner z. B. `data/a19/` fehlt auf dem Server (dist.sh meldet nur «HINWEIS», bricht nicht ab). Fahrt Richtung a19: `loadSlot` scheitert, `finally` setzt `loadingSlot=''`, nächster Tick lädt wieder (Netz + Bau-Hinweis blinkt). `streamCap` deckelt 40 m vor der Grenze auf 4 m/s, in der Gegend auf 3 m/s – ohne Ende | hoch | Code: `main.ts:1819-1829`, `main.ts:1802-1804` |
| N4 | 3 | Wechsel ohne Überlappung → Pendeln (= C7, offen) | a3/a19 (Linie z = −14 600) und a6/a8 (x = −8 400) berühren sich ohne Überlappung. Strasse, die die Linie mehrmals kreuzt: jedes Kreuzen → `activate()` (neuer Verkehr, Busse, Züge, Einsätze, Herzen, Speichern, Meldung «Willkommen …») bis zu 2× pro Sekunde | hoch (Daten), mittel (wie oft Strassen die Linie kreuzen) | Skript Grenzen-Paare; `main.ts:1813-1817` (keine Hysterese) |
| N5 | 3 | Doppelter Bau bei Schnellreise während Hintergrund-Laden (= C3, offen) | Hintergrund lädt Gegend X (`loadingSlot = X`), Kind öffnet Schnellreise nach X → zweites `loadSlot(X)`. Erstes Ergebnis: `slots.set(X, s1)` + in Szene; zweites: `slots.set(X, s2)` überschreibt, `s1.world.group` bleibt für immer in der Szene (doppelte Dreiecke, Z-Fighting, nie entladen) | hoch | Code: `main.ts:1119-1123` vs. `main.ts:1825` |
| N6 | 3 | Speicher wächst bei Gegendwechsel (= C5, teilweise) | Jeder Wechsel: alter `Traffic`, `Buses`, `Trains`, `fun/animals/ships/boats` nur `scene.remove`, kein `dispose`. P-A-Verkehrsautos teilen sich jetzt Geometrie/Material (weniger Verlust), Fussgänger/Busse/Züge/Herzen nicht. `unloadSlot` gibt Geometrie/Material frei, aber nicht die Instanz-Puffer der InstancedMeshes (`o.dispose()` fehlt); zudem gibt es das **gemeinsame** `realMaterial()` frei → Shader wird beim nächsten Bild neu übersetzt (kurzer Ruckler, am Handy spürbar) | mittel | Code: `main.ts:1774-1782`, `main.ts:1757-1760`, `src/real/spar.ts:15-37` |
| N7 | 3/4 | Upgrade prüft Id statt Slot-Objekt (= C8, offen) | Echt-Modus: Gegend X wird aktiviert → Upgrade läuft; X wird entladen und neu geladen, bevor das Upgrade fertig ist → `slots.has(X)` ist wahr (neues Objekt), Upgrade setzt `s.world` am alten Objekt, `nw.group` bleibt verwaist in der Szene | mittel (selten) | Code: `main.ts:1720-1724` |
| N8 | 4 | Mehrspieler: Baustellen-Bremse und Entladen nur nach Spieler 1 | Splitscreen, P2 fährt in eine noch nicht geladene Gegend → P2 kriecht mit 14 km/h, weil nur P1 Nachladen auslöst. Oder: P2 steht in einer geladenen Nachbargegend, P1 fährt weg → `streamTrim` misst nur ab P1 und entlädt die Gegend unter P2 → P2 fährt im Leeren mit 3 m/s (Reset hilft) | hoch | Code: `main.ts:1800-1805` (je Spieler), `main.ts:1811`, `1819-1822`, `1836-1839` (nur `players[0]`) |
| N9 | 4 | Spital-Ring und Luksi mit Kissen bleiben an der Start-Gegend (= C10, teilweise) | Wechsel in Nachbargegend, Patient ins dortige Spital: blauer Ring und Luksi-Sprite fehlen dort (stehen weiter am Kinderspital Luzern); Schild wird verschoben, Ziel stimmt | hoch | Code: `main.ts:1377-1384` (lokale Konstanten in `boot`), `main.ts:1783-1789` |
| N3 | 4 | Doppelstart bei zweimal Enter/Leertaste | Startbild, Enter auf Schwierigkeit, innert 600 ms nochmals Enter → `start()` zweimal: zwei Willkommens-Meldungen, `radioKick`-Listener doppelt, Seitenfehler (`$('#start')` ist null) | hoch | **Test** `pc_lauf.py`: `willkommen_toasts: 2`, Fehler `reading 'remove'`; Code `main.ts:1440-1449`, `1482` |
| N10 | 4 | Alte Spielstände: Schwierigkeit wird beim ersten Start nach dem Update überschrieben; Controller kann nur «Mittel» | Spielstand mit `diff:'entdecken'` (Kind bis 6, Navi-Linie), kein `diffChosen` → Wahl erscheint, Fokus auf «Mittel»; Controller (A) oder Enter → `diff = 'rettung'`, Navi-Linie weg, bis 150 km/h. Mit Controller lassen sich Einfach/Schnell gar nicht wählen (Pfeile nur Tastatur) | hoch | Code: `main.ts:1454`, `1471`, `1476`, `1481`, `1486` |
| N11 | 5 | Motor heult beim Funkhalt weiter | Funk kommt bei 150 km/h: Welt steht, aber `updateEngine` wird nicht mehr aufgerufen → Motorton bleibt auf Vollgas-Höhe, Tacho zeigt Tempo (Test: «45 km/h» im Stand). Pause macht es richtig (`updateEngine(0,0)`) | hoch | **Test** (Tacho), Code `main.ts:1159-1161`, `1215`, `983` |
| N12 | 5 | Geräuschkulisse: Wald nur nach Waldmaske der Start-Gegend | `bindAmbience.forest` liest `forestMask` (global), `activate()` setzt sie nicht → in Nachbargegenden keine/falsche Waldvögel | hoch | Code: `main.ts:1321`, `1767-1796` |
| N13 | 5 | Kurzes Loch im Umland beim Einblenden | Neue Nachbargegend: `linkSlots` schneidet das Umland sofort aus, die Teile der neuen Gegend erscheinen aber nach und nach (2–4 pro Bild) → für einige Bilder Himmel sichtbar, wo vorher grünes Umland lag | niedrig | Code: `main.ts:1825`, `1730-1734` |

Geprüft und **in Ordnung** (Code-Lesung):
- `world.clip` wird nach `swapWorld` (`main.ts:1434`) und nach `upgradeSlot` (`main.ts:1724`) über `linkSlots` gefüllt, jeweils synchron vor dem nächsten Bild; 6 Rechtecke reichen (höchstens 4 Gegenden). REG_BOUNDS = Datengrenzen → kein Loch durch zu grosse Rechtecke.
- Fassaden-Atlas `v + 64·Typ`: OSM-Pfad v ∈ [0, 47], b3d-Pfad v ∈ [−15.9, 47.9] → `floor((v+16)/64)` ergibt immer den richtigen Typ; Ladengeschoss und `withNight`/`withRows` verketten korrekt (`world.ts:1072`, `2145`, `2728-2747`).
- `hrOn`: bleibt 0, wenn `aerial_hr.jpg` fehlt; Abfrage endet nach 180 s (`world.ts:2624-2625`).
- `vcap`: wird jedes Bild neu gesetzt → hängt nicht nach Schnellreise; ohne STREAM bleibt `Infinity`. Rückwärts wird nicht gedeckelt (nur `speed > vcap`) – unkritisch.
- Funkhalt: Autosave/Timer pausieren während des Angebots (gewollt), `visibilitychange` speichert trotzdem; Pause, Schnellreise-Karte, Tab-Wechsel führen nicht in einen Zustand ohne Antwortmöglichkeit (Test). Minispiel und Funk schliessen sich aus (`onsite`).
- Zirkuläre Importe `world.ts ↔ src/real/*`: keine Verwendung von `toon`/`NIGHT` auf Modulebene in `src/real/*` → kein TDZ-Fehler; Build ok.
- P-A Abend-Modus: Nachtlicht über die Uniform `NIGHT`, kein mehrfaches Umhüllen der Materialien bei `setEvening`.
- P-B `loadSteps.ts`: «fertig» hängt an `style.display` des Startknopfs → mit `opacity:0` der Schwierigkeitswahl korrekt (Test).
- C1/C6 eingebaut (siehe unten).

### Patch-Vorschläge (minimal)

N1 – Start-Slot vollständig anlegen:
```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ boot()
-  slots.set(REGION, { id: REGION, dir: DIR, data, props, terrain, world, nav, bus: await pBus, trains: await pTrains, ma: missionsAP ? await missionsAP : null });
+  slots.set(REGION, { id: REGION, dir: DIR, data, props, terrain, world, nav, bus: await pBus, trains: await pTrains, ma: missionsAP ? await missionsAP : null,
+    tex: aerialTex, fm: forestMask, echt: !!pB }); // Stufe B baut stageB() – nicht ein zweites Mal über upgradeSlot
```

N2 / C4 – gescheiterte Gegend merken, Bremse dort aufheben:
```diff
+const loadFailed = new Map<string, number>(); // Gegend → Zeitpunkt (s) des nächsten Versuchs
 function streamCap() {
-    const loaded = (x: number, z: number) => { const r = regionAt(x, z); return r.length === 0 || r.some((k) => slots.has(k)); };
+    const loaded = (x: number, z: number) => { const r = regionAt(x, z); return r.length === 0 || r.some((k) => slots.has(k) || loadFailed.has(k)); };
@@ streamTick
-    let want = ''; for (const [x, z] of look) { const k = regionAt(x, z).find((r) => !slots.has(r)); if (k) { want = k; break; } }
+    const nowS = performance.now() / 1000;
+    let want = ''; for (const [x, z] of look) { const k = regionAt(x, z).find((r) => !slots.has(r) && !((loadFailed.get(r) ?? 0) > nowS)); if (k) { want = k; break; } }
@@
-      }).catch((e) => { console.warn('[welt] laden fehlgeschlagen', want, e); ind.remove(); }).finally(() => { loadingSlot = ''; }); }
+      }).catch((e) => { console.warn('[welt] laden fehlgeschlagen', want, e); ind.remove(); loadFailed.set(want, performance.now() / 1000 + 60); }).finally(() => { loadingSlot = ''; }); }
```
(Am Feldrand hält dann die Maske der aktiven Gegend die Ambulanz auf – wie vor 15a.)

N4 / C7 – Hysterese beim Wechsel (auch ohne Überlappung):
```diff
-  if (B && !(c.x > B[0] && c.x < B[2] && c.z > B[1] && c.z < B[3])) {
+  const H = 25; // erst 25 m hinter der eigenen Grenze wechseln → kein Pendeln an Linien ohne Überlappung (a3/a19, a6/a8)
+  if (B && !(c.x > B[0] - H && c.x < B[2] + H && c.z > B[1] - H && c.z < B[3] + H)) {
     const here = regionAt(c.x, c.z).find((k) => slots.has(k));
```
(Voraussetzung: die Maske der aktiven Gegend lässt 25 m über die Grenze fahren – über `mask.nb` der Nachbarn gegeben, im Test prüfen.)

N5 / C3 – Schnellreise wartet auf laufendes Hintergrund-Laden:
```diff
+let loadingP: Promise<Slot> | null = null;
@@ switchTo
-        const have = slots.get(region); if (have) { arrive(have); return; }
+        const have = slots.get(region); if (have) { arrive(have); return; }
+        if (loadingSlot === region && loadingP) { void loadingP.then(() => { const s = slots.get(region); if (s) arrive(s); }); return; }
@@ streamTick
-      loadSlot(want).then(async (s) => {
+      (loadingP = loadSlot(want)).then(async (s) => {
```
(Und Nachladen in `streamTick` erst, wenn keine Schnellreise lädt – `loadingSlot` wird dort schon gesetzt.)

N6 / C5 – beim Wechsel freigeben, gemeinsames Material schonen:
```diff
+const SHARED = new Set(['realSpar', 'realGlow']);
+function freeGroup(g: THREE.Object3D) { g.traverse((o: any) => { if (o.isInstancedMesh) o.dispose(); if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
+  if (o.material) for (const m of [].concat(o.material) as any[]) if (!SHARED.has(m.name)) { m.map?.dispose?.(); m.dispose?.(); } }); }
 function unloadSlot(s: Slot) {
   scene.remove(s.world.group); scene.remove(s.world.tunnels);
-  for (const g of [s.world.group, s.world.tunnels]) g.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) { (m as any).map?.dispose?.(); (m as any).dispose?.(); } });
+  for (const g of [s.world.group, s.world.tunnels]) freeGroup(g);
@@ activate
-  if (traffic) { scene.remove(traffic.group); traffic = new Traffic(
+  if (traffic) { scene.remove(traffic.group); freeGroup(traffic.group); traffic = new Traffic(
-  if (buses) { scene.remove(buses.group); buses = null; } if (busWires) { scene.remove(busWires); busWires = null; }
+  if (buses) { scene.remove(buses.group); freeGroup(buses.group); buses = null; } if (busWires) { scene.remove(busWires); freeGroup(busWires); busWires = null; }
-  if (trains) { scene.remove(trains.group); trains = null; }
+  if (trains) { scene.remove(trains.group); freeGroup(trains.group); trains = null; }
-  for (const o of [fun, animals, ships, boats]) if (o) scene.remove(o.group);
+  for (const o of [fun, animals, ships, boats]) if (o) { scene.remove(o.group); freeGroup(o.group); }
```
(Zwischengespeicherte Geometrien in `src/real/*` mit `g.userData.shared = true` markieren – Dateihoheit P-A. Gemeinsame Textur-Caches in world.ts vorher prüfen.)

N7 / C8 – Objekt statt Id prüfen:
```diff
-    .then((nw) => { if (!slots.has(s.id)) return; setHospital(nw, s.id);
+    .then((nw) => { if (slots.get(s.id) !== s) { nw.group.traverse((o: any) => o.geometry?.dispose()); return; } setHospital(nw, s.id);
@@
-      else { enableShadows(nw.group); void addGradually(nw.group, nw.tunnels).then(() => { if (!slots.has(s.id)) { scene.remove(nw.group); scene.remove(nw.tunnels); return; }
+      else { enableShadows(nw.group); void addGradually(nw.group, nw.tunnels).then(() => { if (slots.get(s.id) !== s) { scene.remove(nw.group); scene.remove(nw.tunnels); return; }
```

N8 – Mehrspieler: Nachladen/Entladen für alle Spieler:
```diff
 function streamTrim(keep: number) {
-  const c = players[0].car;
   while (slots.size > keep) {
-    const far = [...slots.values()].filter((s) => s.id !== REGION && !(target && regionAt(target[0], target[1]).includes(s.id))).map((s) => { const b = REG_BOUNDS[s.id]; const dx = Math.max(b[0] - c.x, 0, c.x - b[2]), dz = Math.max(b[1] - c.z, 0, c.z - b[3]); return [Math.hypot(dx, dz), s] as [number, Slot]; }).sort((a, b) => b[0] - a[0]);
+    const dist = (b: number[]) => Math.min(...players.map(({ car: c }) => Math.hypot(Math.max(b[0] - c.x, 0, c.x - b[2]), Math.max(b[1] - c.z, 0, c.z - b[3]))));
+    const far = [...slots.values()].filter((s) => s.id !== REGION && !(target && regionAt(target[0], target[1]).includes(s.id))).map((s) => [dist(REG_BOUNDS[s.id]), s] as [number, Slot]).sort((a, b) => b[0] - a[0]);
```
und in `streamTick` Schritt 2 die `look`-Punkte für alle `players` sammeln (nicht nur `players[0]`).

N9 / C10 – Ring und Luksi beim Wechsel mitnehmen:
```diff
-  const lk = new THREE.Sprite(
+  lk = new THREE.Sprite(
-  const bay = new THREE.Mesh(
+  bayRing = new THREE.Mesh(
+// oben: let lk: THREE.Sprite | null = null, bayRing: THREE.Mesh | null = null;
 function placeHospSign() {
   if (hospSign) scene.remove(hospSign);
+  if (lk) lk.position.set(hospitalBay[0] + 7, gy(hospitalBay[0] + 7, hospitalBay[1]) + 0.2, hospitalBay[1]);
+  if (bayRing) bayRing.position.set(hospitalBay[0], gy(hospitalBay[0], hospitalBay[1]) + 0.6, hospitalBay[1]);
```

N3 – Start nur einmal:
```diff
+let started = false;
 function start() {
+  if (started) return; started = true;
   goFullscreen();
```

N10 – alte Spielstände nicht überschreiben, Fokus auf bisherige Wahl:
```diff
 function diffWahl() {
+  if (!save.diffChosen && Object.keys(save.best || {}).length) { save.diffChosen = true; writeSave(); } // wer schon gespielt hat, hat gewählt
   if (save.diffChosen || (TEST && !/[?&]diffwahl/.test(location.search)) || document.getElementById('diff-wahl')) return;
@@
-  (row.children[1] as HTMLElement).focus();
+  ((row.querySelector(`[data-diff="${save.diff}"]`) || row.children[1]) as HTMLElement).focus();
```
Controller links/rechts: in `startPoll` Steuerkreuz auswerten (GP.LEFT/RIGHT) wie die Pfeiltasten in `main.ts:1481`.

N11 – Motor im Funkhalt leise:
```diff
-  if (world && !paused && funkHalt && !overlayOpen) { if (hit('accept')) acceptOffer(); else if (hit('decline')) declineOffer(); }
+  if (world && !paused && funkHalt) { updateEngine(0, 0); if (!overlayOpen) { if (hit('accept')) acceptOffer(); else if (hit('decline')) declineOffer(); } }
```

N12 – Waldmaske beim Wechsel mitnehmen:
```diff
   world = s.world; terrain = s.terrain; cityData = s.data; propsData = s.props ? JSON.parse(JSON.stringify(s.props)) : null;
+  if (s.fm) forestMask = s.fm;
```

### Status der alten Befunde C1–C10

| Befund | Status | Beleg |
|---|---|---|
| C1 Start blockiert bei fehlender Gegend | **erledigt** – Ausweichen einmal je Tab nach Luzern, danach Fehlermeldung. Einschränkung: hilft nur bei Ausnahme, nicht bei einer Anfrage, die nie antwortet; setzt bei jedem Boot-Fehler (auch kurzem Netzfehler) die Position zurück | `main.ts:1663-1669` |
| C2 zu viele Gegenden (Slots) | **teilweise** – `streamTrim(keep-1)` vor dem Laden, entlädt aber nur Gegenden > 1.5 km; an Ecken mit nahen Nachbarn weiter 4 Gegenden; Schnellreise lädt vor dem Entladen (kurz bis 4) | `main.ts:1822`, `1832`, `1835-1840`, `1121-1122` |
| C3 doppelter Bau bei Schnellreise während Hintergrund-Laden | **offen** (N5) | `main.ts:1119-1123` |
| C4 endloser Neuversuch bei Ladefehler | **offen**, durch Baustellen-Bremse verschärft (N2) | `main.ts:1829`, `1803-1804` |
| C5 GPU-Speicher wächst bei Gegendwechsel | **teilweise** – P-A-Verkehrsautos teilen Geometrie/Material; sonst weiter kein `dispose` (N6) | `main.ts:1774-1782` |
| C6 Speichern beim Wegwechseln | **erledigt** | `main.ts:991-992` |
| C7 Grenzen ohne Überlappung → Pendeln | **offen** – a3/a19 und a6/a8 weiterhin 0 m Überlappung (N4) | Skript Grenzen-Paare, `main.ts:1813-1817` |
| C8 upgradeSlot prüft Id statt Slot-Objekt | **offen** (N7) | `main.ts:1720-1724` |
| C9 | nicht im Auftrag genannt; das Projekt-Dokument `claude/PRUEFUNG-PC.md` ist in dieser Sitzung nicht lesbar → nicht geprüft | – |
| C10 Spital-Markierungen/hospitalBay über Grenzen | **teilweise** – `hospitalBay` und Schild folgen, Ring und Luksi-Sprite nicht (N9) | `main.ts:1377-1384`, `1688-1693`, `1783-1789` |

### Nicht geprüft

- Echt-Stufe, Schatten, Verkehr, Handy-Gerät, Touch: nicht ausgeführt (Auftrag: nur Leicht, ein Chrome). Dreiecke der Echt-Startansicht (2.475 Mio.) nicht nachgemessen; die Posten oben gelten für Leicht.
- Streaming mit echten Nachbargegenden (Wechsel, Entladen, Schnellreise, Upgrade): kein Lauf, nur Code-Lesung (keine Nachbardaten im Worktree verlinkt). N1, N2, N4–N8 sind daher **nicht durch Tests belegt**.
- Speicherverlauf (GPU/JS) über viele Wechsel: nicht gemessen.
- Gamepad-Eingaben: nicht ausgeführt (nur Code).
- Optik von Fassaden-Atlas, Umland-Ausschnitt, Rettungswagen (P-A Lauf 4), Handy-Layout `style.css`: keine Bildprüfung.
- Wechselklanghorn: nur Code (Frequenzen/Zyklus 2.8 s laut Kommentar), nicht angehört.
- `tests/par/pc_lauf.py` prüft «fährt nach Annehmen weiter» nicht aussagekräftig: die Schnellreise-Karte setzt das Tempo absichtlich auf 0 (`main.ts:1109`); `faehrt_weiter:false` ist deshalb kein Befund.
