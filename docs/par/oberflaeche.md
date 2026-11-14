# P-B «Atmosphäre, Ton, Oberfläche» – Laufprotokoll

## 14.11.2026 20:05 – Lauf 1

Branch `par/oberflaeche` (Worktree `/home/claude/wt-pb`), Basis `claude/13i-gebiet-a`, Stand f936979 hineingemergt (Fast-Forward).

### Gemacht

**a) Geräuschkulisse nach Ort** – neu `src/ambience/` (alles WebAudio-Synthese, keine Dateien, keine Netzaufrufe):
- `synth.ts`: Bausteine – Rauschschleifen, vorbeifahrendes Auto (Doppler, Stereo-Wanderung), Möwe, Singvogel/Amsel, Kuhglocke (blechern, unharmonische Teiltöne), Kirchenglocke (Unterton/Prim/Terz/Quint/Oktave), Bahnhof-Gong, Zug mit Schienenstössen und Bremsquietschen, künstliche Tunnel-Raumantwort.
- `zones.ts`: feste Orte – Hofkirche (488, −437, aus OSM-Gebäude «St. Leodegar im Hof»), Bahnhöfe (Luzern 203/214 + 6 Nachbarbahnhöfe aus main.ts + alle «Bahnhof …»-Treffpunkte aus regionsA.ts), Ortschaften (places Rang ≥ 2 aller city.json) und Seeufer-Punkte als Ersatz.
- `index.ts`: Schichten Stadt / See / Wald / Land / Bahnhof / Tunnel mit Gewichten 0..1, alle 0,4 s neu bestimmt (bei Sprung > 200 m sofort). Mit Welt-Abfrage (`bindAmbience`, siehe Einbau) zählt es 37 Rasterpunkte im Umkreis 140 m: Wasser → See, Gebäude → Stadt, Waldmaske → Wald, Rest → Land (Kuhglocken). Ohne Abfrage: Ersatz über Ortskerne/Seeufer-Punkte (kein Wald, kein Tunnel).
- Hofkirche: zur vollen Stunde (Geräteuhr, Annahme) zwei helle Vorschläge + 1–12 Stundenschläge, hörbar bis 1,3 km, leiser/dumpfer mit Distanz.
- Tunnelhall: Effekte (Motor, Sirene, Hupe) laufen im Tunnel zusätzlich über einen Convolver (nur verbunden, solange man im Tunnel ist) + tiefes Röhrenbrummen; Aussenkulisse aus.
- Lautstärke: eigener Bus 0,5 am Master → «Ton aus» (Master = 0) wirkt überall; bei «Ton aus» oder verborgenem Tab werden auch keine Ereignisse erzeugt. Ducking: Spielmusik/Radio −45 %, Konzert Schüür/KKL bis −85 %, Sirene −40 %, Pause-Menü ×0,35 (eigener 500-ms-Takt, weil die Hauptschleife in der Pause ruht).
- Anbindung **ohne Änderung an main.ts**: `audio.ts` ruft `initAmbience()` in `initAudio()` und `updateAmbience()` am Ende von `updateVenues()` (läuft schon jedes Bild).
- Test-Haken: `window.__amb.state() / force(schicht|null) / chime(n) / gong() / bind(probe) / unbind()`.

**Sirene = Schweizer Wechselklanghorn** (`src/audio.ts`): zwei Töne im Verhältnis 3:4 – 586,7 Hz und 440 Hz, je 0,7 s, Zyklus 2 hoch + 2 tief = 2,8 s, beginnt bei jedem Einschalten neu mit dem hohen Ton; 28-Hz-Glättung statt Knacks; Sägezahn + Rechteck durch Tiefpass 2,2 kHz (blechern), Lautstärke unverändert 0,11.
- Quelle (Vorschrift): VTS Anhang 11 Ziff. 3 – Grundfrequenzen 360–630 Hz, Verhältnis 3:4 (Toleranz −3/+7 %), Zyklus 2 hohe + 2 tiefe Töne 2,5–3,5 s, Pause ≤ 0,8 s, Neubeginn bei jeder Betätigung: https://justement.ch/de/doc/act/ch/741_41/annex_11 (amtlich: SR 741.41, fedlex). Schaltung nur mit Blaulicht: https://www.lexfind.ch/tolv/250727/de
- **Annahme** (Vertrauen mittel): die konkreten Töne a′ (440 Hz) / d″ (586,7 Hz). Die Vorschrift legt nur Bereich und Verhältnis fest; a′–d″ liegt mittig darin und gilt verbreitet als «Tatü-Tata»-Lage, eine Quelle mit genauen Herstellerfrequenzen habe ich nicht gefunden.

