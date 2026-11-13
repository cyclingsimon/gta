"""Fussgängerstreifen (OSM highway=crossing, markiert, Abfrage 13.11.2026) → «crossings» in public/data[/REGION]/props.json (Spiel-Meter, nur im Spielfeld)."""
import json, math, os
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
pts = [[round((lo - 8.3077) * KX, 1), round(-(la - 47.0517) * KZ, 1)] for la, lo in json.load(open('data/e3/crossings.json'))]
for d in ('public/data', 'public/data/nord', 'public/data/ost'):
    pj = json.load(open(d + '/props.json')); X0, Z0, X1, Z1 = json.load(open(d + '/terrain.json')).get('bounds', [-1e9, -1e9, 1e9, 1e9]) if False else (-1e9, -1e9, 1e9, 1e9)
    c = json.load(open(d + '/city.json')) if os.path.exists(d + '/city.json') else None
    if c: X0, Z0, X1, Z1 = c['meta']['bounds']
    pj['crossings'] = [p for p in pts if X0 < p[0] < X1 and Z0 < p[1] < Z1]
    json.dump(pj, open(d + '/props.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    print(d, len(pj['crossings']))
