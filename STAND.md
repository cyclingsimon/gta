# Luksi Rescue Luzern – STAND

Stand: 14.11.2026 01:00. Fertig: **2026-11-14o** = 13n + Region a11 (Küssnacht, Meierskappel) + Busfilter/Betreiberfarben. ZIP an Simon, nicht hochgeladen. Simon lässt den PC bis Sa 14.11. Mittag laufen (Browser für Geodaten). Branch `claude/13i-gebiet-a`, nicht in main.
Ältere Ordner auf dem PC (`web-n`, `web-x`) sind überholt. Vollpakete 12z/13a/13b liegen in Claudes Arbeitsumgebung bzw. im Chat.
Quellcode: github.com/cyclingsimon/gta (main). Rohdaten (data/) nicht im Repo. Keine Zugangsdaten ins Repo.
Upload-Weg: FileZilla Quickconnect-Verlauf, Ziel `/www/luksi-rescue`. Pfadfelder anklicken, Ctrl+A, Entf, Pfad tippen, Enter. Lokale Liste: leere Fläche anklicken → Ctrl+A → Rechtsklick → «Hochladen»; Überschreiben + «Immer diese Aktion ausführen». Computer-Zugriff verfällt nach 30 Min. ohne Aktivität.

## Version 14o (14.11. nachts, nicht hochgeladen)
- Region **a11 «Küssnacht und Meierskappel»** x 7300..12300, z −8600..−1800 (LV95 E 2673145–2678426, N 1213351–1220441), überlappt a10 (200 m) und Ost (200 m). b3dm x 1103–1134 / y 1289–1355 (923 Kacheln), 56 neue Höhenkacheln, Bus-Relationen eigens geholt (`data/a/raw/bus_a11.json`, AAGS/ZVB/PAG). Rettungsposten Küssnacht am Rigi [erfunden]. Küssnachtersee als OSM-Wasser (Seehöhe 434 m), keine globale Seefläche.
- Neues Werkzeug `tools/geo/unpack_region.py` (osm/wms/bus nach data/a/raw, Höhen-Delta dekodieren). `bus_for()` in build_region_a.py: osm_bus_all + bus_<id>.json zusammengeführt.
- `build_bus.py` (Gebiet A): nur Betreiber PAG, VBL, AAGR, ARAG, AAGU, ZVB, AAGS, SGV mit Linien-Nr. ≤ 3 Stellen (Fernbusse raus). Busse a1–a10 neu: a1 34, a2 20, a3 7, a4 8, a5 21, a6 30, a7 10, a8 12, a9 20, a10 9, a11 21.
- `src/bus.ts`: `brand(op)` – VBL blau-weiss, PostAuto gelb, übrige [Annahme] weiss mit grauem Unterteil und Betreibername (echte Lackierungen nicht geprüft). Betrifft auch Nord (AAGR).
- Tests 14o: smoke_a a11 ok (8/8, keine Fehler); a10↔a11 Küssnachterstrasse beide Richtungen ok; Luftbilder Küssnacht ok; Bus-Screenshots a1 (PostAuto 81), a5 (61), a11 (ZVB 622). Nicht getestet: Ost↔a11 (Ost-Daten lokal unvollständig), fps.
- Geplante Läufe: «Luksi: Weiterarbeiten (nächster Lauf)» 14.11. 02:13; «Umgebung ausbauen» deaktiviert; «nächste Gegend» (02:26) liess sich nicht deaktivieren (Freigabe verweigert) → feuert zusätzlich, harmlos.

## Version 13n (13.11./14.11. nachts, nicht hochgeladen)
- [Entscheid Claude, gestützt auf Fokus Simon «45 % Umgebung»] Neue Region **a10 «Root, Buchrain und Inwil»**, Feld x 1300..7500, z −9100..−3700 (LV95 E 2667137–2673596, N 1215190–1220883), überlappt a9 (200 m) und Nord (200 m). Gleiche Pipeline wie Gebiet A (`build_region_a.py a10`), id `a10` → kein Spielcode nötig.
  - Rohdaten im Browser: Overpass 4 Quadranten (`way(bbox);node(bbox)(if:count_tags()>0);relation[type=multipolygon](bbox);out geom;`), WMS SWISSIMAGE 3229×2846, 60 swissALTI3D-Kacheln (altiStart), 910 b3dm-Kacheln (x 1068–1106, y 1307–1359). Übertragung neu mit `packGz()` (ganzes Paket gzip, Höhen delta+byte-shuffle) → b3dm 53 + Rest 40 Aufrufe. `collect.py` entpackt gzip automatisch.
  - Ergebnis: 5226 OSM-Gebäude / 5918 swissBUILDINGS3D, Rettungsposten Buchrain (2949, −4742) [erfunden], 8 Einsätze erreichbar, 43 Busläufe, S-Bahn durch Root/Gisikon.
