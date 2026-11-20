#!/usr/bin/env python3
"""20a: Radiosender aus Simons Suno-MP3 bauen.
Aufruf: python3 -I tools/radio_build.py QUELLORDNER [ZIEL=public/audio/radio]
- ordnet jede MP3 über ihren Titel (ID3-Titel, sonst Dateiname) einem Sender zu (Tabelle unten = Doc «Luksi Rescue – Radiosender & Suno-Prompts»),
- wandelt Songs in MP3 128 kbit/s Stereo 44.1 kHz um (Lautheit angeglichen, -16 LUFS), Dateiname <sender>/<nn>.mp3,
- schneidet Jingles («Jingle …») auf die lautesten 8 Sekunden mit Ein-/Ausblenden,
- schreibt sender.json. Zwei Varianten desselben Titels werden beide aufgenommen. Unbekannte Titel werden gemeldet und ausgelassen.
Braucht ffmpeg/ffprobe. Ändert die Quelldateien nicht."""
import json, os, re, subprocess, sys, unicodedata

SENDER = [
    ('sirene144', 'Sirene 144', 'Heavy Metal', ['Tatü-Tata Vollgas', 'Blauliecht', 'Kapellbrogg-Galopp', 'Pilatus-Donner', 'D Chatz am Inseli', 'Luksi Forever', 'Unufhaltbar', 'Schneller als s Liecht', 'Näbel uf em Pilatus', 'Ritter vom Blauliecht', 'Rettigsgass!', 'Z vill']),
    ('riddim', 'Tatü-Tata Riddim', 'Reggae', ['Tatü-Tata Riddim', 'Ufschötti Vibes', 'Gmüetlich dur d Stadt', 'De Schwan am See', 'Verkehrshuus-Ska', 'Alles chonnt guet']),
    ('radio041', 'Radio 041', 'Hip-Hop', ['Null-Vier-Eis', 'Bahnhof-Flow', 'Sanitäter-Crew', 'Velo-Sani', 'Händ ufe!', 'D Grossmami im KKL']),
    ('ruedig', 'Rüüdig FM', 'Guggenmusik', ['Rüüdig Tatü-Tata', 'De Guugger-Finger', 'Urknall am Morge', 'Luksi-Polka', 'Luksi im Grend', 'Monstercorso']),
    ('nachtschicht', 'Nachtschicht FM', 'Synthwave', ['Nachtschicht', 'Kapellbrogg bi Nacht', 'Neonliecht Seebrogg', 'Heli-Flug', 'Bis morn, Lozärn', 'Liechter vo Lozärn']),
    ('haerzschlag', 'Radio Härzschlag', 'Techno', ['Härzschlag', 'Tatü-Tata Kick', 'Tunnel-Techno', 'Gipfel-Rave', 'Gump, Luksi, gump!', 'Blaui Stond', 'Über em See', 'Pilatus-Psy', 'Blauliecht-Dance']),
]

def norm(s, zahl_weg=True):
    s = unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode()
    s = re.sub(r'\(.*?\)|\[.*?\]', ' ', s)           # «(1)», «[v2]»
    s = re.sub(r'[^a-z0-9]+', ' ', s).strip()
    return re.sub(r'\s+(v|version|remaster(ed)?|edit|take)?\s*\d+$', '', s).strip() if zahl_weg else s

def zuordnen(titel):
    """→ (sender_id, songtitel | None für Jingle) oder None"""
    n = norm(titel)
    if n.startswith('jingle'):
        rest = norm(titel, False)[6:].strip(); kand = []
        for sid, name, _, _ in SENDER:
            nn = norm(name, False)
            if rest == nn or rest.startswith(nn + ' '): return sid, None
            if rest and (rest in nn or nn in rest): kand.append((len(nn), sid))
        return (max(kand)[1], None) if kand else None
    best = None
    for sid, name, _, songs in SENDER:
        for t in songs:
            if norm(t) == n: return sid, t
            if n.startswith(norm(t) + ' ') and (best is None or len(norm(t)) > len(norm(best[1]))): best = (sid, t)
    return best

def id3_titel(pfad):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format_tags=title', '-of', 'default=nw=1:nk=1', pfad], capture_output=True, text=True, timeout=60).stdout.strip()
        return out.splitlines()[0] if out else ''
    except Exception: return ''

def lautester_start(pfad, dauer=8.0):
    """Start der lautesten `dauer` Sekunden (RMS in 0.5-s-Schritten)."""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', pfad, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True, timeout=300).stdout
    import array; a = array.array('h'); a.frombytes(r[:len(r) // 2 * 2]); step = 4000; e = [sum(v * v for v in a[i:i + step]) for i in range(0, len(a), step)]
    w = int(dauer * 2)
    if len(e) <= w: return 0.0
    s = sum(e[:w]); best, bi = s, 0
    for i in range(1, len(e) - w + 1):
        s += e[i + w - 1] - e[i - 1]
        if s > best: best, bi = s, i
    return bi * 0.5

def main():
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'public/audio/radio'
    dateien = sorted(f for f in os.listdir(src) if f.lower().endswith(('.mp3', '.wav', '.m4a', '.flac', '.ogg')))
    plan = {sid: {'jingle': None, 'songs': []} for sid, *_ in SENDER}; unbekannt = []
    for f in dateien:
        p = os.path.join(src, f); z = zuordnen(id3_titel(p)) or zuordnen(os.path.splitext(f)[0])
        if not z: unbekannt.append(f); continue
        if z[1] is None: plan[z[0]]['jingle'] = plan[z[0]]['jingle'] or p
        else: plan[z[0]]['songs'].append((z[1], p))
    out = []
    for sid, name, stil, songs in SENDER:
        d = os.path.join(dst, sid); eintrag = {'id': sid, 'name': name, 'stil': stil, 'songs': []}
        if plan[sid]['songs'] or plan[sid]['jingle']: os.makedirs(d, exist_ok=True)
        if plan[sid]['jingle']:
            st = lautester_start(plan[sid]['jingle'])
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{st}', '-t', '8', '-i', plan[sid]['jingle'], '-af', 'afade=t=in:d=0.15,afade=t=out:st=7.2:d=0.8,loudnorm=I=-16:TP=-1.5', '-ac', '2', '-ar', '44100', '-b:a', '128k', '-map_metadata', '-1', os.path.join(d, 'jingle.mp3')], check=True)
            eintrag['jingle'] = f'{sid}/jingle.mp3'
        ordnung = {t: i for i, t in enumerate(songs)}
        for n, (t, p) in enumerate(sorted(plan[sid]['songs'], key=lambda x: (ordnung[x[0]], x[1])), 1):
            ziel = f'{sid}/{n:02d}.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '2', '-ar', '44100', '-b:a', '128k', '-map_metadata', '-1', os.path.join(dst, ziel)], check=True)
            eintrag['songs'].append({'f': ziel, 't': t})
        out.append(eintrag); print(f'{name}: {len(eintrag["songs"])} Songs' + (', Jingle' if 'jingle' in eintrag else ''))
    os.makedirs(dst, exist_ok=True); json.dump({'sender': out}, open(os.path.join(dst, 'sender.json'), 'w'), ensure_ascii=False, indent=1)
    if unbekannt: print('NICHT zugeordnet:', unbekannt)

if __name__ == '__main__': main()
