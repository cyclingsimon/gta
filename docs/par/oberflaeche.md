# P-B «Atmosphäre, Ton, Oberfläche» – Laufprotokoll

## 14.11.2026 22:55 – Lauf P-B (Lauf 3)

Vorab `claude/13i-gebiet-a` hineingemergt (Fast-Forward bis 1f16b7d, enthält P-B Lauf 2 und `bindAmbience` in main.ts schon eingebaut).

### Gemacht
1. **Pegeltest per OfflineAudioContext** (neu): `tests/par/amb.html` + `amb.ts` + `amb_vite.config.mjs`, Runner `tests/par/amb_offline.py`. Rechnet den Ton ohne Lautsprecher, gleiche Kette wie im Spiel (Master 0,6, Effekte 0,8, Kulissenbus `AMB_GAIN·VOL.bus`). Misst je Baustein, für Sirene/Effekttöne, für den lautesten Fall (Motor Vollgas + Sirene + Hupe + Sterne-Ton) und für eine 72-s-Mischung über `initAmbience/updateAmbience` (Stadt → See → Wald → Land + Stundenschlag → Bahnhof + Gong + Zug → Tunnel + Sirene → Stadt, Musik-Ducking, Ton aus/an): Spitze, RMS, Klick-Verdacht (harte Einsätze/Abbrüche, Hüllkurve 10 ms; Schwelle < 3,5 ms von −40 dB auf halbe Höhe). **Positivkontrolle**: der Effektton-Einsatz von Lauf 2 (Sprung auf volle Lautstärke) wird als Klick erkannt.
2. **Fehler Sirene gefunden und behoben** (`src/ambience/horn.ts`): Das eingebaute WebAudio-Rechteck ist auf Spitze 1 normiert (Gibbs-Überschwinger), das Plateau liegt bei ≈ 0,85. Gemessen klang die Sirene bisher **575 / 451 Hz, Verhältnis 1,276** – ausserhalb der Vorschrift (4:3 = 1,333, Toleranz −3 %/+7 % → 1,293–1,427). Jetzt eigenes Rechteck ohne Normierung: **gemessen 586,5 / 440,0 Hz** (Soll 586,7/440), Folge hoch–tief–hoch–tief je 0,7 s, Neustart beginnt hoch (gemessen). Sirene und Effekttöne sind dafür als Bausteine `buildSiren()` / `blipTo()` nach `src/ambience/horn.ts` gezogen; `audio.ts` nutzt sie (gleiche Lautstärken).
3. **Knackfreie Einsätze**: Effekttöne (Hupe, Sterne, Funk, Klick …) 6 ms Einschwingen statt Sprung, Ende sauber auf 0; Spielmusik-Arpeggio/Bass 5/8 ms; Glocken/Kuhglocke/Gong linearer 6-ms-Anschlag; Vögel 10 ms; Schienenstösse 8 ms. Nach den Änderungen: **0 Klick-Verdachte** in allen Segmenten.
4. **Rauschschleife** 7,3 s statt 3 s (Wiederholung in gefiltertem Rauschen war hörbar möglich), Schleifenstelle mit 80-ms-Überblendung nahtlos.
5. **Neue Klänge** (Luzern-typisch, selten und leise):
   - **Trolleybus der VBL** in der Stadt (Stadt-Gewicht > 0,5, alle 20–45 s): Fahrmotor-Singen beim Anfahren + Reifen. Beleg, dass Luzern Trolleybusse fährt: https://en.wikipedia.org/wiki/Trolleybuses_in_Lucerne. Tonhöhen = **Annahme (Vertrauen gering)**.
   - **Schiffshorn** eines Kursschiffs am See (See-Gewicht > 0,4, alle 2–5 min): tiefer, dumpfer Ton aus der Ferne, manchmal zweimal. SGV-Kursschiffe: https://www.lakelucerne.ch/. Tonhöhe/Länge = **Annahme (Vertrauen gering)**.
6. **Credits** (`index.html`, Pause → Steuerung & Credits): Zeile «Töne» – alles selbst synthetisiert (keine fremden Aufnahmen, daher keine CC-Lizenzen nötig), SBB-Dreiklang nachgespielt, Konzertmusik von Simon, Radio LuZ nur auf Wunsch.

### Messwerte (OfflineAudioContext, 48 kHz, Spielkette; dBFS)
| Segment | Spitze | RMS |
|---|---|---|
| Kulisse Stadt / See / Wald | −48 / −37 / −41 | −61 / −53 / −54 |
| Land + Stundenschlag c1 | −31 | −48 |
| Bahnhof + Gong + Zug | −38 | −57 |
| Tunnel + Sirene / Stadt + Sirene | −20 / −22 | −29 / −28 |
| Stadt mit Spielmusik (geduckt) | −55 | −66 |
| Ton aus | Stille | Stille |
| **Lautester Fall** (Motor Vollgas + Sirene + Hupe + Sterne) | **−12,6** | −25 |