- **Fehler behoben: Gebiet A hatte keine Busse** (bus.json = [] in a1–a9). Ursache: `build_region_a.py` suchte `data/a/raw/bus.json`, vorhanden war `osm_bus_all.json` (schon im Zielformat). Jetzt genutzt; Busse neu: a1 38, a2 24, a3 14, a4 8, a5 21, a6 34, a7 10, a8 12, a9 54 Läufe.
- `umfang.py`, `smoke_a.py` auf a1–a10. Spielumfang 473.8 km², 64 840 Gebäude.
- Tests 13n: smoke_a a10 + a9 (Leicht) ok, 8/8 erreichbar, keine Fehler. `tests/region_a10.py`: Nord→a10 (Zugerstrasse), a10→Nord, a9→a10 (Inwilstrasse), a10→a9 alle ok. Sichtprüfung Buchrain/Root von oben ok. Nicht getestet: Busse in a1–a8 im Spiel angeschaut (nur Daten gezählt), fps/Speicher auf GTX 1080/Handy.

## Prüfungen nach 13m (13.11., 22:20–23:30, kein Spielcode geändert)
- qa.py Luzern (Software-Rendering): alle Checks OK, P1 1.30 Mio. Dreiecke / 682 Draw Calls, P2 0.60 Mio., G7 18/18 Einsätze, Ladezeit 79 s, keine Seitenfehler. Die neuen Wegweiser/Signale sprengen das Budget nicht.
- Nord-Daten (terrain, Luftbild, Horizont, Bus, Züge, Wald) vom Server per chunk() geholt (33 Aufrufe) → `public/data/nord/`; identisch mit Server, landen beim nächsten ZIP mit.
- Neuer Test `tests/region_nord_a.py`: Nord → a9 auf der Rothenburgstrasse («Willst du nach Rothenburg fahren?»), a9 → Nord, Nord → a6 auf der Neuenkirchstrasse («… nach Neuenkirch und Hellbühl»), a6 → Nord. Alle 4 Wechsel ok, Position übernommen, keine Fehler. Heading-Konvention für tp(): 0 = Süden (+z), fx = sin h, fz = cos h.
- Schilder je alte Region (Konsole «[bau]»): Luzern Ortstafeln 6 / Wegweiser 92, Nord 9 / 74, West 3 / 24. Ost und Süd lokal nicht ladbar (terrain fehlt lokal, auf dem Server vorhanden) → nicht gezählt.
- Sichtprüfung Kantonsstrasse a6 (Luzernstrasse, Hellbühlstrasse): Randlinien, Leitlinie, Leitpfosten, Bankett, Scheunen mit Dach ok.

## Version 13m (13.11. spät, nicht hochgeladen)
- world.ts: Fussgängerstreifen auf Hauptstrassen (OSM-Strasse mit L) erhalten beidseitig Signal SSV 4.11 (Name `fgsSignal`).
- West-Daten (terrain, Luftbild, Horizont, Bus, Züge, Wald) vom Server gta.simon-infanger.ch über den Browser geholt → `public/data/west/` (identisch mit Server, nur nötig für Tests; liegen jetzt auch im ZIP). b3d/ground West weiterhin nur auf dem Server.
- Test `tests/region_west_a8.py`: West → a8 Dialog «Willst du nach Malters fahren?», Wechsel mit Position (−8486, 1271), zurück a8 → West («Littau»), keine Fehler. Nord ↔ a9/a6 weiterhin ungetestet (Nord-Daten nicht lokal; gleicher Code).
- ZIP `Luksi Rescue 2026-11-13m.zip`. Nicht hochgeladen.

## Version 13l (13.11. abends, nicht hochgeladen)
- 3D-Häuser für alle A-Regionen per chunk()-Übertragung (Simon hat Download-Frage nicht beantwortet; Weg funktioniert, kostet aber ~1 Tool-Aufruf je 190 kB). Gebäude: a1 4632, a2 3366, a3 2215, a4 2848, a5 2924, a6 4169, a7 2676, a8 3737, a9 4179. Rohkacheln in `data/a/b3dm_<id>` (nicht im Repo).
- Höhen: b3d_build meldet «Geoid 0.00» (Kacheln offenbar schon orthometrisch); Sichtprüfung: Häuser stehen auf dem Gelände (a1, a2, a5, a7, a9).
- Tests 13l (19:50–20:15): smoke_a.py (Leicht) alle 9 ok, 8/8 erreichbar, keine Fehler; Echt-Modus mit 3D-Häusern in a2–a9 geladen, keine Seitenfehler; Sichtprüfung Nottwil, Rothenburg, Ruswil. Nicht getestet: echte fps/Speicher auf GTX 1080 oder Handy mit den grösseren A-Regionen.
- ZIP `Luksi Rescue 2026-11-13l.zip`. Nicht hochgeladen.

