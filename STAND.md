# Luksi Rescue Luzern – STAND

Stand: 12.11.2026 07:00, Version **2026-11-12x** – **LIVE** auf https://gta.simon-infanger.ch/ (von Claude per FileZilla hochgeladen; geprüft: ausgeliefertes `index-D4LTK10T.js` enthält Version x und den Weinmarktbrunnen). Live seit 11.11.: q, r, s, t, v, w; x am 12.11. ca. 06:57.
Lokal auf dem PC: `Downloads\luksi-rescue\web-n` (Vollstand w), `web-x` (nur die in x geänderten Dateien: index.html, LIESMICH.txt, assets/). Vollpaket: `Luksi Rescue 2026-11-12x.zip`.
Quellcode: github.com/cyclingsimon/gta (main). Rohdaten (data/) nicht im Repo. Keine Zugangsdaten ins Repo.
Upload-Weg: FileZilla Quickconnect-Verlauf, Ziel `/www/luksi-rescue`. Pfadfelder anklicken, Ctrl+A, Entf, Pfad tippen, Enter. Lokale Liste: leere Fläche anklicken → Ctrl+A → Rechtsklick → «Hochladen»; Überschreiben + «Immer diese Aktion ausführen». Computer-Zugriff verfällt nach 30 Min. ohne Aktivität.

## Spielfeld und Daten
- Feld x −3800..2700, z −1100..6300. Geodaten nur über den eingebauten Browser auf Simons PC (`window.PK`, Base64-Stücke à 225 kB, `tools/geo/collect.py PREFIX N OUTDIR`). Overpass nur overpass-api.de, grosse Abfragen im Hintergrund.
- `data/tunnels.json` (21 Gleistunnel). build_city: `rail` sichtbar, `railAll` für Zugstrecken. build_trains: `tun` = Tunnel-Intervalle. Zentralbahn Bahnhof → Spielfeldrand Süd (6.6 km).

## Etappe 2 (Emmenbrücke, Ebikon, Adligenswil) – Rohdaten vollständig, noch nicht eingebaut
Band x −3800..4600, z −3900..−1100 (LV95 E 2662–2670, N 1212–1215).
- `data/e2/alti/EEEE-NNNN.i16`: 33 swissALTI3D-Kacheln, 500×500 int16 dm relativ 400 m, Kachel links oben (E·1000, (N+1)·1000).
- `data/e2/b3dm/`: 841 neue swissBUILDINGS3D-Kacheln (x 1037..1089, y 1283..1311) + `wms_w.jpg`/`wms_o.jpg` (SWISSIMAGE 2 m, E 2662190–2666430 bzw. 2666430–2670670, N 1212590–1215560, je 2120×1485 px).
- `data/e2/osm/osm_a.json`, `osm_b.json`: Overpass-Rohdaten (out geom) lat 47.059–47.089, lon 8.255–8.313 bzw. 8.313–8.370 (Gebäude, Strassen, Bahn, Landnutzung, Natur, Freizeit, Wasser, Amenity, Haltestellen, Barrieren). `osm_bus.json`: 110 Bus-/Trolleybus-Relationen mit Weggeometrie (Format wie data/osm_bus.json).
- Nächster Schritt: Konverter Overpass-Rohformat → Format von osm_big.json; Gelände anstückeln; b3d für Band bauen; Nachladen (Streaming) als eigene Kachelgruppe, sonst Speicher > 2 GB.

## Spiel (Module)
- `world.ts`: Altstadt-Pastellzeilen, Kapellbrücke, Fahnen, Terrassen, Verkehrshaus, Spielplätze, Nadelwehr, Löwendenkmal, Museggmauer + Zytturm-Uhr, Instanzen mit Vertex-Farben (`colorMerge`), `chunkInstanced` 1000 m, See flach.
- Neu in x: `findSpires` sucht in swissBUILDINGS3D die zwei Turmspitzen der Jesuitenkirche, lässt die spitzen Dächer weg und setzt Zwiebelhauben (`ONIONS`). Weinmarktbrunnen als eigener Brunnenstock beim OSM-Brunnen (−233, −29) [Annahme: dieser OSM-Brunnen ist der Weinmarktbrunnen].
- `fun.ts` Züge/Tunnel/Pedalos, `bus.ts` Busatlas, `vehicle.ts` Ambulanz.
- `tests/look_spots.py prefix 'x,z,h,cam;…'`: Sichtprüfung; cam < 0 = freie Kamera (x, z, Höhe h; Blickziel codiert als −((dz+500)·1000 + (dx+500)), Blickhöhe h−28).

## Tests (Version x, Software-Rendering)
- qa.py G1–G13, G3b, P1 grün: 1.90 Mio. Dreiecke / 660 Draw Calls (Start), Ladezeit 40 s.
- Sichtprüfung Jesuitenkirche (Zwiebelhauben sitzen auf den Türmen) und Weinmarkt (Brunnen sichtbar).
- fun.py zuletzt Version v, missions.py zuletzt alle 18 (q). Speicher «Echt» Spitze 1.6 GB (w).
- Echte fps auf GTX 1080 / Handy ungemessen.

## Offen
- Punkt 6 teilweise: Jesuitenkirche und Weinmarktbrunnen erledigt. Offen: Bahnhofplatz/Torbogen, KKL-Vorplatz (Europaplatz-Pflaster, Wagenbachbrunnen), hausgenaue Altstadtfarben (keine Fassadenfarb-Datenquelle; Annahme: bleibt zufällig-pastell).
- Punkt 7: Etappe 2 einbauen (siehe oben) inkl. Nachladen.