Kein Clipping (Reserve ≥ 12 dB). Die Kulisse liegt 20–30 dB unter Motor/Sirene → im Fahrzeug eher Hintergrund. **Gehört wurde nichts** (Testrechner ohne Tonausgabe); ob das zu leise ist, entscheidet die Hörprobe – Regler bleibt `AMB_GAIN` (index.ts).

### Geprüft
- `npx tsc --noEmit -p .` fehlerfrei; `OUT=dist_pb sh tools/dist.sh` läuft durch (nur Luzern-Daten im Klon, Regionen fehlen → Hinweise erwartet).
- `tests/par/amb_offline.py`: wie oben, BEFUNDE keine, keine Seitenfehler.
- `tests/par/ui_pb.py` auf dem gemergten Stand (Leicht, Software-Rendering, Luzern): Laden 26 s, 12 Schritte, «Fertig! Geladen in 0:13». Handy 800×380 und 390×844 (Touch): Fahrbahn frei in freier Fahrt, mit Funk und in Pause, keine Touch-Ziele < 48 px. PC 1280×720 / 1920×1080: Fahrbahn frei; Pause-Optionen 34–36 px und Funk-Knöpfe 39–42 px (Maus, bewusst wie Lauf 1). Screenshots angesehen (h800_funk, h390_frei, pc1280_pause): sauber.
- **Kulisse erstmals mit echter Welt-Abfrage im Spiel** (bindAmbience ist jetzt in main.ts): Bahnhof Luzern → Stadt 1, Bahnhof 1, Gong/Zug/Trolleybus ausgelöst; KKL-Quai → See 1, Schiffshorn ausgelöst; Gütsch → **Wald 0,83** (Waldmaske greift), Vogel ausgelöst; Ton aus → Bus 0. Tunnel nur erzwungen geprüft (Hall verbunden, Brummen 0,12) – keine echte Tunnelfahrt.
- Nicht geprüft: Hörprobe, echte Geräte, echte Tunnelfahrt, Echt-Modus.

### Einbau-Hinweise
Keine neuen. `main.ts`/`world.ts` unverändert. (Optional aus Lauf 1 weiterhin: `import './ui'` von travel.ts nach main.ts verschieben, Kriechen in loader.ts entfernen.)

### Offen / nächster Lauf
- Hörprobe auf Gerät (Kopfhörer): Kulisse evtl. +3–6 dB (`AMB_GAIN` 0,7 → 1,0), wenn sie neben dem Motor untergeht.
- Echte Tunnelfahrt (Sonnenberg/Spier) mit Hall prüfen.
- Glocke der Stundenschläge weiterhin Annahme c1.

## 15.11.2026 03:37 – Lauf 3

`claude/13i-gebiet-a` vorab hineingemergt (keine Konflikte). Alles nur in `src/style.css` (Block «P-B Lauf 3»), kein main.ts.

### Gemacht
1. **Tempo überdeckte Auftragstext** (800–1279 px ohne Touch, bestand schon vorher): Die Tempo-Anzeige sitzt jetzt über der Minimap. Der Auftragstext steht mittig im freien Streifen rechts der Minimap: bis 999 px über die ganze Restbreite, ab 1000 px bis zur Tastenhilfe. Bei Fensterhöhe ≤ 420 px steht das Tempo unten rechts. Mit Touch war es schon getrennt (Tempo oben, Auftrag oben Mitte).
2. **Schwierigkeitswahl `#diff-wahl`**:
   - Fokusrahmen mit `:focus` statt nur `:focus-visible`, weil main.ts per `.focus()` fokussiert und Chrome dann keinen Rahmen zeigt. Rahmen 4 px gelb plus Mint-Schein.
   - Die Knopfreihe darf umbrechen, hochkant ist sie zentriert.
   - Kein Inline-Stil stört; `flex-wrap:nowrap` aus main.ts wird per `!important` überstimmt.
3. **Funkhalt**: Am Funk-Panel hängt ein Schild «⏸ Das Spiel wartet auf dich», auf kleinen Bildschirmen «⏸ Spiel wartet». Der Annehmen-Knopf pulsiert ruhig (2,4 s, rosa Schein, kein Countdown). Bei `prefers-reduced-motion` pulsiert er nicht. Das Schild erscheint bei jedem `#radio.show`; ausserhalb der Tests hält ein Funkspruch die Welt ohnehin immer an.
4. **Lange Willkommens-Toasts**: `overflow-wrap: anywhere` als Sicherung.