## Version 13k (13.11. abends, nicht hochgeladen)
- Simon 18:29: «Kannst du 3d Modelle nachrüsten?» → swissBUILDINGS3D für Gebiet A. Kachelformel (aus tileset.json, Level 11): x = floor((lon − 5.95944)/0.00221329), y = floor((lat − 45.81765)/0.000968716); URL `https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/20260520/11/{x}/{y}.b3dm`. Kachelbereiche je Region im Browser `TILER` (a1 941–976/1357–1410, a7 941–975/1245–1307, a8 974–1010/1245–1307, a9 1038–1069/1308–1358, a2 974–1012/1356–1410, a3 1010–1040/1356–1410, a4 941–975/1305–1358, a5 974–1012/1305–1358, a6 1010–1040/1285–1358).
  - Übertragung: Browser `tileJob()` holt, `pack()`/`chunk()` à 250k, `collect.py`, dann `b3d_build.mjs` + `roofcolors.py` (in build_region_a.py eingebaut, wenn `data/a/b3dm_<id>` existiert). Kosten: ~1 Tool-Aufruf pro 190 kB → a1 61 Stücke (11.4 MB), a7 40 (7.4 MB). Simon gefragt, ob stattdessen Download nach «Downloads» + Ordnerzugriff ok ist (Antwort offen).
  - Fertig: a1 Sursee 4632 Gebäude (6.2 MB), a7 Wolhusen 2676 (3.3 MB). Im Browser bereits geholt (Stand 19:30): a7, a8, a9 (laufend), Rest folgt. Spiel lädt b3d in A-Regionen optional (main.ts pB).
- rural.py (Höhen/Typen nach Grundfläche und Dichte), Stile «barn»/«hall» in world.ts, Umland-Flickenteppich (nur Gebiet A), kein Seeband am Rand von A.
- Wegweiser SSV 4.31 (`wegweiser()` in world.ts, Ortsliste `src/signPlaces.ts` aus `tools/geo/sign_places.py`): Luzern 92, Sursee 45, Ruswil 14.
- Tests 13k (Software-Rendering, 19:00–19:35): smoke_a.py alle 9 Regionen, 8/8 Einsätze erreichbar, keine Fehler; Sichtprüfung Sursee und Wolhusen mit 3D-Häusern (sitzen auf dem Gelände), Scheunen Ruswil, Wegweiser Sursee. Nicht getestet: qa.py Luzern mit Wegweisern (92 Masten, wenig Geometrie), echte fps.
- ZIP: `Luksi Rescue 2026-11-13k.zip`. Nicht hochgeladen.

## Version 13j (13.11. abends, nicht hochgeladen)
- Simon: Variante A (ganzes Gebiet Luzern–Sursee–Wolhusen) nur mit Schnellreise; Vision: jedes Kind im Einzugsgebiet des Kinderspitals Zentralschweiz kann «nach Hause fahren». Arbeitsfokus bis Mo 06:00: 20 % Luzerner Kantonsstrassen realistischer, 30 % Kantonsstrassen allgemein, 45 % Umgebung erweitern, 5 % Optimierung/Gameplay. Hochladen nur nach Simons OK.
- Branch wip-13i-skyline-umfang übernommen (Skyline-SVG, Umfang im Ladebild, CSS-Slots G1–G4).
- **Schnellreise** (`src/travel.ts`): Taste T oder Pause-Menü «🗺️ Schnellreise», Karte mit Zielliste (Spitäler, Rettungsposten, Bahnhof, Orte), 1.8 s Zeitraffer. Laufender Einsatz wird ohne Strafe zurückgegeben. Nicht im Mehrspieler und nicht während Übergabe. Regionswechsel per Neuladen, Ziel über sessionStorage `luksiTravel`.
- **Gebiet A** (`tools/geo/regions_a.py`, Daten `public/data/a1..a9`): a1 Sursee, a2 Sempach/Nottwil, a3 Hildisrieden/Rain, a4 Buttisholz, a5 Ruswil, a6 Neuenkirch/Hellbühl, a7 Wolhusen, a8 Malters, a9 Rothenburg. Bau: `build_region_a.py` (inkl. kreisel.py, missions_a.py), dann `regions_ts.py`, `umfang.py`, `dist.sh`.
  - [Entscheid/Annahme] Häuser aus OSM-Grundrissen (nicht swissBUILDINGS3D – CDN-Laden im Browser wurde verweigert); Gelände swissALTI3D auf 4 m gemittelt (`data/a/alti4`), Luftbild SWISSIMAGE 2 m.
  - Ziel je Region: OSM-Spital (Sursee, Wolhusen) sonst **erfundener** «Rettungsposten» beim Gemeindehaus des Hauptorts. Je 8 Einsätze nach OSM-Orten.
  - Randwechsel zwischen Nachbarregionen (60-m-Randzone, Bestätigungsdialog wie 13h). Herzen je Region `save.heartsA[region]`.
  - Rohdaten in `data/a/raw` und `data/a/alti4` (nicht im Repo, gross). Region-Daten `public/data/a*` ebenfalls nicht im Repo.
