"""Region Ost (Meggen, Udligenswil): OSM aus Etappe 3 (data/e3/conv_ost) und Luzern (data/osm_*.json) an der Linie x = SPLIT zusammenfügen.
Östlich (x >= SPLIT) gilt Etappe 3, westlich Luzern. → data/e3/merged_ost/…"""
import json, os, math
from shapely.geometry import LineString, box
import os as _os
SPLIT = float(_os.environ.get('LR_SPLIT', '2600'))
WEST = _os.environ.get('LR_SIDE') == 'west'  # Region West: neue Daten westlich der Linie
AX = 1 if _os.environ.get('LR_SIDE') == 'south' else 0  # Region Süd: Trennlinie z = SPLIT, neue Daten südlich (z gross)
E_ = box(SPLIT, -1e6, 1e6, 1e6) if AX == 0 else box(-1e6, SPLIT, 1e6, 1e6)
W_ = box(-1e6, -1e6, SPLIT, 1e6) if AX == 0 else box(-1e6, -1e6, 1e6, SPLIT)
if WEST: E_, W_ = W_, E_
KX = math.cos(math.radians(47.0517)) * 111320
LON_SPLIT = 8.3077 + SPLIT / KX
LAT_SPLIT = 47.0517 - SPLIT / 110574
OUT = _os.environ.get('LR_OUT', 'data/e3/merged_ost'); NEW = _os.environ.get('LR_NEW', 'data/e3/conv_ost')
os.makedirs(OUT, exist_ok=True)
new, old = json.load(open(NEW + '/osm_big.json')), json.load(open('data/osm_big.json'))
def cx(p): return sum(q[AX] for q in p) / len(p)
def cut_line(pts, half):
    g = LineString(pts).intersection(half)
    parts = [g] if isinstance(g, LineString) else list(getattr(g, 'geoms', []))
    return [[[round(x, 1), round(z, 1)] for x, z in q.coords] for q in parts if isinstance(q, LineString) and len(q.coords) > 1]
def east(p): return (cx(p) < SPLIT) if WEST else (cx(p) >= SPLIT)  # «east» = Seite der neuen Daten
out = {}
for k in ('b', 'g'):
    out[k] = [e for e in new[k] if east(e[0])] + [e for e in old[k] if not east(e[0])]
out['r'] = [[q] + e[1:] for e in new['r'] for q in cut_line(e[0], E_)] + [[q] + e[1:] for e in old['r'] for q in cut_line(e[0], W_)]
out['rail'] = [[q] + e[1:] for e in new['rail'] for q in cut_line(e[0], E_)] + [[q] + e[1:] for e in old['rail'] for q in cut_line(e[0], W_)]
def wkey(w): return cx(w['multi'][0]) if isinstance(w, dict) and w['multi'] and w['multi'][0] else cx(w) if isinstance(w, list) and w else 0
side = (lambda v: v < SPLIT) if WEST else (lambda v: v >= SPLIT)
out['w'] = [w for w in new['w'] if side(wkey(w))] + [w for w in old['w'] if not side(wkey(w))]
out['h'], out['poi'] = old.get('h', []), []
def fx(w):
    while isinstance(w, (list, tuple)) and w and isinstance(w[0], (list, tuple)): w = w[0]
    return w[AX] if isinstance(w, (list, tuple)) and len(w) > AX and isinstance(w[AX], (int, float)) else 0
out['wr'] = [w for w in new.get('wr', []) if side(fx(w))] + [w for w in old.get('wr', []) if not side(fx(w))]
json.dump(out, open(OUT + '/osm_big.json', 'w'), separators=(',', ':'), ensure_ascii=False)
pn, po = json.load(open(NEW + '/osm_props.json')), json.load(open('data/osm_props.json'))
ea = (lambda lon: lon < LON_SPLIT) if WEST else (lambda lon: lon >= LON_SPLIT)
if AX == 1: ea = lambda lat: lat <= LAT_SPLIT
I = 1 - AX; SK = 'lat' if AX else 'lon'
props = {'lamp': [q for q in pn['lamp'] if ea(q[I])] + [q for q in po['lamp'] if not ea(q[I])],
         'tree': [q for q in pn['tree'] if ea(q[I])] + [q for q in po['tree'] if not ea(q[I])],
         'sig': [q for q in pn['sig'] if ea(q[SK])] + [q for q in po['sig'] if not ea(q[SK])],
         'row': [r for r in pn['row'] if ea(r[0][I])] + [r for r in po['row'] if not ea(r[0][I])],
         'pier': [r for r in pn['pier'] if ea(r['g'][0][I])] + [r for r in po['pier'] if not ea(r['g'][0][I])]}
json.dump(props, open(OUT + '/osm_props.json', 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(json.load(open(NEW + '/tunnels.json')) + json.load(open('data/tunnels.json')), open(OUT + '/tunnels.json', 'w'), separators=(',', ':'))
bn, bo = json.load(open(NEW + '/beach.json')), json.load(open('data/beach.json'))
json.dump({'beach': [b for b in bn['beach'] if side(cx(b))] + [b for b in bo['beach'] if not side(cx(b))], 'bench': [q for q in bn['bench'] if side(q[AX])] + [q for q in bo['bench'] if not side(q[AX])]},
          open(OUT + '/beach.json', 'w'), separators=(',', ':'))
# Busse: Overpass-Relationen (out geom) → {rels, ways, nodes} wie data/osm_bus.json
raw = json.load(open(_os.environ.get('LR_BUSRAW', 'data/e3/osm/buso.json')))['elements']
rels, ways, nodes = [], {}, {}
for r in raw:
    if r['type'] != 'relation': continue
    m = []
    for mm in r['members']:
        if mm['type'] == 'node' and 'lat' in mm: nodes[str(mm['ref'])] = [mm['lat'], mm['lon']]; m.append(['n', mm['ref'], mm.get('role', '')])
        elif mm['type'] == 'way' and mm.get('geometry'): ways[str(mm['ref'])] = [[g['lat'], g['lon']] for g in mm['geometry'] if g]; m.append(['w', mm['ref'], mm.get('role', '')])
    rels.append({'id': str(r['id']), 't': r.get('tags', {}), 'm': m})
uo = json.load(open('data/osm_bus.json')); ids = {r['id'] for r in rels}
bus = {'rels': rels + [r for r in uo['rels'] if r['id'] not in ids], 'ways': {**uo['ways'], **ways}, 'nodes': {**uo.get('nodes', {}), **nodes}}
json.dump(bus, open(OUT + '/osm_bus.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: len(v) for k, v in out.items()}, {k: len(v) for k, v in props.items()}, 'Buslinien', len(bus['rels']), 'neu', len(rels))