**Weitere Annahmen (markiert):** Bahnhof-Gong = drei weiche Töne abwärts (e″–c″–g′), bewusst **nicht** das SBB-Original-Jingle (keine verlässliche Quelle, Markenklang). Hofkirchen-Glocken: Schlagton g (196 Hz) + Vorschläge g′/e′ – keine Quelle zu den echten Schlagtönen gefunden (Vertrauen gering). Stundenschlag nach Geräteuhr, nicht nach Spielzeit (das Spiel hat keine eigene Uhr). Nachts (21–6 Uhr Geräteuhr) weniger Vögel und Kühe.

**b)/c) Oberfläche** (`src/style.css`, Block «P-B» am Ende; `src/ui/`):
- Ehrlicher Ladefortschritt (`src/ui/loadSteps.ts`): Balken = abgeschlossene Ladeschritte / 13, abgelesen an den echten Statusmeldungen (`#load-status`), dazu «Schritt k von 13: Name · m:ss», nach 45 s im selben Schritt «dauert auf diesem Gerät länger, es läuft noch», am Ende «Fertig nach m:ss». Der Kriech-Balken aus loader.ts wird per CSS (`!important` auf `--ld-honest`) überstimmt – loader.ts unverändert. Wird vorläufig über `import './ui'` in `src/travel.ts` geladen.
- Touch-Ziele ≥ 48 px: Pause-Menü-Knöpfe (vorher 36 px), Funk-Knöpfe (vorher 39–42 px); Tastenkürzel (`kbd`) am Handy ausgeblendet.
- Handy quer (800×380): Funk als niedrige Zeile (Text links, Knöpfe rechts), oben, damit er die Fahrbahn weniger überdeckt.
- Handy hochkant (390×844): Knopfleiste oben rechts überdeckte Tempo und Auftragstext → Tempo/Sterne/Navi/Auftrag darunter angeordnet, Funk auf Höhe 124 px (überdeckt kurz Tempo/Auftrag, nicht die Strasse), kleinere Minimap/Pedale/Lenkfeld; gekipptes Ladebild nicht mehr am linken Rand abgeschnitten.
- PC 1280×720 / 1920×1080: Bestandsaufnahme ohne Befund an der Fahrbahn (siehe unten), daher nur Ladebild-Text geändert.