- **Kantonsstrassen-Paket** (`world.ts kantonsPaket`, `tools/geo/kreisel.py`): Kreiselinsel (Pflaster, Randstein, Gras, Stele/Baum), Signale SSV 2.41.1 / 3.02 vor Kreiseln, Tropfeninseln mit 2.37, Wartelinien 6.13, Mittelinseln, Ortstafeln 4.27/4.28 (Schwelle 70 km/h bei grösseren Orten, sonst 60; Annahme). Luzern und die alten Regionen Nord/Ost/West/Süd: city.json/props.json mit Kreiseln/Inseln/Orten nachgepatcht.
- Tests 13j (Software-Rendering, 13.11. 17:00–18:10): `tests/travel.py` PC und Handy ok; `tests/region_a.py` Wechsel a1↔a2 ok; `tests/smoke_a.py` alle 9 Regionen laden, je 8 Einsätze, alle per Navigation erreichbar, keine Fehler; Sichtprüfung Kreisel/Wartelinien in Sursee, Ortstafeln a1 = 11.
  - **Nicht getestet:** Übergänge alte Regionen ↔ A (West→a8, Nord→a9/a6; Logik eingebaut, aber die 3D-Daten der alten Regionen fehlen lokal), echte fps, qa.py/missions.py für die alten Regionen mit 13j.
  - Sichtbar unschön: OSM-Häuser in a2 bei Nottwil teils als hohe Glasblöcke (Stilzuteilung nach Fläche) – nächster Punkt.
- ZIP: `Luksi Rescue 2026-11-13j.zip` (108 MB, Vollpaket ohne config.php). Nicht hochgeladen.

## Version 13h (13.11. nachmittags, nicht hochgeladen)
- Simon 15:3x: GTA-Look mit kindlichem Twist; Wording «Great Tatü Ambulanz – Nice City» (Anspielung GTA/Vice City). Luksi-Figur auf der Ambulanz weg (vehicle.ts). Regionswechsel mit Knopfdruck bestätigen. Bei «Echt» war das Spiel nach dem Start noch blockiert (Stufe B baute nach dem Start) → Stufe B läuft jetzt im Ladebild, Startknopf erst danach.
- Schriften: Pricedown (GTA-Logo) und Chalet (GTA-V-UI) sind nicht für Web/Spiele lizenzierbar → Luckiest Guy (Apache 2.0, Display) + Archivo (OFL, Text) via npm @fontsource, in public/fonts, Lizenzen dabei, Credits angepasst. Play entfernt.
- style.css: Block «13h – GTA-Look» am Dateiende überlagert den Luksi-Stil (Variablen --display, --pink, --mint, --sun, --night). HUD: Minimap unten links (Touch: oben links), Sterne/Herzen oben rechts als Konturschrift, Auftragstext als Untertitel unten Mitte, Funk = dunkle Hilfebox oben links, «Einsatz erfüllt!» gross gelb (Klasse .mg-card.passed), Pause dunkel mit Pink-Kante. Start: Sonnenuntergang + Skyline (CSS), Logo in schwarzen Wortkästen, «Nice City» pink Neon, Lade-Panel gekippt.
- Regionswechsel: Dialog «Neue Gegend! Willst du nach … fahren?» (Enter/A = ja, Esc/Start = nein → Ambulanz 30 m zurück, gewendet). Fahrzeug steht während der Frage.
- Grafikaufträge ChatGPT in Todoist «Wartet auf Grafik/Musik»: G1 Ladebild-Panorama, G2 3 Comic-Panels, G3 HUD-Icons (Magenta), G4 Pause-Hintergrund. Einbau, sobald in Drive `02_Grafik-Originale/`. Keine Luksi-Figuren bestellt.
- Test-Hook: `__dbg.handover()`. Test: `tests/gta_ui.py` (Screenshots shots/gta_*).
- Tests 13h (Software-Rendering, 13.11. 15:45–16:20): gta_ui.py PC 1280×720 und Handy 800×380 Touch ohne Fehler, Schriften geladen (Luckiest Guy, Archivo 400–700), Screenshots Start/HUD/Funk/Erfüllt/Pause visuell geprüft. Regionsfrage mit `?test&edge`: Dialog erscheint, Esc schliesst, Ambulanz bleibt in Luzern. Grafik «Echt»: Startknopf erst nach Stufe B (luksiReady = true), nach Start fährt die Ambulanz sofort an. Nicht getestet: qa.py/missions.py mit 13h (nur Oberfläche und Ablauf geändert), echte Ladezeit auf GTX 1080 (Ladebild dauert mit «Echt» jetzt länger, dafür kein Hänger nach dem Start).
- ZIP: `Luksi Rescue 2026-11-13h.zip` (Vollpaket, aktuell). Nicht hochgeladen.

