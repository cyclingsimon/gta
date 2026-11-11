"""OSM-Kleinobjekte (Stege, Laternen, Bäume, Ampeln …) → public/data/props.json, lokale Meter."""
import json, math, sys
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'data/osm_props.json'))
LAT0, LON0 = 47.0517, 8.3077
KX, KZ = math.cos(math.radians(LAT0)) * 111320, 110574
X0, X1, Z0, Z1 = -3800, 2700, -1100, 6300
def L(lat, lon): return [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]
def ok(p): return X0 < p[0] < X1 and Z0 < p[1] < Z1
out = {'piers': [], 'lamps': [], 'trees': [], 'signals': [], 'stops': [], 'fountains': []}
for e in d['pier']:
    p = [L(*q) for q in e['g']]
    if not any(ok(q) for q in p): continue
    t = e['t']; closed = len(p) > 3 and p[0] == p[-1]
    out['piers'].append({'p': p, 'w': float(t.get('width', 2.5 if t.get('floating') else 3)) if str(t.get('width', '')).replace('.', '').isdigit() or 'width' not in t else 3,
                         'f': 1 if t.get('floating') == 'yes' or t.get('type') == 'floating' else 0, 'a': 1 if closed else 0,
                         's': 'wood' if t.get('surface') in (None, 'wood') else 'stone'})
out['lamps'] = [q for q in (L(*e) for e in d['lamp']) if ok(q)]
for e in d['tree']:
    q = L(e[0], e[1])
    if ok(q): out['trees'].append(q + [1 if e[2] == 'needleleaved' else 0])
for row in d['row']:
    p = [L(*q) for q in row]
    for a, b in zip(p, p[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 9))
        for i in range(n):
            q = [round(a[0] + (b[0] - a[0]) * i / n, 1), round(a[1] + (b[1] - a[1]) * i / n, 1)]
            if ok(q): out['trees'].append(q + [0])
for e in d.get('sig', []):
    q = L(e['lat'], e['lon'])
    if not ok(q): continue
    t = e.get('tags', {})
    if t.get('highway') == 'traffic_signals': out['signals'].append(q)
    elif t.get('highway') == 'bus_stop': out['stops'].append(q + [t.get('name', '')])
    elif t.get('amenity') == 'fountain': out['fountains'].append(q)
# Strände/Badeplätze und Sitzbänke (data/beach.json, lokale Meter, aus OpenStreetMap)
import os
if os.path.exists('data/beach.json'):
    bj = json.load(open('data/beach.json'))
    out['beaches'] = [[[round(x, 1), round(z, 1)] for x, z in p] for p in bj['beach'] if any(ok(q) for q in p)]
    out['benches'] = [[round(x, 1), round(z, 1)] for x, z in bj['bench'] if ok((x, z))]
json.dump(out, open('public/data/props.json', 'w'), separators=(',', ':'))
print({k: len(v) for k, v in out.items()})