### Geprüft (tests/par/ui_pb.py, ein Seitenaufruf, `?test&noshadow&q=leicht&notraffic`, Port 8772, Software-Rendering)
- `npx tsc --noEmit -p .` fehlerfrei; Build `OUT=dist_pb sh tools/dist.sh` läuft durch.
- Lauf 0 (vor den CSS-Änderungen, mit Ton-Modul): Laden 33 s; Fahrbahn-Korridor (Mitte, Höhe 38–80 %) bei PC 1280/1920 frei, auch mit Funk; Handy quer: Funk überdeckte 14,8 % des Korridors; Handy hoch: Knopfleiste lag über Tempo/Auftrag und Funk (Screenshot). Pause-Knöpfe 36 px, Funk-Knöpfe 39–42 px. Keine Seitenfehler.
- Ton (nur Zustände – **der Testrechner hat keine Tonausgabe, gehört wurde nichts**): Bahnhof Luzern → Stadt 1, Bahnhof 1, Gong/Zug ausgelöst; KKL-Quai → See 0,79, Konzert-Ducking 0,46; Horw Land → Land 0,55, Kuhglocke; Kriens → Stadt 1; Tunnel (erzwungen) → Brummen 0,16, Hall 0,55 verbunden; künstliche Welt-Abfrage → Ufer/Häuser/Wald/Wiese je richtige Schicht = 1; «Ton aus» (Taste M) → Bus 0. Sirenen-Frequenzen nicht gemessen (nur Code).
- Prüfung nach den Änderungen (shots/pb1 = alles, shots/pb2 = Handy nach letzter Funk-Korrektur; Screenshots selbst angesehen):
  - Ladebild: Text «Schritt 6 von 13: Farben · 0:28», Balken folgt den Schritten, am Ende «Fertig nach 0:19/0:42» (Ladezeit im Test 40–62 s, Leicht-Stufe). Die Schrittdauern sind ungleich – der Balken zeigt Schritte, keine Zeit.
  - Handy 800×380 und 390×844: Fahrbahn-Korridor in freier Fahrt, mit Funk und in der Pause von keinem HUD-Element überdeckt; keine Touch-Ziele < 48 px (Funk, Pause, Touch-Knöpfe). Hochkant überdecken sich Knopfleiste, Tempo, Auftrag und Sterne nicht mehr.
  - PC 1280×720 / 1920×1080: Korridor frei; Funk-Knöpfe 39–42 px und Pause-Optionen 36 px hoch (Maus, bewusst so gelassen).
  - Ton-Zustände wie oben erneut bestätigt, keine Seitenfehler.
  - Nicht geprüft: echte Geräte (iOS/Android), Tablet-Grössen, Gamepad-Fokus im Pause-Menü nach den Höhenänderungen, Hörprobe.

### Einbau-Hinweise für die Hauptsitzung (03:30)
1. **Welt-Abfrage für die Kulisse** – `src/main.ts`, oben bei den Imports:
   ```ts
   import { bindAmbience } from './ambience';
   ```
   in `boot()` direkt nach der Zeile `memLog('worldA'); status.textContent = 'Navi wird eingerichtet …'; loaderProgress(0.8);` (einmal genügt; die Funktionen lesen jeweils die aktuelle `world`/`terrain`/`forestMask`, auch nach Streaming/Regionswechsel):
   ```ts
   bindAmbience({
     mask: (x, z) => (world ? world.mask.at(x, z) : 3),
     forest: (x, z) => { const f = forestMask; if (!f) return false; const i = Math.floor((x - f.x0) / f.step), j = Math.floor((z - f.z0) / f.step); return i >= 0 && j >= 0 && i < f.w && j < f.h && f.data[j * f.w + i] === 1; },
     tunnel: (x, z) => !!terrain && terrain.anyTun && terrain.inTunnel(x, z, car.y),
   });
   ```
   Kosten: 37 × `mask.at` + 37 × Waldmaske alle 0,4 s. Ohne diesen Einbau läuft der Ersatz (kein Wald, kein Tunnelhall).
2. **Import der Oberflächen-Zusätze** (optional, aufräumen): in `src/main.ts` `import './ui';` ergänzen und in `src/travel.ts` die Zeile `import './ui'; // P-B …` entfernen.
3. **loader.ts** (optional): das Kriechen (`Math.min(0.97, target + 0.12)` und `shown + 0.0004`) kann entfallen; wirkt heute ohnehin nicht mehr sichtbar (CSS überstimmt).
4. Nichts in world.ts/vehicle.ts/traffic.ts nötig.

### Offen / nächster Lauf
- Probe-Weg (echte Welt) im Spiel prüfen, sobald Einbau 1 drin ist: Seeufer Inseli/Ufschötti, Bireggwald/Gütschwald, Tunnel Sonnenberg/Spier (Tunnelhall).
- Lautstärken auf einem echten Gerät mit Kopfhörern abhören (Simon/Kinder) – Werte in `VOL` (index.ts) sind am Schreibtisch geschätzt.
- Hofkirchen-Schlagtöne und SBB-Gong mit Quelle belegen oder Annahme beibehalten.
- Autos (`car`) sind in der Stadt eher dicht (~1 Ereignis/3–5 s) – nach Hörprobe ggf. seltener.
- PC-Pause-Menü: Optionen sind mit 36 px für Maus ok; bei Bedarf ebenfalls vergrössern.