## Version 13c (13.11. tagsüber, nicht hochgeladen)
- Simons Prioritäten (13.11. 08:28): 1 Luzerner Kantonsstrassen, Bahnhof, Europaplatz · 2 Optik bestehender Gegenden (Kantonsstrassen) · 3 bestehende Regionen verbessern · 4 LUKS realistisch · 50 neue Regionen. Dazu: Spielumfang-Anzeige, Android-Meldung verdeckt Sicht, Schiffe in der Bucht, Geschwindigkeiten 90/150/269 (mit Blaulicht; ohne 70/120/200, Entscheid Claude nach Art. 100 Ziff. 4 SVG).
- Strassen-Details: `tools/geo/roadtags.py` hängt OSM-Tags (Abfrage `data/e4/osm/strassen.json`: alle trunk–tertiary im Raum Luzern) an Hauptstrassen: L, sw, cy, bu, v, ref, tf/tb (Abbiegepfeile), setzt w aus Streifen (w0 = alte Breite, Skript wiederholbar) und markiert separate Gehwege neben Fahrstrassen als Trottoir (`tr`). Muss nach build_city laufen (in den region_*.sh angehängt; Luzern von Hand: roadtags.py, danach bahnhof.py).
- world.ts `mainMarkings`: Leitlinien 3/6 (ausserorts 6/12, Annahme), Sicherheitslinie ab 4 Streifen, Rad-/Busstreifen gelb + Velo/BUS-Zeichen, Randlinien nur ausserorts, Leitpfosten, Bankett, Trottoir mit Randstein; dazu Haltelinien an Ampeln, Abbiegepfeile, Hauptstrassen-Signale vor Knoten, Bushalte-Markierungen, ergänzte Laternen innerorts (alle 32 m, wo OSM keine kennt).
- Bahnhofplatz/Europaplatz: `tools/geo/bahnhof.py` (Abfrage `data/e4/osm/bahnhof.json`) → city.json bhfFill, busIslands, shelters, wagenbach, Plätze «Europaplatz» und «Bahnhof Fussgänger». Muss nach plazas.py laufen. Torbogen: swissBUILDINGS3D-Form mit Sandstein-Stil (eigenes Modell `torbogen()` nur ohne 3D-Daten).
- LUKS: Stil `luks` (Haus 36, Neubau Kinderspital/Frauenklinik, weisses Betonraster, rote/orange/gelbe Faschen; Quelle Projektbeschrieb «Les Terrasses») und `luksTurm` (Haus 31).
- Region Süd: `sh tools/geo/region_sued.sh` → `public/data/sued/` (Rohdaten `data/e4/`). Feld x −3000..4600, z 6100..11000. Wechsel Luzern → Süd bei z > 6230 (−2900 < x < 2650, nicht ≤ 120 m um Einsätze), zurück bei z < 6170. Ziel Spital Nidwalden (3753, 10146, echt, LUKS Gruppe). Einsätze s1–s9, Herzen `save.heartsS`.
- Seetalbahn: Nord-Zugstrecken nach OSM-Streckennummer (500 Rothenburg bei x −2026, 651 Seetal bei x −1998 am Nordrand).
- Spielumfang: `tools/geo/umfang.py` → `public/data/umfang.json` (nach jedem Regionsbau neu laufen lassen).
- Tests 13c (Software-Rendering, 13.11. 11:00–12:15, Stand des ZIP): qa.py ganz grün in allen 5 Regionen (Luzern P1 2.14 Mio. / P2 0.70, G10 112 % wegen ergänzter Laternen; Nord, Ost, West, Süd P1 0.84). missions.py: Luzern 18/18 (54★), Süd 9/9 (27★), jeweils nach Neuladen erhalten, keine Fehler. gdiff.py 0 Abweichungen. region_sued.py hin und zurück ok. ui_check.py: Pause-Menü zeigt Spielumfang, Funk auf 800×380.
- Einmal beobachtet (13f-Test Ost, Einsatz 2): Seite hing über 15 Min., Wiederholung lief normal; Ursache nicht belegt. Vorsorglich in 13g Winkel-Schleifen begrenzt. Einsatz o2 (Strandbad Benzeholz) braucht im Autopilot-Test auffällig lange (85 s für die letzten 110 m) – offen.
- Nicht getestet: echte fps (GTX 1080, Handy), Toasts auf echtem Android-Gerät (im Testmodus verschwinden Toasts sofort, nur CSS geprüft).
- ZIP: `Luksi Rescue 2026-11-13c.zip`, `…13d.zip` und `…13e.zip` `…13f.zip` und `…13g.zip` (13g = aktuell) (je 87 MB, Vollpaket inkl. stats/config.php, ohne DB). Nicht hochgeladen. 13d: Läden im Erdgeschoss (Stil blockShop/modernShop, SHOP_NEAR ≤ 24 m von Kantonsstrassen-Achse innerorts), Längslinie 5 m vor Haltelinien; qa Luzern grün (P1 2.14 Mio.).

## Version 13b (13.11. morgens)
- Fotovergleich mit 20 Commons-Fotos (data/ref/, Titel in titles.json): Altstadt-Tönung in Fotofarben (linear, withRows Anteil 0.85/0.8), Wasserturm mit Stil «stone» + eigener Dachfarbe auch mit 3D-Daten, See #2F86A0, Fresnel 0.45.
- qa Luzern grün (P1 2.06 Mio., P2 0.68 Mio.).

