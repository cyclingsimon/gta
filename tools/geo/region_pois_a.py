"""Gebiet A: Ortsnamen (OSM place=town/village/hamlet) als «pois» in public/data/aN/city.json ergänzen. Aufruf: region_pois_a.py aN"""
import json, math, sys
rid = sys.argv[1]
KX, KZ = math.cos(math.radians(47.0517)) * 111320, 110574
c = json.load(open(f'public/data/{rid}/city.json')); X0, Z0, X1, Z1 = c['meta']['bounds']
P = c.get('pois', {}) or {}
for q in range(4):
    for e in json.load(open(f'data/a/raw/osm_{rid}_{q}.json'))['elements']:
        t = e.get('tags', {})
        if e['type'] == 'node' and t.get('place') in ('town', 'village', 'hamlet', 'suburb') and t.get('name'):
            x, z = round((e['lon'] - 8.3077) * KX), round(-(e['lat'] - 47.0517) * KZ)
            if X0 < x < X1 and Z0 < z < Z1: P.setdefault(t['name'], [x, z])
c['pois'] = P
json.dump(c, open(f'public/data/{rid}/city.json', 'w'), separators=(',', ':'), ensure_ascii=False); print('POIs', len(P))
