"""14zg: Strassentunnels (OSM highway + tunnel=yes|building_passage|avalanche_protector) in city.json markieren: r['tu'] = 1.
Quelle: data/old/road_tunnels.json (Overpass, ganzes Spielgebiet). Ein Strassenstück gilt als Tunnel, wenn ≥ 70 % seiner Punkte
(alle 3 m) ≤ 4 m neben einer OSM-Tunnelachse derselben Fahrbahnart liegen. Fusswege und Zufahrten (service) bleiben unverändert.
Aufruf: road_tunnels.py <city.json> [...]"""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lv import KX, KZ, LAT0, LON0
xy = lambda la, lo: ((lo - LON0) * KX, (LAT0 - la) * KZ)
CAR = {'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street'}
T = [t for t in json.load(open('data/old/road_tunnels.json')) if t['h'] in CAR]
G = {}
for k, t in enumerate(T):
    p = [xy(*q) for q in t['g']]
    for i in range(1, len(p)):
        A, B = p[i - 1], p[i]; L = math.dist(A, B)
        for s in range(int(L // 2) + 1):
            f = s * 2 / max(L, 1e-6); x, z = A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f
            G.setdefault((int(x // 20), int(z // 20)), []).append((x, z))
def near(x, z, r=4.0):
    gx, gz = int(x // 20), int(z // 20)
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            for q in G.get((gx + a, gz + b), ()):
                if (q[0] - x) ** 2 + (q[1] - z) ** 2 < r * r: return True
    return False
for f in sys.argv[1:]:
    d = json.load(open(f)); n = 0; L = 0.0
    for r in d['roads']:
        r.pop('tu', None)
        if r['c'] not in CAR or r.get('b'): continue
        pts = []
        for i in range(1, len(r['p'])):
            A, B = r['p'][i - 1], r['p'][i]; l = math.dist(A, B)
            for s in range(int(l // 3) + 1):
                t = s * 3 / max(l, 1e-6); pts.append((A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t))
        if len(pts) < 3: continue
        if sum(near(*q) for q in pts) / len(pts) >= 0.7:
            r['tu'] = 1; n += 1; L += sum(math.dist(r['p'][i - 1], r['p'][i]) for i in range(1, len(r['p'])))
    json.dump(d, open(f, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(f, 'Tunnelstücke', n, round(L), 'm')