## Nachtschicht 12./13.11. (Version 13a)
- **Fix schwebende Bäume/Strassen** (Simon 23:24): `THREE.LOD` der Bodenkacheln stand im Ursprung → ab 650 m von der Kapellbrücke überall das grobe 10-m-Gitter (Minimum-Filter + −0.45 m, bis 7.5 m zu tief). Jetzt LOD in Kachelmitte (Wechsel ab 933 m Kachelmitte). Test `tests/gdiff.py [qs] ['x,z']`: sichtbarer Boden ≤ 600 m um die Kamera vs. `groundAt`, Schwelle 1.5 m → 0 Abweichungen (Start, Gütsch-Hang).
- **Fix Bus-Seite gespiegelt** (Simon 23:18): eigene Atlas-Zeile `side2` (Text rechtsbündig) statt gespiegelter UV.
- **GUI im Luksi-Stil** (demo.luksi.ch/ambulanz): Schrift Play (OFL, `public/fonts/`, woff2 per fontTools), Tokens am `:root` in `src/style.css`, Konturen 3–4 px #1D1E1B, harte Schatten in Navy #12305C, schräge Bänder (Funk, Pause, Titel, Minispiel-Kopf), Segment-Schalter im Pause-Menü, Tacho `<b>N</b><small>km/h</small>`. Recherche «KI-Look»: Inter/Systemschrift, Lila-Blau-Verläufe, Glas-Effekte, weiche graue Schatten, Drei-Karten-Raster → alles vermieden. Credits: «kein Tracking» entfernt (wäre seit der Statistik falsch), Schrift-Lizenz ergänzt.
- **Realismus**: Himmelskuppel (Verlauf, Sonnenhof, fbm-Wolken, abends orange), Sonnenschatten nur «Echt» (2048², ±140 m, folgt Kamera 70 m voraus, Texel-Raster), Licht hemi 1.15 / Sonne 2.45, Wasser-Shader (Wellen-Normalen, Fresnel → Horizontfarbe, Glitzern), Wasserfarbe #4AA6BC nach SWISSIMAGE, Kontaktschatten Wände 0.78. Scharfes Luftbild Kernzone `public/data/aerial_hr.jpg` (4096², 0.625 m, E 2664760–2667320 / N 1210400–1212960, WMS swissimage 16 Kacheln, `tools/geo/aerial_hr.py`; 11 Kacheln im Browser auf 0.5 m verkleinert), im Boden-Shader per Ausgleichsebene (Restfehler ≤ 1.1 m) mit 80-m-Rand überblendet.
- **Region Ost** (Meggen): x 2500..7500, z −2000..2500, `sh tools/geo/region_ost.sh` → `public/data/ost/`. Rohdaten `data/e3/` (raw/ OSM+Höhen+WMS, b3dm/ + b3dm_ost2/ (Lücke x-Kachel 1079–1089 nachgeholt), alti/). OSM östlich x = 2600 aus Etappe 3, westlich Luzern (`merge_osm_ost.py`), Buslinien aus Overpass-Relationen konvertiert. Zug: S-Bahn Luzern–Küssnacht beidseitig. Wechsel Luzern → Ost bei x > 2660 und −1000 < z < 2450 (nicht ≤ 120 m um einen Einsatzort, wegen Seeburg), Ost → Luzern bei x < 2560. Einsätze o1–o8 an OSM-Orten; Ziel «Rettungsposten Meggen» beim Gemeindehaus (4990, 470) [Entscheid: erfunden, kein Kinderspital in Meggen]. Herzen `save.heartsO`. Abzeichen `ost`.
- **Region West** (Littau, Obernau, Blatten): x −8500..−3600, z −1300..3000, `sh tools/geo/region_west.sh` → `public/data/west/`. OSM westlich x = −3700 aus Etappe 3 (`merge_osm_ost.py` mit LR_SIDE=west). S-Bahn Richtung Malters. Wechsel Luzern → West bei x < −3720 und −1000 < z < 2950 (nicht ≤ 120 m um Einsatzorte), zurück bei x > −3660. Einsätze w1–w7, Ziel «Rettungsposten Littau» (−3752, 173, erfunden). Herzen `save.heartsW`; ländlich zu wenige Kandidaten → Strassenmitten als zusätzliche Herz-Orte.
- Plätze: `tools/geo/plazas.py` (32 Fussgängerflächen) und Fussgängerstreifen `tools/geo/crossings.py` (OSM highway=crossing markiert, gelb) – beide nach build_city laufen lassen (schreiben in city.json bzw. props.json).
- Fix Mini-Spiel Fieber (Umkehr stand im Kommentar). Strassen: Mittellinien sichtbar (Höhe/Offset), Randlinien Hauptstrassen.
- Testserver: `OUT=dist_next sh tools/dist.sh && sh tools/swap.sh` baut daneben und tauscht, ohne laufende Tests zu stören. Lange Testkette: /tmp/chain.sh (Schritte /tmp/step_*.ok).
- Test-Fix: missions.py liest Minispiel-Titel per textContent (CSS uppercase brach die Erkennung).

