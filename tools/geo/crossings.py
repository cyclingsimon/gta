"""Fussgängerstreifen (OSM highway=crossing, markiert, Abfrage 13.11.2026) → «crossings» in public/data[/REGION]/props.json (Spiel-Meter, nur im Spielfeld)."""
import json, math, os
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
import glob as _g
RAW = [f for p in os.environ.get('LR_OSMRAW', '').split(',') if p for f in sorted(_g.glob(p))]  # Gebiet A: eigene Rohdaten
pts = [] if RAW else [[round((lo - 8.3077) * KX, 1), round(-(la - 47.0517) * KZ, 1)] for la, lo in json.load(open('data/e3/crossings.json'))]
for f in RAW:
    for e in json.load(open(f))['elements']:
        t = e.get('tags', {})
        if e['type'] == 'node' and t.get('highway') == 'crossing' and (t.get('crossing') in ('marked', 'zebra', 'uncontrolled', 'traffic_signals') or t.get('crossing_ref') == 'zebra'):
            pts.append([round((e['lon'] - 8.3077) * KX, 1), round(-(e['lat'] - 47.0517) * KZ, 1)])
if not RAW and os.path.exists('data/e4/osm/sued.json'):  # Etappe 4 (Süd): markierte Übergänge aus der Gesamtabfrage
    for e in json.load(open('data/e4/osm/sued.json'))['elements']:
        t = e.get('tags', {})
        if e['type'] == 'node' and t.get('highway') == 'crossing' and (t.get('crossing') in ('marked', 'zebra', 'uncontrolled', 'traffic_signals') or t.get('crossing_ref') == 'zebra') and e['lat'] < 46.9955:
            pts.append([round((e['lon'] - 8.3077) * KX, 1), round(-(e['lat'] - 47.0517) * KZ, 1)])
for d in (['public/data/' + os.environ['LR']] if RAW else ('public/data', 'public/data/nord', 'public/data/ost', 'public/data/west', 'public/data/sued')):
    if not os.path.exists(d + '/city.json'): continue
    pj = json.load(open(d + '/props.json')); X0, Z0, X1, Z1 = json.load(open(d + '/terrain.json')).get('bounds', [-1e9, -1e9, 1e9, 1e9]) if False else (-1e9, -1e9, 1e9, 1e9)
    c = json.load(open(d + '/city.json')) if os.path.exists(d + '/city.json') else None
    if c: X0, Z0, X1, Z1 = c['meta']['bounds']
    pj['crossings'] = [p for p in pts if X0 < p[0] < X1 and Z0 < p[1] < Z1]
    json.dump(pj, open(d + '/props.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    print(d, len(pj['crossings']))
