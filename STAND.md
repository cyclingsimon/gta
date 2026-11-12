# Luksi Rescue Luzern – STAND

Stand: 12.11.2026 08:00. Live: **2026-11-12x**. Fertig, nicht hochgeladen: **2026-11-12z** (Etappe 2 + Züge Nord + Brückenketten + Wagenbach-/Fritschibrunnen), ZIP `Luksi Rescue 2026-11-12z.zip` (51 MB, Vollpaket) – PC seit 08:00 aus, beim nächsten Einschalten hochladen (Vollordner, da data/nord/ neu). Version x ist **LIVE** auf https://gta.simon-infanger.ch/ (von Claude per FileZilla hochgeladen; geprüft: ausgeliefertes `index-D4LTK10T.js` enthält Version x und den Weinmarktbrunnen). Live seit 11.11.: q, r, s, t, v, w; x am 12.11. ca. 06:57.
Lokal auf dem PC: `Downloads\luksi-rescue\web-n` (Vollstand w), `web-x` (nur die in x geänderten Dateien: index.html, LIESMICH.txt, assets/). Vollpaket: `Luksi Rescue 2026-11-12x.zip`.
Quellcode: github.com/cyclingsimon/gta (main). Rohdaten (data/) nicht im Repo. Keine Zugangsdaten ins Repo.
Upload-Weg: FileZilla Quickconnect-Verlauf, Ziel `/www/luksi-rescue`. Pfadfelder anklicken, Ctrl+A, Entf, Pfad tippen, Enter. Lokale Liste: leere Fläche anklicken → Ctrl+A → Rechtsklick → «Hochladen»; Überschreiben + «Immer diese Aktion ausführen». Computer-Zugriff verfällt nach 30 Min. ohne Aktivität.

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