## Tests Version 13a (Software-Rendering SwiftShader, Nacht 13.11.)
- qa.py Luzern ganz grün: G5 0.7 %, G7 18/18, G8 7.65 %, G13 ok, P1 2.06 Mio. Dreiecke / 697 Draw Calls, P2 Schatten 0.68 Mio. Nord ganz grün (P1 0.61, P2 0.56). Ost ganz grün (G5 1.5 %, G13 30 Schwäne/91 Kühe/2 Züge/40 Herzen, P1 1.00, P2 0.38). West ganz grün (G5 1.5 %, G8 6.4 %, G13 43/91/2/40, P1 0.47, P2 0.32).
- missions.py (mit `&noshadow`): Luzern 18/18 (54★), Nord 9/9 (27★), Ost 8/8 (24★), West 7/7 (20★), jeweils nach Neuladen erhalten, keine Fehler.
- region.py (Nord), region_ost.py, region_west.py: Wechsel hin und zurück mit Spielstand und Position, keine Fehler.
- gdiff.py: 0 Abweichungen > 1.5 m (Start, Gütsch-Hang).
- Sichtprüfungen: Schatten mit/ohne, scharfes Luftbild mit/ohne (`&nohr`), Fussgängerstreifen, Plätze, Wolken, Region Ost (4 Orte).
- Nicht gemessen: echte fps auf GTX 1080 / Handy mit Schatten.

## Spielfeld und Daten
- Feld x −3800..2700, z −1100..6300. Geodaten nur über den eingebauten Browser auf Simons PC (`window.PK`, Base64-Stücke à 225 kB, `tools/geo/collect.py PREFIX N OUTDIR`). Overpass nur overpass-api.de, grosse Abfragen im Hintergrund.
- `data/tunnels.json` (21 Gleistunnel). build_city: `rail` sichtbar, `railAll` für Zugstrecken. build_trains: `tun` = Tunnel-Intervalle. Zentralbahn Bahnhof → Spielfeldrand Süd (6.6 km).

## Etappe 2 «Nord» – im Spiel ab Version y (noch nicht live)
- Region Nord: Feld x −3800..4600, z −3900..−550, Daten in `public/data/nord/`. Gebaut mit `sh tools/geo/region_nord.sh` (alle Schritte reproduzierbar).
- Rohdaten in `data/e2/`: `alti/` (33 swissALTI3D-Kacheln, int16 dm rel. 400 m), `b3dm/` (841 Kacheln + `wms_w.jpg`/`wms_o.jpg`), `osm/osm_a.json`, `osm_b.json` (Overpass out geom), `osm/osm_bus.json`.
- Werkzeuge neu: `osm_raw2big.py` (Overpass-Rohformat → osm_big/props/tunnels/beach), `merge_osm.py` (nördlich z = −950 Etappe 2, südlich Luzerner OSM), `alti_region.py`, `region_pois.py`. Die bestehenden Werkzeuge lesen `LR=nord` und `LR_*`-Variablen; ohne diese bauen sie unverändert Luzern.
- Nachladen = Regionswechsel per Neuladen der Seite (`?region=nord|luzern`, `save.region`): Luzern → Nord bei z < −1000, Nord → Luzern bei z > −650, nach 1.5 s, nur ohne laufenden Einsatz und allein. [Entscheid/Annahme: echtes Streaming im laufenden Spiel hätte den Speicher über 2 GB getrieben; so bleibt jede Region klein.]
- Beide Regionen enthalten das Kinderspital. Herzen getrennt (`save.heartsN`). Einsätze n1–n8. Keine Schiffe und Züge in Nord.
- Luftbild Nord: E 2662190–2670670, N 1212000–1215560 (unterer Streifen aus dem Luzerner Luftbild; östlich E 2668910 unter N 1212590 fehlt das Bild, Rand gestreckt).

## Spielstatistik und Dashboard (ab z)
- Server: `public/stats/` → `/www/luksi-rescue/stats/` (PHP 8.2 + SQLite, Muster webprojekte-Skill). `api.php` nimmt Pakete an (sendBeacon/fetch, gleiche Domain), `index.php` = Dashboard mit Login (bcrypt, CSRF, Drosselung 5/15 Min.), monatliches Auto-Backup in `stats/data/backups/` (zufälliger Name), `data/` und `inc/` per .htaccess gesperrt.
- DB `stats/data/stats.sqlite` entsteht beim ersten Paket; wird nie ausgeliefert (dist.sh löscht lokale Test-DBs). Verzeichnis `stats/data` muss auf dem Server schreibbar sein (775).
- `config.php` mit Passwort-Hash ist NICHT im Repo (öffentlich); lokal in `data/stats_config.php` und `public/stats/config.php` (gitignored), Vorlage `config.sample.php`. Passwort hat Simon im Chat bekommen.
- Client `src/stats.ts`: zufällige Geräte-ID (localStorage luksiDev), Sitzungs-ID je Seitenaufruf, Summen fortlaufend (Server nimmt MAX → doppelte Pakete schaden nicht), Ereignisse (mission_accept mit Titel, mission_done mit Dauer, stars, heart, region_switch, pos jede Spielminute). Senden alle 30 s Spielzeit und beim Verlassen, Position alle 30 s. Spielzeit nach Uhr, nur wenn fertig geladen, Fenster sichtbar, nicht pausiert; Mini-Spiele zählen. In Tests aus (ausser `?stats`). Kein Schalter und keine Erwähnung im Spiel oder in LIESMICH (Entscheid Simon 12.11. 22:45).
- Lokal getestet (php -S): Paket kommt an, Dashboard-Login, falsches Passwort, ungültiges Paket 400. Nicht lokal prüfbar: .htaccess-Sperren (php -S ignoriert sie) – nach dem Upload prüfen, dass /stats/data/stats.sqlite und /stats/config.php 403 liefern.

