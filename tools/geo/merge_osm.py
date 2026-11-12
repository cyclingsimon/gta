"""Region Nord: OSM aus Etappe 2 (data/e2/conv) und Luzern (data/osm_*.json) an der Linie z = SPLIT zusammenfügen.
Nördlich (z < SPLIT) gilt Etappe 2, südlich Luzern. Linien werden an der Linie geschnitten, Flächen nach Schwerpunkt zugeordnet.
→ data/e2/merged/osm_big.json, osm_props.json, tunnels.json, beach.json, osm_bus.json"""
import json, os, math
from shapely.geometry import LineString, Polygon, box
SPLIT = -950
N = box(-1e6, -1e6, 1e6, SPLIT); S = box(-1e6, SPLIT, 1e6, 1e6)
LAT_SPLIT = 47.0517 + SPLIT / -110574  # z → Breite (z = -(lat-LAT0)*KZ)
os.makedirs('data/e2/merged', exist_ok=True)
new, old = json.load(open('data/e2/conv/osm_big.json')), json.load(open('data/osm_big.json'))
def cent(p): return sum(q[1] for q in p) / len(p)
def cut_line(pts, half):
    g = LineString(pts).intersection(half)
    parts = [g] if isinstance(g, LineString) else list(getattr(g, 'geoms', []))
    return [[[round(x, 1), round(z, 1)] for x, z in q.coords] for q in parts if isinstance(q, LineString) and len(q.coords) > 1]
def area_in(p, north): return (cent(p) < SPLIT) == north
out = {}
for k in ('b', 'g'):
    out[k] = [e for e in new[k] if area_in(e[0], True)] + [e for e in old[k] if area_in(e[0], False)]
out['r'] = [[q] + e[1:] for e in new['r'] for q in cut_line(e[0], N)] + [[q] + e[1:] for e in old['r'] for q in cut_line(e[0], S)]
out['rail'] = [[q] + e[1:] for e in new['rail'] for q in cut_line(e[0], N)] + [[q] + e[1:] for e in old['rail'] for q in cut_line(e[0], S)]
# Wasser: Reuss/Rotsee aus Etappe 2, Seebecken/Reuss Stadt aus Luzern; build_city vereinigt alles
def wkey(w): return cent(w['multi'][0]) if isinstance(w, dict) and w['multi'] and w['multi'][0] else cent(w) if isinstance(w, list) and w else 0
out['w'] = [w for w in new['w'] if wkey(w) < SPLIT] + [w for w in old['w'] if wkey(w) >= SPLIT]
out['h'], out['poi'], out['wr'] = old.get('h', []), [], new.get('wr', [])
json.dump(out, open('data/e2/merged/osm_big.json', 'w'), separators=(',', ':'), ensure_ascii=False)
# Kleinobjekte (Breite/Länge): nördlich der Linie aus Etappe 2
pn, po = json.load(open('data/e2/conv/osm_props.json')), json.load(open('data/osm_props.json'))
north = lambda lat: lat > LAT_SPLIT
props = {'lamp': [q for q in pn['lamp'] if north(q[0])] + [q for q in po['lamp'] if not north(q[0])],
         'tree': [q for q in pn['tree'] if north(q[0])] + [q for q in po['tree'] if not north(q[0])],
         'sig': [q for q in pn['sig'] if north(q['lat'])] + [q for q in po['sig'] if not north(q['lat'])],
         'row': [r for r in pn['row'] if north(r[0][0])] + [r for r in po['row'] if not north(r[0][0])],
         'pier': [r for r in pn['pier'] if north(r['g'][0][0])] + [r for r in po['pier'] if not north(r['g'][0][0])]}
json.dump(props, open('data/e2/merged/osm_props.json', 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(json.load(open('data/e2/conv/tunnels.json')) + json.load(open('data/tunnels.json')), open('data/e2/merged/tunnels.json', 'w'), separators=(',', ':'))
bn, bo = json.load(open('data/e2/conv/beach.json')), json.load(open('data/beach.json'))
json.dump({'beach': bn['beach'] + [b for b in bo['beach'] if cent(b) >= SPLIT], 'bench': [q for q in bn['bench'] if q[1] < SPLIT] + [q for q in bo['bench'] if q[1] >= SPLIT]},
          open('data/e2/merged/beach.json', 'w'), separators=(',', ':'))
# Busse: Relationen beider Abfragen, Wege zusammengeführt
un, uo = json.load(open('data/e2/osm/osm_bus.json')), json.load(open('data/osm_bus.json'))
ids = {r['id'] for r in un['rels']}
bus = {'rels': un['rels'] + [r for r in uo['rels'] if r['id'] not in ids], 'ways': {**uo['ways'], **un['ways']}, 'nodes': {**uo.get('nodes', {}), **un.get('nodes', {})}}
json.dump(bus, open('data/e2/merged/osm_bus.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: len(v) for k, v in out.items()}, {k: len(v) for k, v in props.items()}, 'Buslinien', len(bus['rels']))