### Geprüft (`tests/par/ui_pb3.py`, 2 Seitenaufrufe, Leicht, `?test&diffwahl&funkhalt`, leerer localStorage)
- **Schwierigkeitswahl**: Alle drei Knöpfe ganz im Bild bei 1280×720, 800×380 und 390×844, Höhe 73, 54 bzw. 67 px. Fokus nach Pfeiltaste sichtbar (Rahmen 4 px). Screenshot hochkant angesehen.
- **Ohne Touch**: Breiten 800–1280 in 40-px-Schritten, je Höhe 540 und 720 – keine Überlappung zwischen Tempo, Auftrag, Minimap, Tastenhilfe, Distanz und Sternen, nichts ausserhalb. Screenshot 960×540 angesehen.
- **Mit Touch**: 800–1280 in 80-px-Schritten – keine Überlappung.
- **Toasts**: «Willkommen in Küssnacht am Rigi!», «… Finsterwald b. Entlebuch!» und der lange Nord-Text bleiben bei 390×844 und 800×380 im Bild, ohne Überlauf (2–3 Zeilen hochkant). Die Toasts wurden für die Messung als DOM-Element eingesetzt.
- **Funkhalt** bei 800×380: Schild sichtbar, Screenshot angesehen. Das Pulsieren ist im Standbild nicht prüfbar.
- Keine Seitenfehler; tsc und Build ok.

### Einbau-Hinweise
Keine neuen.

## 14.11.2026 20:10 – Lauf 2

Vorab `claude/13i-gebiet-a` hineingemergt (Merge-Commit 7c1c805, keine Konflikte). Einbau 1 (bindAmbience) bewusst **nicht** selbst gemacht.

