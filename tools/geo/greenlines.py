"""14q: Hecken, Baumreihen und Obstgärten (OSM) für A-Regionen → public/data/<id>/props.json
- hedges: [[x, z], …] je Hecke (barrier=hedge) – im Spiel als 1.6 m hohe grüne Wand
- trees += Baumreihen (natural=tree_row, alle 9 m) und Hochstamm-Obstgärten (landuse=orchard, Raster 11 m, leicht versetzt),
  markiert mit 4. Wert 2 (Obstbaum) bzw. 3 (Baumreihe), damit ein erneuter Lauf sie zuerst entfernt.
Aufruf: greenlines.py a1 [a2 …]"""
import json, glob, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from regions_a import REGIONS_A
from shapely.geometry import Polygon, Point, LineString
from lv import KX, KZ, LAT0, LON0
xy = lambda la, lo: ((lo - LON0) * KX, (LAT0 - la) * KZ)
for rid in sys.argv[1:]:
    X0, Z0, X1, Z1 = REGIONS_A[rid][1]
    inside = lambda p: X0 <= p[0] <= X1 and Z0 <= p[1] <= Z1
    hedges, rows, orch = [], [], []; seen = set()
    for f in sorted(glob.glob(f'data/a/raw/osm_{rid}_*.json')):
        for e in json.load(open(f))['elements']:
            if e['type'] != 'way' or e['id'] in seen or not e.get('geometry'): continue
            t = e.get('tags', {}); g = [xy(q['lat'], q['lon']) for q in e['geometry'] if q]
            if len(g) < 2: continue
            if t.get('barrier') == 'hedge': seen.add(e['id']); hedges.append(g)
            elif t.get('natural') == 'tree_row': seen.add(e['id']); rows.append(g)
            elif t.get('landuse') == 'orchard' and len(g) >= 4: seen.add(e['id']); orch.append(g)
    out = []
    for g in hedges:
        g = [[round(x, 1), round(z, 1)] for x, z in g if inside((x, z))]
        if len(g) >= 2: out.append(g)
    add = []
    for g in rows:
        L = LineString(g)
        for k in range(int(L.length // 9) + 1):
            p = L.interpolate(k * 9); q = (p.x, p.y)
            if inside(q): add.append([round(q[0], 1), round(q[1], 1), 0, 3])
    for g in orch:
        P = Polygon(g)
        if not P.is_valid: P = P.buffer(0)
        if P.area > 400000: continue  # Fehldaten
        a, b, c, d = P.bounds; s = 11
        for i in range(int((c - a) // s) + 1):
            for j in range(int((d - b) // s) + 1):
                x, z = a + i * s + (j % 2) * s / 2, b + j * s
                if P.contains(Point(x, z).buffer(2.5)) and inside((x, z)): add.append([round(x, 1), round(z, 1), 0, 2])
    add = add[:4000]
    pf = f'public/data/{rid}/props.json'; pr = json.load(open(pf))
    pr['trees'] = [t for t in pr['trees'] if not (len(t) > 3 and t[3] in (2, 3))] + add
    pr['hedges'] = out
    json.dump(pr, open(pf, 'w'), separators=(',', ':'))
    print(rid, 'Hecken', len(out), round(sum(LineString(g).length for g in out) / 1000, 1), 'km · Baumreihen', len(rows), '· Obstgärten', len(orch), '· neue Bäume', len(add))
