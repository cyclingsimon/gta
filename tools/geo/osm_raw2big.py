"""Overpass-Rohdaten (out geom) → Formate von osm_big.json, osm_props.json, tunnels.json, beach.json.

Aufruf: python3 tools/geo/osm_raw2big.py OUTDIR raw1.json [raw2.json …]
Schreibt OUTDIR/osm_big.json, osm_props.json, tunnels.json, beach.json (lokale Meter wie lv.py).
"""
import json, math, sys, os
from shapely.geometry import LineString
from shapely.ops import linemerge, polygonize

LAT0, LON0 = 47.0517, 8.3077
KX, KZ = math.cos(math.radians(LAT0)) * 111320, 110574
def L(lat, lon): return [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]

out_dir, srcs = sys.argv[1], sys.argv[2:]
els, seen = [], set()
for s in srcs:
    for e in json.load(open(s))['elements']:
        k = (e['type'], e['id'])
        if k in seen: continue
        seen.add(k); els.append(e)

def way_pts(e): return [L(g['lat'], g['lon']) for g in e.get('geometry', []) if g]
def rel_outers(e):
    """Äussere Ringe einer Multipolygon-Relation als Punktlisten."""
    lines = [LineString([L(g['lat'], g['lon']) for g in m['geometry']]) for m in e.get('members', [])
             if m.get('type') == 'way' and m.get('role', 'outer') in ('outer', '') and len(m.get('geometry') or []) >= 2]
    if not lines: return []
    return [[[round(x, 1), round(z, 1)] for x, z in pg.exterior.coords] for pg in polygonize(linemerge(lines))]
def areas(e):
    if e['type'] == 'way':
        p = way_pts(e)
        return [p] if len(p) >= 4 and p[0] == p[-1] else []
    if e['type'] == 'relation': return rel_outers(e)
    return []
def num(v):
    try: return float(str(v).replace('m', '').replace(',', '.').strip())
    except Exception: return 0

B, R, W, G, RAIL, POI, WR = [], [], [], [], [], [], []
TUN, BEACH, BENCH = [], [], []
P = {'pier': [], 'lamp': [], 'tree': [], 'row': [], 'sig': []}
GK = {('landuse', 'grass'): 'grass', ('landuse', 'forest'): 'forest', ('natural', 'wood'): 'forest', ('leisure', 'pitch'): 'pitch',
      ('landuse', 'meadow'): 'meadow', ('leisure', 'playground'): 'playground', ('leisure', 'park'): 'park',
      ('landuse', 'village_green'): 'grass', ('leisure', 'garden'): 'grass', ('landuse', 'recreation_ground'): 'grass'}
RAILS = {'rail', 'light_rail', 'narrow_gauge', 'subway', 'funicular'}
for e in els:
    t = e.get('tags', {})
    if e['type'] == 'node':
        q = [e['lat'], e['lon']]
        if t.get('highway') == 'street_lamp': P['lamp'].append(q)
        elif t.get('natural') == 'tree': P['tree'].append(q + [t.get('leaf_type', ''), '', ''])
        elif t.get('highway') in ('traffic_signals', 'bus_stop') or t.get('amenity') == 'fountain':
            P['sig'].append({'lat': e['lat'], 'lon': e['lon'], 'tags': t})
        elif t.get('amenity') == 'bench': BENCH.append(L(*q))
        continue
    if t.get('building') and t.get('building') != 'no':
        h = num(t.get('height')) or (round(num(t.get('building:levels')) * 3 + 1) if t.get('building:levels') else 0)
        bt = t['building'] if t['building'] != 'yes' else ''
        for p in areas(e): B.append([p, int(h) if h == int(h) else h, t.get('roof:shape', ''), t.get('name', ''), bt])
        continue
    if e['type'] == 'way' and t.get('highway'):
        p = way_pts(e)
        if len(p) >= 2: R.append([p, t['highway'], t.get('name', ''), 1 if t.get('bridge') not in (None, 'no') else 0,
                                  1 if t.get('oneway') in ('yes', '1') else 0, t.get('lanes', '')])
        if t.get('man_made') == 'pier': P['pier'].append({'t': t, 'g': [[g['lat'], g['lon']] for g in e['geometry']]})
        continue
    if e['type'] == 'way' and t.get('man_made') == 'pier':
        P['pier'].append({'t': t, 'g': [[g['lat'], g['lon']] for g in e['geometry']]}); continue
    if e['type'] == 'way' and t.get('railway') in RAILS:
        p = way_pts(e)
        if len(p) >= 2:
            RAIL.append([p, 1 if t.get('bridge') not in (None, 'no') else 0])
            if t.get('tunnel') not in (None, 'no'): TUN.append({'n': t.get('name', ''), 'r': 'rail', 'p': p})
        continue
    if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('landuse') in ('reservoir', 'basin') or t.get('water'):
        if e['type'] == 'way':
            p = way_pts(e)
            if len(p) >= 4: W.append(p)
        else:
            W.append({'multi': [[L(g['lat'], g['lon']) for g in m['geometry']] for m in e.get('members', [])
                                if m.get('type') == 'way' and m.get('role') == 'outer' and m.get('geometry')]})
        continue
    if e['type'] == 'way' and t.get('waterway') in ('river', 'stream', 'canal'):
        WR.append([way_pts(e), t.get('name', '')]); continue
    if e['type'] == 'way' and t.get('natural') == 'tree_row':
        P['row'].append([[g['lat'], g['lon']] for g in e['geometry']]); continue
    if t.get('natural') == 'beach' or t.get('leisure') == 'beach_resort':
        BEACH += areas(e); continue
    for (k, v), kind in GK.items():
        if t.get(k) == v:
            for p in areas(e): G.append([p, kind])
            break
os.makedirs(out_dir, exist_ok=True)
json.dump({'b': B, 'r': R, 'w': W, 'g': G, 'rail': RAIL, 'h': [], 'poi': POI, 'wr': WR}, open(f'{out_dir}/osm_big.json', 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(P, open(f'{out_dir}/osm_props.json', 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(TUN, open(f'{out_dir}/tunnels.json', 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump({'beach': BEACH, 'bench': BENCH}, open(f'{out_dir}/beach.json', 'w'), separators=(',', ':'))
print({'b': len(B), 'r': len(R), 'w': len(W), 'g': len(G), 'rail': len(RAIL), 'tun': len(TUN), 'wr': len(WR), 'beach': len(BEACH), 'bench': len(BENCH),
       **{k: len(v) for k, v in P.items()}})