## Spiel (Module)
- `world.ts`: Altstadt-Pastellzeilen, Kapellbrücke, Fahnen, Terrassen, Verkehrshaus, Spielplätze, Nadelwehr, Löwendenkmal, Museggmauer + Zytturm-Uhr, Instanzen mit Vertex-Farben (`colorMerge`), `chunkInstanced` 1000 m, See flach.
- Neu in x: `findSpires` sucht in swissBUILDINGS3D die zwei Turmspitzen der Jesuitenkirche, lässt die spitzen Dächer weg und setzt Zwiebelhauben (`ONIONS`). Weinmarktbrunnen als eigener Brunnenstock beim OSM-Brunnen (−233, −29) [Annahme: dieser OSM-Brunnen ist der Weinmarktbrunnen].
- `fun.ts` Züge/Tunnel/Pedalos, `bus.ts` Busatlas, `vehicle.ts` Ambulanz.
- `tests/look_spots.py prefix 'x,z,h,cam;…'`: Sichtprüfung; cam < 0 = freie Kamera (x, z, Höhe h; Blickziel codiert als −((dz+500)·1000 + (dx+500)), Blickhöhe h−28).

## Tests (Version z, Software-Rendering, Stand 12.11. abends)
- missions.py Luzern: alle 18 Einsätze, 54 Sterne, nach Neuladen erhalten, keine Fehler. Nord: alle 8, 24 Sterne, keine Fehler.
- Rotsee-Fix: Umgebungsfläche (outer) liegt jetzt 3 m unter dem tiefsten Gelände des Feldes (Nord: Rotsee −14.6 m war verdeckt). 8 Boote auf dem Rotsee (Boats mit Höhe je Boot), Schwäne in Nord auf Geländehöhe (Animals flatLake=false).
- Navi-Fix: nav.nearestVisible mit Fahrtrichtung nimmt die nächste Kante in Fahrtrichtung (vorher Pendeln auf der Haldenstrasse, Einsatz m13 nie erreicht).
- Luzern qa grün (G8 7.65 %, P1 1.90 Mio. / 681 Draw Calls). Nord qa ganz grün (G8 7.0 %, G13 mit 2 Zugstrecken). region.py: Wechsel hin und zurück ok, keine Fehler.

## Tests (Version y)
- Luzern: qa.py alle grün, 1.90 Mio. Dreiecke / 660 Draw Calls.
- Nord (`qa.py 'http://localhost:8765/?test&region=nord'`): grün ausser G8 Brücken 11.2 % (Grenze 10 %; Emme-/Reussbrücken in tiefen Tälern, Deck folgt dem Gelände) – offen. G7 8/8, G13 ok, P1 0.58 Mio. Dreiecke am Start, Speicher JS 767 MB nach Start.
- `tests/region.py`: Wechsel Luzern → Nord → Luzern mit Spielstand und Position geprüft, keine Fehler.

## Tests (Version x)
- qa.py G1–G13, G3b, P1 grün: 1.90 Mio. Dreiecke / 660 Draw Calls (Start), Ladezeit 40 s.
- Sichtprüfung Jesuitenkirche (Zwiebelhauben sitzen auf den Türmen) und Weinmarkt (Brunnen sichtbar).
- fun.py zuletzt Version v, missions.py zuletzt alle 18 (q). Speicher «Echt» Spitze 1.6 GB (w).
- Echte fps auf GTX 1080 / Handy ungemessen.

## Offen
- Punkt 6 teilweise: Jesuitenkirche und Weinmarktbrunnen erledigt. Offen: Bahnhofplatz/Torbogen, KKL-Vorplatz (Europaplatz-Pflaster, Wagenbachbrunnen), hausgenaue Altstadtfarben (keine Fassadenfarb-Datenquelle; Annahme: bleibt zufällig-pastell).
- Punkt 7: Etappe 2 eingebaut (y), Upload offen (PC). Züge Nord (S-Bahn Rothenburg, IR Zürich via Rotsee/Ebikon) und G8 erledigt in z. Offen: Seetalbahn (Gleisgraph an der Nordkante unterbrochen), Ortsnamen-Koordinaten sind Annahmen (±200 m).
- Geprüft: der «beige Balken» bei x≈560, z≈−700 ist die Kante einer flachen Überdachung aus den 3D-Daten, kein Fehler.
- Punkt 6: Wagenbachbrunnen (Annahme: unbenannter OSM-Brunnen Bahnhofplatz) und Fritschibrunnen in z. Offen: Europaplatz-Pflaster (Flächen fehlen im Datenformat), hausgenaue Altstadtfarben (keine Quelle).
- Brücken: world.ts verkettet OSM-Brückenstücke (gerades Deck zwischen Kettenenden), Holzbrücken ausgenommen.
