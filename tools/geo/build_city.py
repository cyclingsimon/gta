"""Luksi Rescue – Geodaten-Pipeline (Phase 1, OSM-Basis).

Eingabe:  data/osm_altstadt.json (verdichteter Overpass-Export, lokale Meter,
          Ursprung Kapellbrücke 47.0517 N / 8.3077 E, x = Ost, z = Süd)
Ausgabe:  public/data/city.json (kompakte Spieldaten)

Aufruf:   python3 tools/geo/build_city.py <osm_json> <out_json>
"""
import json, sys, hashlib, os
from shapely.geometry import Polygon, LineString, box, MultiPolygon
from shapely.ops import linemerge, polygonize, unary_union

src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))

# Spielfeld (lokale Meter). Etwas kleiner als der Download-Ausschnitt.
X0, X1, Z0, Z1 = [float(v) for v in (sys.argv[3] if len(sys.argv) > 3 else '-3800,2700,-1100,6300').split(',')]
CLIP = box(X0, Z0, X1, Z1)

def r(v):
    return round(v, 1)

def ring(coords):
    return [[r(x), r(z)] for x, z in coords]

def polys(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    if isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return [g for g in getattr(geom, 'geoms', []) if isinstance(g, Polygon)]

# ---------- Gebäude ----------
DEFAULT_H = {
    'house': 10, 'detached': 9, 'residential': 15, 'apartments': 16, 'church': 22,
    'cathedral': 26, 'commercial': 15, 'retail': 12, 'office': 18, 'hotel': 20,
    'garage': 4, 'garages': 3.5, 'shed': 3, 'roof': 5, 'hospital': 22,
    'school': 13, 'train_station': 14, 'industrial': 10, 'public': 15,
}
buildings = []
for pts, h, roof, name, btype in d['b']:
    if len(pts) < 4:
        continue
    try:
        p = Polygon(pts).buffer(0)
    except Exception:
        continue
    if p.area < 4:
        continue
    for q in polys(p.intersection(CLIP)):
        if q.area < 4:
            continue
        hh = h
        if not hh:
            base = DEFAULT_H.get(btype, 12)
            # deterministische Variation, damit Blöcke nicht gleich hoch sind
            j = int(hashlib.md5(f"{q.centroid.x:.0f},{q.centroid.y:.0f}".encode()).hexdigest()[:4], 16) / 65535
            hh = base * (0.85 + 0.35 * j)
        q = q.simplify(0.3)
        ext = ring(list(q.exterior.coords)[:-1])
        if len(ext) < 3:
            continue
        holes = [ring(list(i.coords)[:-1]) for i in q.interiors if Polygon(i).area > 8]
        buildings.append({'p': ext, 'h': r(min(hh, 80)), 'n': name, 't': btype, 'roof': roof, **({'holes': holes} if holes else {})})

# ---------- Strassen ----------
ROAD_W = {
    'motorway': 12, 'trunk': 11, 'primary': 10, 'secondary': 9, 'tertiary': 8,
    'unclassified': 6, 'residential': 6, 'living_street': 5.5, 'service': 4.5,
    'pedestrian': 6, 'footway': 3, 'path': 2.5, 'cycleway': 3, 'steps': 2.5,
    'track': 3.5, 'primary_link': 7, 'secondary_link': 7, 'tertiary_link': 6,
}
roads = []
for pts, cls, name, bridge, oneway, lanes in d['r']:
    if cls not in ROAD_W:
        continue
    ls = LineString(pts).intersection(CLIP)
    parts = [ls] if isinstance(ls, LineString) else list(getattr(ls, 'geoms', []))
    for part in parts:
        if not isinstance(part, LineString) or part.length < 1:
            continue
        roads.append({'p': ring(part.coords), 'c': cls, 'w': ROAD_W[cls], 'n': name, 'b': bridge, **({'o': 1} if oneway else {})})

# ---------- Wasser ----------
water_geoms = []
for w in d['w']:
    if isinstance(w, dict):
        lines = [LineString(m) for m in w['multi'] if len(m) >= 2]
        merged = linemerge(lines)
        for pg in polygonize(merged):
            water_geoms.append(pg)
    elif len(w) >= 4:
        try:
            water_geoms.append(Polygon(w).buffer(0))
        except Exception:
            pass
water = unary_union(water_geoms).intersection(CLIP)
water_out = []
# Seefläche (Seespiegel) vom Fluss unterhalb des Nadelwehrs (x < -345) trennen: der See wird flach gezeichnet,
# nur der Fluss wird aufs Gelände gelegt (spart ~300k Dreiecke)
WEHR_X = -345
parts = []
for q in polys(water):
    if q.area > 100000 and os.environ.get('LR', '') in ('', 'ost', 'sued'):  # Region Nord: Rotsee/Reuss liegen nicht auf Seespiegel; Ost: Vierwaldstättersee flach
        parts += [(g, 1) for g in polys(q.intersection(box(WEHR_X, Z0, X1, Z1)))] + [(g, 0) for g in polys(q.intersection(box(X0, Z0, WEHR_X, Z1)))]
    else:
        parts.append((q, 0))
for q, flat in parts:
    q = q.simplify(0.8)
    if q.area < 20:
        continue
    water_out.append({'p': ring(list(q.exterior.coords)[:-1]),
                      'holes': [ring(list(i.coords)[:-1]) for i in q.interiors if Polygon(i).area > 10], **({'f': 1} if flat else {})})

# ---------- Grünflächen ----------
green = []
for pts, kind in d['g']:
    if len(pts) < 4:
        continue
    try:
        q = Polygon(pts).buffer(0).intersection(CLIP)
    except Exception:
        continue
    for g in polys(q):
        if g.area > 30:
            green.append({'p': ring(list(g.simplify(0.5).exterior.coords)[:-1]), 'k': kind})

# ---------- Bahn ----------
rail = []
rail_all = []  # inkl. Tunnel – für die Zugstrecken
import os
TUN = None
TUNF = os.environ.get('LR_TUN', 'data/tunnels.json')
if os.path.exists(TUNF):
    TUN = unary_union([LineString(t['p']).buffer(2.5) for t in json.load(open(TUNF)) if len(t['p']) > 1])
for pts, bridge in d['rail']:
    la = LineString(pts).intersection(CLIP)
    for part in ([la] if isinstance(la, LineString) else list(getattr(la, 'geoms', []))):
        if isinstance(part, LineString) and part.length > 2:
            rail_all.append(ring(part.coords))
    if TUN is not None:
        vis = LineString(pts).difference(TUN)
        pts_list = [list(g.coords) for g in ([vis] if isinstance(vis, LineString) else list(getattr(vis, 'geoms', []))) if isinstance(g, LineString) and len(g.coords) > 1]
    else:
        pts_list = [pts]
    for pts in pts_list:
      ls = LineString(pts).intersection(CLIP)
      for part in ([ls] if isinstance(ls, LineString) else list(getattr(ls, 'geoms', []))):
        if isinstance(part, LineString) and part.length > 2:
            rail.append(ring(part.coords))
    continue
for pts, bridge in []:
    ls = LineString(pts).intersection(CLIP)
    for part in ([ls] if isinstance(ls, LineString) else list(getattr(ls, 'geoms', []))):
        if isinstance(part, LineString) and part.length > 2:
            rail.append(ring(part.coords))

# ---------- Orte ----------
pois = {}
for name, x, z in d['poi']:
    if X0 < x < X1 and Z0 < z < Z1:
        pois.setdefault(name, [r(x), r(z)])

out = {
    'meta': {'origin': [47.0517, 8.3077], 'bounds': [X0, Z0, X1, Z1],
             'credits': 'Kartendaten © OpenStreetMap-Mitwirkende (ODbL)'},
    'buildings': buildings, 'roads': roads, 'water': water_out,
    'green': green, 'rail': rail, 'railAll': rail_all, 'pois': pois,
}
json.dump(out, open(dst, 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: len(v) for k, v in out.items() if isinstance(v, (list, dict))})
named = sorted({b['n'] for b in buildings if b['n']})
print(len(named), 'benannte Gebäude, z.B.', [n for n in named if any(k in n for k in ['Kinder', 'Wasserturm', 'Jesuiten', 'KKL', 'Kultur', 'Spital', 'Bahnhof', 'Hof', 'Turm'])][:40])
print([rd['n'] for rd in roads if rd['b']][:60])
