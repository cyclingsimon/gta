# Luksi Rescue Luzern – STAND

Stand: 13.11.2026 14:15. Fertig: **2026-11-13f** = 13c + Läden an Kantonsstrassen, Längslinien vor Haltelinien, Wegweiser (OSM destination), Wartelinien, Fix Bushalte-Markierung, Tempo-Signale (nicht hochgeladen; qa Luzern und Süd grün mit 13f, Nord grün mit 13e; Missionsläufe zuletzt mit 13c, Spiellogik seither unverändert). **Live: 2026-11-13b** (von Claude per FileZilla hochgeladen, 13.11. ca. 07:50, Simon: «Lade 13b dann hoch»; geprüft: ausgelieferte JS enthält 13b, data/west, data/ost, aerial_hr, Schrift vorhanden, stats/config.php und stats/data/stats.sqlite liefern 403). 12z und 13a waren nie live. Lokal auf dem PC: `Downloads\luksi-rescue\web-13b` (Vollstand).
Ältere Ordner auf dem PC (`web-n`, `web-x`) sind überholt. Vollpakete 12z/13a/13b liegen in Claudes Arbeitsumgebung bzw. im Chat.
Quellcode: github.com/cyclingsimon/gta (main). Rohdaten (data/) nicht im Repo. Keine Zugangsdaten ins Repo.
Upload-Weg: FileZilla Quickconnect-Verlauf, Ziel `/www/luksi-rescue`. Pfadfelder anklicken, Ctrl+A, Entf, Pfad tippen, Enter. Lokale Liste: leere Fläche anklicken → Ctrl+A → Rechtsklick → «Hochladen»; Überschreiben + «Immer diese Aktion ausführen». Computer-Zugriff verfällt nach 30 Min. ohne Aktivität.

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
- Nicht getestet: echte fps (GTX 1080, Handy), Toasts auf echtem Android-Gerät (im Testmodus verschwinden Toasts sofort, nur CSS geprüft).
- ZIP: `Luksi Rescue 2026-11-13c.zip`, `…13d.zip` und `…13e.zip` und `…13f.zip` (13f = aktuell) (je 87 MB, Vollpaket inkl. stats/config.php, ohne DB). Nicht hochgeladen. 13d: Läden im Erdgeschoss (Stil blockShop/modernShop, SHOP_NEAR ≤ 24 m von Kantonsstrassen-Achse innerorts), Längslinie 5 m vor Haltelinien; qa Luzern grün (P1 2.14 Mio.).

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
