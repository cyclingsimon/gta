# P-C Unabhängige Prüfung & Fehlerjagd

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