### Gemacht
1. **Quellen** (Websuche):
   - **Hofkirche St. Leodegar** – Geläut laut Wikipedia (https://de.wikipedia.org/wiki/St._Leodegar_im_Hof): 8 Glocken, Schlagtöne g0 (Theodulglocke 1633, 5150 kg), a0, h0, c1, cis1, dis1, f1 (Museggglocke 1381), g1. Die vollen Stunden schlug früher die Theodulglocke, neu «nur noch einige der kleineren Glocken» (Luzerner Zeitung: https://www.luzernerzeitung.ch/zentralschweiz/luzern/5-tonnen-glocke-in-der-hofkirche-luzern-laeutet-kuenftig-seltener-ld.1109797). Umgesetzt: Stundenschlag auf **c1 = 261,6 Hz**; welche kleinere Glocke genau schlägt, ist nicht belegt → **Annahme c1** (Vertrauen mittel). Die erfundenen Vorschläge aus Lauf 1 sind entfernt.
   - **SBB-Gong** (Deutschschweiz): drei «dun», tief–hoch–mittel, Es – B – Akkord B/Ges/Es; Westschweiz C–F–F, Tessin F–F–Es (https://www.galaxus.ch/en/page/how-the-sbb-jingle-represents-switzerland-36939 – Klavier-Analyse eines Journalisten, SBB hat es nicht bestätigt). Umgesetzt: Es4 311 Hz → B4 466 Hz → Akkord Es4/Ges4/B4; Oktavlage und Klangfarbe sind Annahme (Vertrauen mittel). Hinweis: kurzes Soundlogo der SBB, hier nachgespielt für ein privates Familienspiel.
   - **Sirene – zweite Quelle**: AMAG-Blog (https://www.amag-group.ch/blog/was-haben-blaulicht-und-sirene-mit-der-amag-zu-tun/): Wechselklanghorn ist das vorgeschriebene Signal für Polizei, Feuerwehr und Ambulanz, «allerdings auf verschiedenen Tonlagen», die beiden Töne bilden «eine Quarte». Das bestätigt das 3:4-Verhältnis aus VTS Anhang 11. Konkrete Ambulanz-Frequenzen habe ich nicht gefunden → 440/586,7 Hz bleibt **Annahme** (in der vorgeschriebenen Spanne 360–630 Hz, Vertrauen mittel).
2. **Leiser, weniger Stadtverkehr**: ein Regler `AMB_GAIN = 0.7` oben in `src/ambience/index.ts` (0 = Kulisse aus). Alle Schichten leiser (Stadt-Rauschen 0,10 → 0,045, Autos 0,05 → 0,022 usw.). Autos erst ab Stadt-Gewicht 0,3, im Zentrum rund 1 Auto alle 5–11 s statt 2–4 s. Gemessen in Kriens: 3 Autos in 20 s.
3. **Tablets und Fokus**:
   - Geprüft bei 1024×768, 768×1024 und 1180×820 (Touch): nichts überdeckt die Fahrbahn, alle Touch-Ziele ≥ 48 px.
   - Pause-Menü: `scroll-padding` sorgt dafür, dass der Tastatur-/Gamepad-Fokus nicht unter der klebenden Titelzeile verschwindet.
   - **Schnellreise am Handy/Tablet**: wird nicht mehr verkleinert (vorher scale .82). Listenknöpfe und «Zurück» sind ≥ 48 px, die Liste scrollt.
   - Schnellreise hochkant: Karte oben, Liste darunter. Quer: Karte links, Liste rechts, Höhe passend zum Bildschirm. Das «Esc» im Knopf ist am Handy ausgeblendet.
4. **Ladebild** (`src/ui/loadSteps.ts`):
   - Kindgerechte Schrittnamen, z. B. «Strassen werden geteert», «Bäume werden gepflanzt», «Das Navi lernt die Strassen». Am Ende steht «Fertig! Geladen in m:ss».
   - Die Schrittzahl berücksichtigt jetzt Stufe B: Im Echt-Modus kommen die 9 Bauschritte «Echte Häuser: …» bzw. in A-Gegenden «Feines Gelände: …» dazu, also 21 statt 12 Schritte. Ob Echt- oder Leicht-Modus gilt, wird mit derselben Regel wie `QUALITY_` in main.ts vorhergesagt. Liegt die Vorhersage falsch, wird die Gesamtzahl einmal angepasst.
   - Der Balken bleibt unter 100 %, bis der Start-Knopf sichtbar ist. Das behebt den Lauf-1-Fehler: Dort zählten alle Meldungen von Stufe B als ein einziger Schritt, der Balken stand dann lange bei 92 %.
5. **Toasts und `#lazy-ind` am Handy**:
   - Querformat: zwischen Minimap und Knopfleiste, `#lazy-ind` oben neben der Minimap.
   - Hochformat: `#lazy-ind` unter dem Auftragstext. Gemessen: keine Überlappung mit Knöpfen, Pedalen, Lenkrad, Minimap oder Fahrbahn.

### Geprüft
- `tests/par/ui_pb2.py`: ein Seitenaufruf, Leicht-Stufe, Touch-Emulation, Bildschirmgrössen 800×380, 390×844, 1024×768, 768×1024 und 1180×820.
  - Gemessen wurden freie Fahrt, eingesetzter Toast mit `#lazy-ind`, Funk und Schnellreise. Ergebnis: 0 Überdeckungen der Fahrbahn, 0 Touch-Ziele unter 48 px, 0 Überlappungen von Meldungen mit Bedienelementen.
  - Schnellreise: Liste scrollbar, Karte und «Zurück» ganz im Bild.
  - Pause-Fokus mit Pfeiltasten (14 × runter, 14 × hoch) bei 800×380 und 768×1024: 28 von 28 sichtbar.
  - Echtes Laden (Leicht): 12 Schritte, monoton, «Fertig! Geladen in 0:24».
  - Keine Seitenfehler. Screenshots angesehen: Schnellreise quer und hoch, Toasts quer und hoch, Funk auf dem Tablet, Pause-Fokus.
- `tests/par/ui_steps_sim.py`: Die Logik der Ladeschritte wurde mit nachgestellten Statusfolgen aus main.ts geprüft – Echt Luzern, Echt A-Gegend (a1), Leicht und Standard am Desktop. Alle monoton, vor dem Knopf höchstens 95,2 % bzw. 91,7 %, danach 100 %. **Der Echt-Modus wurde nicht im echten Spiel geladen** (zu schwer für die geteilte Maschine), nur nachgestellt.
- `tests/par/amb_check.py`: Kulissen-Zustände nach der Lautstärke-Änderung, Gong und Stundenschlag lösen ohne Fehler aus. Bus bei Spielmusik 0,19 statt 0,28. **Hörprobe weiterhin keine** (keine Tonausgabe).
- `npx tsc --noEmit -p .` fehlerfrei; Build OUT=dist_pb läuft durch.

### Einbau-Hinweise
Unverändert aus Lauf 1 (siehe unten): `bindAmbience(...)` in `main.ts` (Einbau 1), optional `import './ui'` verschieben, optional Kriechen in `loader.ts` entfernen. Neu nichts.

### Offen / nächster Lauf
- Echt-Modus einmal real laden (am besten in einem Volltest der Hauptsitzung mitlaufen lassen) und `window.__ldSteps()` beobachten.
- Hörprobe auf echtem Gerät; `AMB_GAIN` bei Bedarf senken.
- Nach Einbau 1: Wald-, Ufer- und Tunnelgewichte in der echten Welt prüfen.
- Glocke der Stundenschläge belegen (Pfarramt Hofkirche anfragen oder Aufnahme von SRF «Glocken der Heimat»; die Seite war per Abruf nicht erreichbar).

## 14.11.2026 19:38 – Lauf 1

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
